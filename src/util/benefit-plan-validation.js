// Persisted values have already passed the service's validation. Ranking-only
// edits must not depend on validators for fields the user has not changed.
export function areBenefitPlanFieldsValid(savedPlan, editedPlan, validation = {}) {
  if (!editedPlan || editedPlan.enrolmentRankingInvalid) return false;

  return ['code', 'name', 'beneficiaryDataSchema'].every((field) => (
    !editedPlan[field]
    || (savedPlan?.id && editedPlan[field] === savedPlan[field])
    || validation[field] === true
  ));
}
