const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const loadEsModule = require('./load-es-module.cjs');

const root = path.join(__dirname, '..');
const users = loadEsModule(path.join(root, 'src/util/benefit-plan-users.js'));

test('Users tab access requires the frontend flag and permission 160007', () => {
  const enabled = { getConf: () => true };
  const disabled = { getConf: () => false };
  const missing = { getConf: (_module, _key, fallback) => fallback };
  assert.equal(users.canManageBenefitPlanUsers(enabled, [160007], 160007), true);
  assert.equal(users.canManageBenefitPlanUsers(enabled, [], 160007), false);
  assert.equal(users.canManageBenefitPlanUsers(disabled, [160007], 160007), false);
  assert.equal(users.canManageBenefitPlanUsers(missing, [160007], 160007), false);
  assert.equal(users.canManageBenefitPlanUsers(null, [160007], 160007), false);
});

test('successful final mutation refreshes the list and no failure handler', () => {
  let refreshes = 0;
  let failures = 0;
  const outcome = users.applyAssignmentMutationOutcome(
    { status: 2 },
    {
      onSuccess: () => { refreshes += 1; },
      onFailure: () => { failures += 1; },
      onPending: () => { failures += 1; },
    },
  );
  assert.equal(outcome, users.ASSIGNMENT_MUTATION_OUTCOME.SUCCESS);
  assert.equal(refreshes, 1);
  assert.equal(failures, 0);
});

test('failed and pending mutations report feedback without refreshing', () => {
  const events = [];
  const handlers = {
    onSuccess: () => events.push('refresh'),
    onFailure: (error) => events.push(error[0].detail),
    onPending: () => events.push('pending'),
  };
  users.applyAssignmentMutationOutcome({ status: 1, error: [{ detail: 'duplicate' }] }, handlers);
  users.applyAssignmentMutationOutcome(null, handlers);
  assert.deepEqual(events, ['duplicate', 'pending']);
  assert.equal(
    users.assignmentMutationError([{ detail: 'duplicate' }], 'fallback'),
    'duplicate',
  );
});

test('known assignment errors are translated from arrays and serialized arrays', () => {
  const labels = {
    'benefitPlan.users.error.assignmentExists': 'Already assigned',
    'benefitPlan.users.error.permissionDenied': 'Not permitted',
    'benefitPlan.users.error.assignmentNotFound': 'Assignment missing',
    'benefitPlan.users.error.selfRevoke': 'Cannot remove your own access',
  };
  const translate = (key) => labels[key];
  assert.equal(
    users.assignmentMutationError(
      [{ detail: 'mutation.benefit_plan_user_assignment_exists' }],
      'fallback',
      translate,
    ),
    'Already assigned',
  );
  assert.equal(
    users.assignmentMutationError(
      "['Benefit Plan assignment-management permission is required.']",
      'fallback',
      translate,
    ),
    'Not permitted',
  );
  assert.equal(
    users.assignmentMutationError(
      "['mutation.benefit_plan_user_assignment_not_found', 'mutation.benefit_plan_user_assignment_exists']",
      'fallback',
      translate,
    ),
    'Assignment missing\nAlready assigned',
  );
  assert.equal(
    users.assignmentMutationError(
      [{ detail: 'mutation.benefit_plan_user_assignment_self_revoke' }],
      'fallback',
      translate,
    ),
    'Cannot remove your own access',
  );
});

test('self-revocation failure shows its message without refreshing', () => {
  const events = [];
  const translate = () => 'You cannot remove your own access to this Benefit Plan.';
  users.applyAssignmentMutationOutcome(
    {
      status: 1,
      error: [{ detail: 'mutation.benefit_plan_user_assignment_self_revoke' }],
    },
    {
      onSuccess: () => events.push('refresh'),
      onFailure: (error) => events.push(
        users.assignmentMutationError(error, 'fallback', translate),
      ),
      onPending: () => events.push('pending'),
    },
  );
  assert.deepEqual(events, [
    'You cannot remove your own access to this Benefit Plan.',
  ]);
});

test('unknown technical errors use a safe fallback while readable errors are preserved', () => {
  assert.equal(
    users.assignmentMutationError("['mutation.unknown_failure']", 'Please try again'),
    'Please try again',
  );
  assert.equal(
    users.assignmentMutationError('The service is temporarily unavailable.', 'Please try again'),
    'The service is temporarily unavailable.',
  );
});

const actionType = {
  REQUEST: (name) => `${name}_REQ`,
  SUCCESS: (name) => `${name}_RESP`,
  ERROR: (name) => `${name}_ERR`,
  CLEAR: (name) => `${name}_CLEAR`,
};
const coreMocks = {
  decodeId: (value) => `decoded:${value}`,
  dispatchMutationReq: (state, action) => ({
    ...state,
    submittingMutation: true,
    mutation: action.meta,
  }),
  dispatchMutationResp: (state) => ({ ...state, submittingMutation: false }),
  dispatchMutationErr: (state, action) => ({ ...state, alert: action.payload }),
  formatGraphQLError: () => null,
  formatServerError: (payload) => payload,
  pageInfo: (data) => data?.pageInfo || {},
  parseData: (data) => data?.edges?.map((edge) => edge.node) || [],
};
const reducerModule = loadEsModule(path.join(root, 'src/reducer.js'), {
  '@openimis/fe-core': coreMocks,
  './util/action-type': actionType,
});

test('mutation transport errors restore the interface to an enabled state', () => {
  const state = {
    submittingMutation: true,
    mutation: { actionType: reducerModule.ACTION_TYPE.ASSIGN_BENEFIT_PLAN_USER },
  };
  const next = reducerModule.default(state, {
    type: actionType.ERROR(reducerModule.ACTION_TYPE.MUTATION),
    payload: { status: 500 },
  });
  assert.equal(next.submittingMutation, false);
  assert.deepEqual(next.alert, { status: 500 });
});

test('out-of-order assignment page responses are ignored', () => {
  const search = reducerModule.ACTION_TYPE.SEARCH_BENEFIT_PLAN_USER_ACCESS;
  let state = reducerModule.default(undefined, { type: '@@INIT' });
  state = reducerModule.default(state, {
    type: actionType.REQUEST(search),
    meta: { requestId: 1 },
  });
  state = reducerModule.default(state, {
    type: actionType.REQUEST(search),
    meta: { requestId: 2 },
  });
  const stale = reducerModule.default(state, {
    type: actionType.SUCCESS(search),
    meta: { requestId: 1 },
    payload: { data: { benefitPlanUserAccess: { edges: [] } } },
  });
  assert.strictEqual(stale, state);

  const current = reducerModule.default(state, {
    type: actionType.SUCCESS(search),
    meta: { requestId: 2 },
    payload: {
      data: {
        benefitPlanUserAccess: {
          edges: [{ node: { id: 'assignment', user: { id: 'user-uuid' } } }],
          pageInfo: { hasNextPage: false },
          totalCount: 1,
        },
      },
    },
  });
  assert.equal(current.fetchingBenefitPlanUserAccess, false);
  assert.equal(current.benefitPlanUserAccess[0].user.id, 'user-uuid');
});
