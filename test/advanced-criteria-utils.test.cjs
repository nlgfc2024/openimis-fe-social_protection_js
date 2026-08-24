const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  normalizeAdvancedCriteria,
  safeParseJsonObject,
  resolveEnrollmentRanking,
} = loadEsModule(path.join(__dirname, '../src/util/advanced-criteria-utils.js'));

test('normalizes the legacy criteria list as POTENTIAL criteria', () => {
  const criteria = [{ field: 'age', filter: 'gte', type: 'integer', value: 18 }];
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
  assert.deepEqual(resolveEnrollmentRanking(jsonExt, 'ACTIVE').order_by, ['-id']);
  assert.equal(resolveEnrollmentRanking(jsonExt, 'POTENTIAL').limit.percentage, 20);
  assert.equal(resolveEnrollmentRanking('{invalid', 'ACTIVE'), null);
});
