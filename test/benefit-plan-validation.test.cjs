const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const { areBenefitPlanFieldsValid } = loadEsModule(
  path.join(__dirname, '../src/util/benefit-plan-validation.js'),
);

const saved = {
  id: 'rmep2', code: '202698296', name: 'RMEP2',
  beneficiaryDataSchema: '{"type":"object"}', jsonExt: '{}',
};

test('criteria-only edits on an existing auto-coded phase do not require field validation flags', () => {
  const edited = {
    ...saved,
    jsonExt: JSON.stringify({ advanced_criteria: { ACTIVE: [{ field: 'district' }] } }),
  };
  assert.notDeepEqual(edited, saved);
  assert.equal(areBenefitPlanFieldsValid(saved, edited), true);
});

test('unmodified saved fields remain valid even when mounted validators clear their flags', () => {
  assert.equal(areBenefitPlanFieldsValid(saved, { ...saved, description: 'Updated' }, {
    code: false, name: false, beneficiaryDataSchema: false,
  }), true);
});

test('a changed name or schema still needs successful validation', () => {
  for (const field of ['name', 'beneficiaryDataSchema']) {
    const edited = { ...saved, [field]: 'changed' };
    assert.equal(areBenefitPlanFieldsValid(saved, edited), false);
    assert.equal(areBenefitPlanFieldsValid(saved, edited, { [field]: false }), false);
    assert.equal(areBenefitPlanFieldsValid(saved, edited, { [field]: true }), true);
  }
});

test('new phases still require name and schema validation', () => {
  const edited = { name: 'RMEP2', beneficiaryDataSchema: '{"type":"object"}' };
  assert.equal(areBenefitPlanFieldsValid(null, edited), false);
  assert.equal(areBenefitPlanFieldsValid(null, edited, {
    name: true, beneficiaryDataSchema: true,
  }), true);
});
