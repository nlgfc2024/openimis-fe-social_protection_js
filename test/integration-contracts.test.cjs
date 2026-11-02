const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const translations = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/translations/en.json')));
const panelSource = fs.readFileSync(
  path.join(__dirname, '../src/components/BenefitPlanEligibilityCriteriaPanel.js'), 'utf8',
);

test('Social Protection owns the criteria button and fixed-rule translations', () => {
  for (const key of [
    'socialProtection.benefitPlan.eligibilityRules.addCriteria',
    'socialProtection.benefitPlan.eligibilityRules.clearCriteria',
    'socialProtection.benefitPlan.eligibilityRules.mandatoryTitle',
    'socialProtection.benefitPlan.eligibilityRules.groupVerifiedAuthoritativePrimaryWorker',
  ]) assert.equal(typeof translations[key], 'string');
  assert.equal(panelSource.includes('individual.enrollment.addFilters'), false);
  assert.equal(panelSource.includes('individual.enrollment.clearAllFilters'), false);
});

test('criteria rows depend on the published Enrolment module component', () => {
  assert.equal(panelSource.includes('pubRef="enrolment.AdvancedCriteriaRowValue"'), true);
  assert.equal(panelSource.includes('pubRef="individual.AdvancedCriteriaRowValue"'), false);
});

test('default module translations use Program rather than Malawi-specific phase wording', () => {
  const approval = translations['socialProtection.benefitPlan.update.submittedForApproval'];
  const rankingHelp = translations['socialProtection.benefitPlan.enrolmentRanking.editorHelp'];
  assert.equal(approval.includes('Program'), true);
  assert.equal(rankingHelp.includes('Program'), true);
  assert.equal(/\bphase\b/i.test(approval), false);
});
