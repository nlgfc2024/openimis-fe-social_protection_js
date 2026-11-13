const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  normalizeAdvancedCriteria,
  jsonExtWithPhaseCriteria,
  phaseCriteriaByStatus,
  safeParseJsonObject,
} = loadEsModule(path.join(__dirname, '../src/util/advanced-criteria-utils.js'));


test('normalizes the legacy criteria list as POTENTIAL criteria', () => {
  const criteria = [{
    field: 'age', filter: 'gte', type: 'integer', value: 18,
  }];
  assert.deepEqual(normalizeAdvancedCriteria(criteria), { POTENTIAL: criteria });
});

test('accepts serialized criteria and rejects malformed values', () => {
  assert.deepEqual(
    normalizeAdvancedCriteria('{"ACTIVE":[{"field":"district"}]}'),
    { ACTIVE: [{ field: 'district' }] },
  );
  assert.deepEqual(normalizeAdvancedCriteria('{invalid'), {});
});

test('parses JSON objects without allowing malformed JSON to crash the page', () => {
  assert.deepEqual(safeParseJsonObject('{"preserved":true}'), { preserved: true });
  assert.deepEqual(safeParseJsonObject('{invalid'), {});
  assert.deepEqual(safeParseJsonObject([]), {});
});

const fit = { field: 'fit_for_work', filter: 'exact', type: 'integer', value: 1 };
const female = { field: 'gender', filter: 'exact', type: 'string', value: 'Female' };

test('Phase criteria come from unsaved edits first, then as loaded', () => {
  const benefitPlan = { advancedCriteria: { ACTIVE: [fit] }, jsonExt: '{}' };
  assert.deepEqual(phaseCriteriaByStatus({ advancedCriteria: { ACTIVE: [fit] }, jsonExt: '{}' }, benefitPlan), { ACTIVE: [fit] });
  const edited = { jsonExt: JSON.stringify({ data_source: 'pwp', advanced_criteria: { POTENTIAL: [female] } }) };
  assert.deepEqual(phaseCriteriaByStatus(edited, benefitPlan), { POTENTIAL: [female] });
  assert.deepEqual(phaseCriteriaByStatus({}, { jsonExt: JSON.stringify({ advanced_criteria: [fit] }) }), { POTENTIAL: [fit] });
});

test('writing a status keeps the others and the rest of jsonExt, and only rows with a field', () => {
  const edited = { advancedCriteria: { ACTIVE: [fit] }, jsonExt: JSON.stringify({ data_source: 'pwp' }) };
  const written = JSON.parse(jsonExtWithPhaseCriteria(edited, null, 'POTENTIAL', [female, { field: '' }]));
  assert.deepEqual(written, { data_source: 'pwp', advanced_criteria: { ACTIVE: [fit], POTENTIAL: [female] } });
  const cleared = JSON.parse(jsonExtWithPhaseCriteria({ ...edited, jsonExt: JSON.stringify(written) }, null, 'ACTIVE', []));
  assert.deepEqual(cleared.advanced_criteria, { POTENTIAL: [female] });
});

test('nothing is written when the criteria do not change', () => {
  const edited = { advancedCriteria: { ACTIVE: [fit] }, jsonExt: '{}' };
  assert.equal(jsonExtWithPhaseCriteria(edited, null, 'ACTIVE', [fit]), null);
  assert.equal(jsonExtWithPhaseCriteria(edited, null, 'POTENTIAL', [{ field: '' }]), null);
});
