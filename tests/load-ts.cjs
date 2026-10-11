const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
  const filename = path.resolve(file);
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React,
  } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts'), mocks, globals);
    return require(name);
  }, console: { log() {}, warn() {}, error() {} }, process, Buffer, URL, AbortController, AbortSignal,
    setTimeout, clearTimeout, atob, ...globals }, { filename });
  return module.exports;
}
module.exports = { load };
