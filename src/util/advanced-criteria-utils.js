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
