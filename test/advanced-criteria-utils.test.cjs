const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const {
  normalizeAdvancedCriteria,
  parseEnrollmentRankingText,
  rankingEditorContextKey,
  rankingTextForStatus,
  safeParseJsonObject,
  resolveEnrollmentRanking,
  updateEnrollmentRanking,
  validateEnrollmentRanking,
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

test('ranking editor context remains stable while typing and changes for saved plans or statuses', () => {
  const saved = { id: 'plan-1', version: 4, dateUpdated: '2026-10-28' };
  const key = rankingEditorContextKey(saved, 'ACTIVE');
  assert.equal(rankingEditorContextKey({ ...saved, jsonExt: '{partial' }, 'ACTIVE'), key);
  assert.notEqual(rankingEditorContextKey({ ...saved, version: 5 }, 'ACTIVE'), key);
  assert.notEqual(rankingEditorContextKey(saved, 'POTENTIAL'), key);
});

test('ranking text reloads the selected status and preserves edited status configurations', () => {
  const saved = { enrolmentRanking: JSON.stringify({ ACTIVE: { order_by: ['id'] } }) };
  const edited = { jsonExt: JSON.stringify({ enrolment_ranking: {
    ACTIVE: { order_by: ['-dob'] }, POTENTIAL: { limit: { percentage: 25 } },
  } }) };
  assert.deepEqual(JSON.parse(rankingTextForStatus(edited, saved, 'ACTIVE')).order_by, ['-dob']);
  assert.equal(JSON.parse(rankingTextForStatus(edited, saved, 'POTENTIAL')).limit.percentage, 25);
  assert.equal(rankingTextForStatus(null, saved, 'ACTIVE').includes('"id"'), true);
});

test('ranking validation gives specific feedback for known keys and values', () => {
  assert.equal(validateEnrollmentRanking({ order_by: ['id'], limit: { percentage: 50 } }), null);
  assert.equal(validateEnrollmentRanking([]), 'Ranking configuration must be a JSON object.');
  assert.equal(validateEnrollmentRanking({ unknown: true }), 'Unsupported ranking keys: unknown.');
  assert.equal(
    validateEnrollmentRanking({ order_by: [{ field: 'age', direction: 'sideways' }] }),
    'Ranking order_by[0].direction must be asc or desc.',
  );
  assert.equal(
    validateEnrollmentRanking({ limit: { percentage: 101 } }),
    'Ranking limit percentage must be between 1 and 100.',
  );
});

test('ranking parser accepts valid JSON and retains invalid text as an editor error', () => {
  assert.deepEqual(parseEnrollmentRankingText('{"order_by":["id"]}'), {
    ranking: { order_by: ['id'] }, error: null,
  });
  const partial = parseEnrollmentRankingText('{"order_by": [');
  assert.equal(partial.ranking, null);
  assert.equal(typeof partial.error, 'string');
  assert.equal(partial.error.length > 0, true);
});

