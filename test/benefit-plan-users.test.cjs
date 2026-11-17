const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const readSource = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const indexSource = readSource('src/index.js');
const panelSource = readSource('src/components/BenefitPlanUsersTabPanel.js');
const actionsSource = readSource('src/actions.js');
const constantsSource = readSource('src/constants.js');
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

test('defines backend-backed query, assignment, and revocation actions', () => {
  assert.match(actionsSource, /'benefitPlanUserAccess'/);
  assert.match(actionsSource, /formatMutation\('assignBenefitPlanUser'/);
  assert.match(actionsSource, /'revokeBenefitPlanUserAccess'/);
});

test('provides all Users tab translations', () => {
  for (const key of [
    'socialProtection.benefitPlan.users.label',
    'socialProtection.benefitPlan.users.select',
    'socialProtection.benefitPlan.users.assign',
    'socialProtection.benefitPlan.users.revoke',
    'socialProtection.benefitPlan.users.empty',
  ]) assert.equal(typeof translations[key], 'string');
});
