const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const { areBenefitPlanFieldsValid } = loadEsModule(
  path.join(__dirname, '../src/util/benefit-plan-validation.js'),
);
const { updateEnrollmentRanking } = loadEsModule(
  path.join(__dirname, '../src/util/advanced-criteria-utils.js'),
);

const saved = {
  id: 'rmep2', code: '202698296', name: 'RMEP2',
  beneficiaryDataSchema: '{"type":"object"}', jsonExt: '{}',
};

test('ranking-only edits on an existing auto-coded phase do not require field validation flags', () => {
  const edited = {
    ...saved,
    jsonExt: updateEnrollmentRanking(saved.jsonExt, null, 'ACTIVE', {
      order_by: ['id'], limit: { respect_max_beneficiaries: true },
    }),
  };
  assert.notDeepEqual(edited, saved);
  assert.equal(areBenefitPlanFieldsValid(saved, edited), true);
  assert.equal(JSON.parse(edited.jsonExt).enrolment_ranking.ACTIVE.order_by[0], 'id');
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

test('invalid ranking JSON blocks saving despite valid persisted fields', () => {
  assert.equal(areBenefitPlanFieldsValid(saved, {
    ...saved, enrolmentRankingInvalid: true,
  }), false);
});
