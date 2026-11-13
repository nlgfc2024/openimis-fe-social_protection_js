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

export function mandatoryEligibilityRuleKeys(benefitPlanType) {
  if (benefitPlanType === 'GROUP') {
    return ['benefitPlan.eligibilityRules.groupVerifiedAuthoritativePrimaryWorker'];
  }
  if (benefitPlanType === 'INDIVIDUAL') {
    return ['benefitPlan.eligibilityRules.individualWithoutActiveHousehold'];
  }
  return [];
}

// The Phase's saved criteria by status, from the form's unsaved edits when there
// are any, else as loaded. The API returns them as advancedCriteria and leaves
// them out of jsonExt until the form writes them back there.
export function phaseCriteriaByStatus(edited, benefitPlan) {
  const editedCriteria = safeParseJsonObject(edited?.jsonExt).advanced_criteria;
  return normalizeAdvancedCriteria(
    editedCriteria
      ?? edited?.advancedCriteria
      ?? benefitPlan?.advancedCriteria
      ?? safeParseJsonObject(benefitPlan?.jsonExt).advanced_criteria,
  );
}

// The edited jsonExt with one status's criteria replaced by the rows that name a
// field; a status left with none is removed. Null when nothing would change.
export function jsonExtWithPhaseCriteria(edited, benefitPlan, status, rows) {
  const current = phaseCriteriaByStatus(edited, benefitPlan);
  const criteria = { ...current };
  const complete = rows.filter((row) => row?.field);
  if (complete.length) criteria[status] = complete;
  else delete criteria[status];
  if (JSON.stringify(criteria) === JSON.stringify(current)) return null;
  return JSON.stringify({ ...safeParseJsonObject(edited?.jsonExt), advanced_criteria: criteria });
}
