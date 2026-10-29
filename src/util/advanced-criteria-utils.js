// eslint-disable-next-line import/prefer-default-export
export function isBase64Encoded(str) {
  // Base64 encoded strings can only contain characters from [A-Za-z0-9+/=]
  const base64RegExp = /^[A-Za-z0-9+/=]+$/;
  return base64RegExp.test(str);
}

export function safeParseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

export function normalizeAdvancedCriteria(value) {
  let criteria = value;
  if (typeof criteria === 'string') {
    try {
      criteria = JSON.parse(criteria);
    } catch (error) {
      return {};
    }
  }
  if (Array.isArray(criteria)) return { POTENTIAL: criteria };
  return criteria && typeof criteria === 'object' ? criteria : {};
}

export function resolveEnrollmentRanking(enrolmentRanking, jsonExt, status) {
  const rankings = enrolmentRanking == null
    ? safeParseJsonObject(jsonExt).enrolment_ranking
    : safeParseJsonObject(enrolmentRanking);
  if (!rankings || typeof rankings !== 'object' || Array.isArray(rankings)) return null;
  return rankings[status] || rankings['*'] || null;
}

export function updateEnrollmentRanking(jsonExt, enrolmentRanking, status, ranking) {
  const json = safeParseJsonObject(jsonExt);
  const rankings = json.enrolment_ranking == null
    ? safeParseJsonObject(enrolmentRanking)
    : safeParseJsonObject(json.enrolment_ranking);
  const updatedRankings = { ...rankings };

  if (ranking == null) {
    delete updatedRankings[status];
  } else {
    updatedRankings[status] = ranking;
  }

  return JSON.stringify({
    ...json,
    // Keep an empty object so the mutation can explicitly clear the last rule.
    enrolment_ranking: updatedRankings,
  });
}

const RANKING_KEYS = new Set([
  'order_by', 'tie_breaker', 'limit', 'score_source', 'weighted_score', 'selection_strategy',
]);
const ORDER_BY_KEYS = new Set(['field', 'direction', 'cast', 'nulls']);
const LIMIT_KEYS = new Set(['percentage', 'respect_max_beneficiaries']);
const SELECTION_STRATEGY_KEYS = new Set([
  'source', 'female_percentage', 'youth_percentage', 'female_value', 'youth_min_age', 'youth_max_age',
]);

function unsupportedKeys(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

export function validateEnrollmentRanking(ranking) {
  if (!ranking || typeof ranking !== 'object' || Array.isArray(ranking)) {
    return 'Ranking configuration must be a JSON object.';
  }
  const unexpected = unsupportedKeys(ranking, RANKING_KEYS);
  if (unexpected.length) return `Unsupported ranking keys: ${unexpected.join(', ')}.`;

  if (ranking.order_by !== undefined) {
    if (!Array.isArray(ranking.order_by)) return 'Ranking order_by must be a list.';
    for (let index = 0; index < ranking.order_by.length; index += 1) {
      const item = ranking.order_by[index];
      if (typeof item === 'string') {
        // String entries use the backend's compact field syntax.
      } else if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return `Ranking order_by[${index}] must be a string or object.`;
      } else {
        const invalidOrderKeys = unsupportedKeys(item, ORDER_BY_KEYS);
        if (invalidOrderKeys.length) {
          return `Unsupported order_by[${index}] keys: ${invalidOrderKeys.join(', ')}.`;
        }
        if (typeof item.field !== 'string' || !item.field) {
          return `Ranking order_by[${index}].field must be a non-empty string.`;
        }
        if (item.direction && !['asc', 'desc'].includes(item.direction)) {
          return `Ranking order_by[${index}].direction must be asc or desc.`;
        }
        if (item.nulls && !['first', 'last'].includes(item.nulls)) {
          return `Ranking order_by[${index}].nulls must be first or last.`;
        }
      }
    }
  }

  if (ranking.limit !== undefined) {
    if (!ranking.limit || typeof ranking.limit !== 'object' || Array.isArray(ranking.limit)) {
      return 'Ranking limit must be an object.';
    }
    const invalidLimitKeys = unsupportedKeys(ranking.limit, LIMIT_KEYS);
    if (invalidLimitKeys.length) return `Unsupported ranking limit keys: ${invalidLimitKeys.join(', ')}.`;
    const { percentage, respect_max_beneficiaries: respectMax } = ranking.limit;
    if (percentage !== undefined && (
      typeof percentage !== 'number' || percentage < 1 || percentage > 100
    )) return 'Ranking limit percentage must be between 1 and 100.';
    if (respectMax !== undefined && typeof respectMax !== 'boolean') {
      return 'Ranking limit respect_max_beneficiaries must be true or false.';
    }
  }

  if (ranking.selection_strategy !== undefined) {
    const strategy = ranking.selection_strategy;
    if (!strategy || typeof strategy !== 'object' || Array.isArray(strategy)) {
      return 'Ranking selection_strategy must be an object.';
    }
    const invalidStrategyKeys = unsupportedKeys(strategy, SELECTION_STRATEGY_KEYS);
    if (invalidStrategyKeys.length) {
      return `Unsupported ranking selection_strategy keys: ${invalidStrategyKeys.join(', ')}.`;
    }
  }
  return null;
}

export function parseEnrollmentRankingText(value) {
  if (!value.trim()) return { ranking: null, error: null };
  try {
    const ranking = JSON.parse(value);
    return { ranking, error: validateEnrollmentRanking(ranking) };
  } catch (error) {
    return { ranking: null, error: error.message };
  }
}

export function rankingEditorContextKey(benefitPlan, status) {
  return [
    benefitPlan?.id || benefitPlan?.uuid || '',
    benefitPlan?.version ?? '',
    benefitPlan?.dateUpdated || '',
    status || '',
  ].join(':');
}

export function rankingTextForStatus(editedBenefitPlan, benefitPlan, status) {
  const editedJson = safeParseJsonObject(editedBenefitPlan?.jsonExt);
  const ranking = Object.prototype.hasOwnProperty.call(editedJson, 'enrolment_ranking')
    ? resolveEnrollmentRanking(editedJson.enrolment_ranking, null, status)
    : resolveEnrollmentRanking(benefitPlan?.enrolmentRanking, benefitPlan?.jsonExt, status);
  return ranking ? JSON.stringify(ranking, null, 2) : '';
}

export function mandatoryEligibilityRuleKeys(benefitPlanType) {
  if (benefitPlanType === 'GROUP') {
    return ['benefitPlan.eligibilityRules.groupVerifiedAuthoritativePrimaryWorker'];
  }
  if (benefitPlanType === 'INDIVIDUAL') {
    return ['benefitPlan.eligibilityRules.individualWithoutActiveHousehold'];
  }
  return [];
}
