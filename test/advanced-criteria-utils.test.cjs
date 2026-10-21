const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  normalizeAdvancedCriteria,
  safeParseJsonObject,
  resolveEnrollmentRanking,
  updateEnrollmentRanking,
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

test('resolves status ranking before wildcard fallback', () => {
  const jsonExt = JSON.stringify({
    enrolment_ranking: {
      '*': { order_by: ['id'], limit: { percentage: 20 } },
      ACTIVE: { order_by: ['-id'], limit: { percentage: 10 } },
    },
  });
  assert.deepEqual(resolveEnrollmentRanking(null, jsonExt, 'ACTIVE').order_by, ['-id']);
  assert.equal(resolveEnrollmentRanking(null, jsonExt, 'POTENTIAL').limit.percentage, 20);
  assert.equal(resolveEnrollmentRanking(null, '{invalid', 'ACTIVE'), null);
});

test('prefers the dedicated criteria-gated ranking field over jsonExt', () => {
  const dedicated = JSON.stringify({ ACTIVE: { order_by: ['-dob'] } });
  const jsonExt = JSON.stringify({
    enrolment_ranking: { ACTIVE: { order_by: ['id'] } },
  });
  assert.deepEqual(
    resolveEnrollmentRanking(dedicated, jsonExt, 'ACTIVE').order_by,
    ['-dob'],
  );
});

test('updates one phase ranking while preserving other extension data and rankings', () => {
  const jsonExt = JSON.stringify({
    preserved: true,
    advanced_criteria: { ACTIVE: [{ field: 'eligible' }] },
  });
  const dedicated = JSON.stringify({
    POTENTIAL: { order_by: ['id'] },
  });
  const updated = JSON.parse(updateEnrollmentRanking(
    jsonExt,
    dedicated,
    'ACTIVE',
    { order_by: ['-_weighted_score'] },
  ));

  assert.equal(updated.preserved, true);
  assert.deepEqual(updated.advanced_criteria.ACTIVE, [{ field: 'eligible' }]);
  assert.deepEqual(updated.enrolment_ranking.POTENTIAL.order_by, ['id']);
  assert.deepEqual(updated.enrolment_ranking.ACTIVE.order_by, ['-_weighted_score']);
});

test('keeps an explicit empty ranking object when the final phase rule is removed', () => {
  const updated = JSON.parse(updateEnrollmentRanking(
    '{}',
    JSON.stringify({ ACTIVE: { order_by: ['id'] } }),
    'ACTIVE',
    null,
  ));

  assert.deepEqual(updated.enrolment_ranking, {});
});
