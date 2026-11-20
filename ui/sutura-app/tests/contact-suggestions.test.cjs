const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(file) {
  const api = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/utils', file + '.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: api, require: name => { if (name === './inputValidation') return load('inputValidation'); throw Error(name); } });
  return api;
}
const { phoneContacts, suggestContacts } = load('contactSuggestions');
test('contact numbers normalize, deduplicate, and ignore missing or unusable entries', () => {
  const rows = phoneContacts([
    { fullName: 'Mamadou', phones: [{ number: '328 1914' }, { number: '+2203281914' }, { number: '*123#' }] },
    { fullName: 'Awa', phones: [{ number: '3000002' }, { number: '+221771234567' }] },
    { fullName: 'No phone' },
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows.filter(row => row.phone === '+2203281914').length, 1);
});
test('only matching numbers appear after two digits, and selecting a full number dismisses its suggestion', () => {
  const rows = phoneContacts([{ fullName: 'Mamadou', phones: [{ number: '3281914' }] }, { fullName: 'Awa', phones: [{ number: '3000002' }] }]);
  assert.equal(suggestContacts(rows, '3').length, 0);
  assert.equal(suggestContacts(rows, '328')[0].name, 'Mamadou');
  assert.equal(suggestContacts(rows, '777').length, 0);
  assert.equal(suggestContacts(rows, '+2203281914').length, 0);
});
test('outages are not described as a fraud verdict, while actual blocks remain blocked', () => {
  const { formatFraudError } = load('fraudErrors');
  assert.match(formatFraudError('Transaction stopped: Sentinel unavailable or returned an invalid decision'), /couldn't complete the security check/);
  assert.match(formatFraudError('Transaction blocked by fraud detection'), /blocked for your security/);
});
