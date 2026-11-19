const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');

const parseJsonObject = loadEsModule(path.join(__dirname, '../src/util/parse-json-object.js')).default;

test('parseJsonObject returns parsed JSON objects', () => {
  assert.deepEqual(parseJsonObject('{"workflow":"Python KYC Details"}'), { workflow: 'Python KYC Details' });
});

test('parseJsonObject returns an empty object for malformed or non-object JSON', () => {
  for (const value of ['{invalid', 'null', '[]', '"text"', null, 42]) {
    assert.deepEqual(parseJsonObject(value), {});
  }
});
