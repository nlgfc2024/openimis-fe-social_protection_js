const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const loadEsModule = require('./load-es-module.cjs');

const root = path.join(__dirname, '..');
const confirmation = loadEsModule(
  path.join(root, 'src/util/confirmation-actions.js'),
);

const createHarness = () => {
  const events = [];
  let pendingAction = null;
  const register = (name, action = () => events.push(name)) => {
    pendingAction = action;
  };
  const resolve = (confirmed) => confirmation.consumeConfirmedAction({
    confirmed,
    confirmedAction: pendingAction,
    clearConfirmedAction: () => { pendingAction = null; },
    clearConfirm: (value) => events.push(`clear:${value}`),
  });
  return {
    events,
    register,
    resolve,
    pending: () => pendingAction,
  };
};

test('Delete cancel followed by Revoke confirm executes only Revoke', () => {
  const harness = createHarness();
  harness.register('delete');
  assert.equal(harness.resolve(false), false);
  harness.register('revoke');
  assert.equal(harness.resolve(true), true);
  assert.deepEqual(harness.events, ['clear:null', 'clear:null', 'revoke']);
});

test('Suspend cancel followed by Revoke confirm executes only Revoke', () => {
  const harness = createHarness();
  harness.register('suspend');
  harness.resolve(false);
  harness.register('revoke');
  harness.resolve(true);
  assert.deepEqual(harness.events, ['clear:null', 'clear:null', 'revoke']);
});

test('Revoke cancel executes no mutation', () => {
  const harness = createHarness();
  harness.register('revoke');
  assert.equal(harness.resolve(false), false);
  assert.equal(harness.pending(), null);
  assert.deepEqual(harness.events, ['clear:null']);
});

test('Revoke confirm dispatches only the selected assignment mutation', () => {
  const calls = [];
  const revoke = confirmation.createRevokeConfirmedAction(
    (...args) => calls.push(args),
    'assignment-a',
    'Revoke access',
  );
  const harness = createHarness();
  harness.register('revoke', revoke);
  harness.resolve(true);
  assert.deepEqual(calls, [['assignment-a', 'Revoke access']]);
});

test('cancelled Revoke A is replaced by confirmed Revoke B', () => {
  const calls = [];
  const harness = createHarness();
  harness.register('revoke-a', confirmation.createRevokeConfirmedAction(
    (id) => calls.push(id),
    'assignment-a',
    'Revoke A',
  ));
  harness.resolve(false);
  harness.register('revoke-b', confirmation.createRevokeConfirmedAction(
    (id) => calls.push(id),
    'assignment-b',
    'Revoke B',
  ));
  harness.resolve(true);
  assert.deepEqual(calls, ['assignment-b']);
});

test('Delete and Suspend confirmations retain their existing callbacks', () => {
  const deleteHarness = createHarness();
  deleteHarness.register('delete');
  deleteHarness.resolve(true);
  assert.deepEqual(deleteHarness.events, ['clear:null', 'delete']);

  const suspendHarness = createHarness();
  suspendHarness.register('suspend');
  suspendHarness.resolve(true);
  assert.deepEqual(suspendHarness.events, ['clear:null', 'suspend']);
});

test('multiple confirmation events cannot execute one action twice', () => {
  const harness = createHarness();
  harness.register('revoke');
  assert.equal(harness.resolve(true), true);
  assert.equal(harness.resolve(true), false);
  assert.deepEqual(harness.events, ['clear:null', 'revoke', 'clear:null']);
});
