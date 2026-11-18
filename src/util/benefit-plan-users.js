export const ASSIGNMENT_MUTATION_OUTCOME = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
};

export function assignmentMutationOutcome(result) {
  if (result?.status === 2) return ASSIGNMENT_MUTATION_OUTCOME.SUCCESS;
  if (result?.status === 1) return ASSIGNMENT_MUTATION_OUTCOME.FAILED;
  return ASSIGNMENT_MUTATION_OUTCOME.PENDING;
}

export function assignmentMutationError(error, fallback) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error.map((item) => item?.detail || item?.message || String(item)).join('\n');
  }
  return error.detail || error.message || fallback;
}

export function applyAssignmentMutationOutcome(result, handlers) {
  const outcome = assignmentMutationOutcome(result);
  if (outcome === ASSIGNMENT_MUTATION_OUTCOME.SUCCESS) handlers.onSuccess();
  if (outcome === ASSIGNMENT_MUTATION_OUTCOME.FAILED) handlers.onFailure(result?.error);
  if (outcome === ASSIGNMENT_MUTATION_OUTCOME.PENDING) handlers.onPending();
  return outcome;
}
