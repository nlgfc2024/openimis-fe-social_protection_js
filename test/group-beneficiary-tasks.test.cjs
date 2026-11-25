const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');

const react = { createElement: (type, props) => ({ type, props }) };
const core = { FormattedMessage: () => null };
const load = (relative, overrides = {}) => {
  const source = fs.readFileSync(path.join(__dirname, relative), 'utf8');
  const { code } = babel.transformSync(source, {
    configFile: false, babelrc: false,
    presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'],
  });
  const result = { exports: {} };
  const dependencies = {
    react, '@openimis/fe-core': core, flat: (value) => value, ...overrides,
  };
  new Function('module', 'exports', 'require', code)(result, result.exports,
    (name) => Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : {});
  return result.exports;
};

test('household approval is contributed to the existing task source registry', () => {
  const tasks = load('../src/components/tasks/GroupBeneficiaryTasks.js');
  const { SocialProtectionModule } = load('../src/index.js', {
    './components/tasks/GroupBeneficiaryTasks': tasks,
  });
  const contributions = SocialProtectionModule({})['tasksManagement.tasks'];
  const household = contributions.filter((item) => item.taskSource.includes('GroupBeneficiaryService'));
  assert.equal(household.length, 1);
  assert.equal(household[0].itemFormatters, tasks.GroupBeneficiaryTaskItemFormatters);
  assert(contributions.some((item) => item.taskSource.includes('BeneficiaryService')));
});

test('create previews show the household identity, programme and requested status', () => {
  const { GroupBeneficiaryTaskItemFormatters, GroupBeneficiaryTaskTableHeaders } = load('../src/components/tasks/GroupBeneficiaryTasks.js');
  const incoming = { group_id: 'household-uuid', benefit_plan_id: 'phase-uuid', status: 'ACTIVE' };
  assert.deepEqual(GroupBeneficiaryTaskItemFormatters().map((format) => format(incoming)),
    ['household-uuid', 'phase-uuid', 'ACTIVE']);
  assert.equal(GroupBeneficiaryTaskTableHeaders()[0].props.id, 'groupBeneficiary.task.group.id');
  assert.doesNotThrow(() => GroupBeneficiaryTaskItemFormatters().map((format) => format(null)));
});
