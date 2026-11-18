const fs = require('fs');
const babel = require('@babel/core');

module.exports = function loadEsModule(path, overrides = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const { code } = babel.transformSync(source, {
    presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  });
  const module = { exports: {} };
  const evaluate = new Function('module', 'exports', 'require', `${code}\n//# sourceURL=${path}`);
  const localRequire = (id) => (Object.prototype.hasOwnProperty.call(overrides, id)
    ? overrides[id]
    : require(id));
  evaluate(module, module.exports, localRequire);
  return module.exports;
};
