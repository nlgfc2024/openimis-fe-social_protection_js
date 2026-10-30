const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const loadEsModule = require('./load-es-module.cjs');
const { resolveMenuEntries } = loadEsModule(path.join(__dirname, '../src/menus/menu-entries.js'));

const entries = [
  { id: 'phases', route: '/benefitPlans' },
  { id: 'individuals', route: '/individuals', filter: (rights) => rights.includes(1) },
  {
    id: 'enrolment.menu',
    children: [
      { id: 'individualEnrolment', route: '/enrolment/individuals', filter: (rights) => rights.includes(2) },
      { id: 'householdEnrolment', route: '/enrolment/groups', filter: (rights) => rights.includes(3) },
    ],
  },
];

test('groups enrolment without hiding the registry and preserves child destinations', () => {
  const visible = resolveMenuEntries(entries, [], 'social', [1, 2, 3]);
  assert.deepEqual(visible.map((entry) => entry.id), ['phases', 'individuals', 'enrolment.menu']);
  assert.deepEqual(visible[2].children.map((entry) => entry.route), ['/enrolment/individuals', '/enrolment/groups']);
});

test('each child respects its permission and an empty parent disappears', () => {
  assert.deepEqual(resolveMenuEntries(entries, [], 'social', [3])[1].children.map((entry) => entry.id), ['householdEnrolment']);
  assert.deepEqual(resolveMenuEntries(entries, [], 'social', []).map((entry) => entry.id), ['phases']);
});

test('preserves instance menu ordering while allowing the new grouped entry', () => {
  const config = [{ id: 'social', submenus: [{ id: 'individuals', position: 1 }, { id: 'phases', position: 2 }] }];
  assert.deepEqual(resolveMenuEntries(entries, config, 'social', [1, 2, 3]).map((entry) => entry.id), ['individuals', 'phases', 'enrolment.menu']);
});

test('legacy enrolment child positions locate the parent without duplicate links', () => {
  const config = [{ id: 'social', submenus: [{ id: 'householdEnrolment', position: 1 }, { id: 'phases', position: 2 }] }];
  assert.deepEqual(resolveMenuEntries(entries, config, 'social', [2, 3]).map((entry) => entry.id), ['enrolment.menu', 'phases']);
});
