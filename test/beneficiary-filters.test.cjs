const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const { statusFromQueryParams } = loadEsModule(path.join(__dirname, '../src/util/beneficiary-filters.js'));

test('the export takes the status chosen in the list filters', () => {
  assert.equal(statusFromQueryParams(['benefitPlan_Id: "x"', 'status: ACTIVE', 'first: 10']), 'ACTIVE');
  assert.equal(statusFromQueryParams(['status: "POTENTIAL"']), 'POTENTIAL');
  assert.equal(statusFromQueryParams(['benefitPlan_Id: "x"', 'first: 10']), null);
  assert.equal(statusFromQueryParams(), null);
});
