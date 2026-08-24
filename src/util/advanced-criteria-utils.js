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

export function resolveEnrollmentRanking(jsonExt, status) {
  const rankings = safeParseJsonObject(jsonExt).enrolment_ranking;
  if (!rankings || typeof rankings !== 'object' || Array.isArray(rankings)) return null;
  return rankings[status] || rankings['*'] || null;
}
