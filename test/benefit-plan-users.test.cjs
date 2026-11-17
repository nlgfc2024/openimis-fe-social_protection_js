const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const readSource = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const indexSource = readSource('src/index.js');
const panelSource = readSource('src/components/BenefitPlanUsersTabPanel.js');
const actionsSource = readSource('src/actions.js');
const constantsSource = readSource('src/constants.js');
const reducerSource = readSource('src/reducer.js');
const translations = JSON.parse(readSource('src/translations/en.json'));

test('registers the Users tab through the Benefit Plan extension points', () => {
  assert.match(indexSource, /'benefitPlan\.TabPanel\.label'/);
  assert.match(indexSource, /BenefitPlanUsersTabLabel/);
  assert.match(indexSource, /'benefitPlan\.TabPanel\.panel'/);
  assert.match(indexSource, /BenefitPlanUsersTabPanel/);
});

test('uses the Admin UserPicker and the dedicated assignment permission', () => {
  assert.match(panelSource, /pubRef="admin\.UserPicker"/);
  assert.match(panelSource, /RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE/);
  assert.match(constantsSource, /RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE = 160007/);
  assert.doesNotMatch(panelSource, /RIGHT_BENEFIT_PLAN_UPDATE/);
});

test('requires the frontend access-control flag as well as permission 160007', () => {
  assert.match(constantsSource, /enable_benefit_plan_access_control/);
  assert.match(indexSource, /enable_benefit_plan_access_control: false/);
  assert.match(panelSource, /isBenefitPlanAccessControlEnabled/);
  assert.match(panelSource, /&& rights\.includes\(RIGHT_BENEFIT_PLAN_ASSIGNMENT_MANAGE\)/);
});

test('defines backend-backed query, assignment, and revocation actions', () => {
  assert.match(actionsSource, /'benefitPlanUserAccess'/);
  assert.match(actionsSource, /user \{ id username firstName lastName \}/);
  assert.match(actionsSource, /formatMutation\('assignBenefitPlanUser'/);
  assert.match(actionsSource, /'revokeBenefitPlanUserAccess'/);
});

test('decodes the selected Relay user ID before assignment', () => {
  assert.match(panelSource, /decodeId\(selectedUser\.id\)/);
});

test('waits for successful final mutation status before refreshing', () => {
  assert.match(panelSource, /journalize\(mutation\)/);
  assert.match(panelSource, /waitForMutation\(pendingMutation\.clientMutationId\)/);
  assert.match(panelSource, /result\?\.status === 2/);
  assert.doesNotMatch(panelSource, /if \(mutation\?\.id\) \{\s*coreAlert/);
});

test('uses Relay pagination and theme spacing', () => {
  assert.match(panelSource, /TablePagination/);
  assert.match(panelSource, /endCursor/);
  assert.match(panelSource, /startCursor/);
  assert.match(panelSource, /theme\.spacing\(2\)/);
  assert.doesNotMatch(panelSource, /first: 100/);
  assert.doesNotMatch(panelSource, /style=\{\{ padding: 16 \}\}/);
  assert.match(reducerSource, /benefitPlanUserAccessPageInfo: pageInfo/);
});

test('provides all Users tab translations', () => {
  [
    'socialProtection.benefitPlan.users.label',
    'socialProtection.benefitPlan.users.select',
    'socialProtection.benefitPlan.users.assign',
    'socialProtection.benefitPlan.users.revoke',
    'socialProtection.benefitPlan.users.empty',
  ].forEach((key) => assert.equal(typeof translations[key], 'string'));

  assert.equal(
    translations['social_protection.gql_benefit_plan_all_access_perms'],
    'Social Protection | Benefit Plan Access All',
  );
  assert.equal(
    translations['social_protection.gql_benefit_plan_assignment_manage_perms'],
    'Social Protection | Benefit Plan User Assignments Manage',
  );
});
