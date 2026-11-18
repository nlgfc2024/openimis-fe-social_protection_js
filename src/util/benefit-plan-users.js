export const ASSIGNMENT_MUTATION_OUTCOME = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
};

export function isBenefitPlanAccessControlEnabled(modulesManager) {
  return modulesManager?.getConf(
    'fe-social_protection',
    'enable_benefit_plan_access_control',
    false,
  ) === true;
}

export function canManageBenefitPlanUsers(modulesManager, rights, managementRight) {
  return isBenefitPlanAccessControlEnabled(modulesManager)
    && Array.isArray(rights)
    && rights.includes(managementRight);
}

export const ASSIGNMENT_ERROR_TRANSLATIONS = {
  'mutation.benefit_plan_user_assignment_exists': 'benefitPlan.users.error.assignmentExists',
  'mutation.benefit_plan_not_found': 'benefitPlan.users.error.benefitPlanNotFound',
  'mutation.benefit_plan_user_assignment_not_found': 'benefitPlan.users.error.assignmentNotFound',
  'mutation.benefit_plan_user_assignment_self_revoke': 'benefitPlan.users.error.selfRevoke',
  'mutation.user_not_found': 'benefitPlan.users.error.userInactive',
  'Benefit Plan assignment-management permission is required.': 'benefitPlan.users.error.permissionDenied',
  'Benefit Plan assignment-management permission and plan access are required.':
    'benefitPlan.users.error.permissionDenied',
};

export function assignmentMutationOutcome(result) {
  if (result?.status === 2) return ASSIGNMENT_MUTATION_OUTCOME.SUCCESS;
  if (result?.status === 1) return ASSIGNMENT_MUTATION_OUTCOME.FAILED;
  return ASSIGNMENT_MUTATION_OUTCOME.PENDING;
}

function errorMessages(error) {
  if (!error) return [];
  if (Array.isArray(error)) {
    return error.flatMap((item) => errorMessages(item));
  }
  if (typeof error === 'object') {
    return errorMessages(error.detail || error.message);
  }
  const message = String(error).trim();
  if (message.startsWith('[') && message.endsWith(']')) {
    const quotedMessages = [...message.matchAll(/'([^']+)'|"([^"]+)"/g)]
      .map((match) => match[1] || match[2]);
    if (quotedMessages.length) return quotedMessages;
  }
  return message ? [message] : [];
}

export function assignmentMutationError(error, fallback, translate = null) {
  const messages = errorMessages(error);
  if (!messages.length) return fallback;
  const formatted = messages.map((message) => {
    const translationKey = ASSIGNMENT_ERROR_TRANSLATIONS[message];
    if (translationKey) return translate ? translate(translationKey) : message;
    if (/^[a-zA-Z_][\w-]*(\.[\w-]+)+$/.test(message)) return fallback;
    return message;
  });
  return [...new Set(formatted)].join('\n');
}

export function applyAssignmentMutationOutcome(result, handlers) {
  const outcome = assignmentMutationOutcome(result);
  if (outcome === ASSIGNMENT_MUTATION_OUTCOME.SUCCESS) handlers.onSuccess();
  if (outcome === ASSIGNMENT_MUTATION_OUTCOME.FAILED) handlers.onFailure(result?.error);
  if (outcome === ASSIGNMENT_MUTATION_OUTCOME.PENDING) handlers.onPending();
  return outcome;
}
