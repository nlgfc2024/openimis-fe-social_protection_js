export function consumeConfirmedAction({
  confirmed,
  confirmedAction,
  clearConfirmedAction,
  clearConfirm,
}) {
  if (confirmed === null || confirmed === undefined) return false;

  clearConfirmedAction();
  clearConfirm(null);
  if (!confirmed || typeof confirmedAction !== 'function') return false;

  confirmedAction();
  return true;
}

export function createRevokeConfirmedAction(
  revokeBenefitPlanUserAccess,
  assignmentId,
  mutationLabel,
) {
  return () => revokeBenefitPlanUserAccess(assignmentId, mutationLabel);
}
