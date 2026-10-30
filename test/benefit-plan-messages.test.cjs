const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const { default: benefitPlanUpdateSuccessMessageKey } = loadEsModule(
  path.join(__dirname, '../src/util/benefit-plan-messages.js'),
);

test('approval success message is used only when approval is explicitly required', () => {
  assert.equal(benefitPlanUpdateSuccessMessageKey(true), 'benefitPlan.update.submittedForApproval');
  for (const value of [false, null, undefined]) {
    assert.equal(benefitPlanUpdateSuccessMessageKey(value), 'benefitPlan.update.success');
  }
});
