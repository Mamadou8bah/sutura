const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/keyboardLayout.ts'), 'utf8');
const api = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });

test('overlay keyboards shrink the viewport; already-resized windows get no second inset', () => {
  assert.equal(api.keyboardOverlap(800, 0, 500), 300);
  assert.equal(api.keyboardOverlap(500, 300, 500), 300);
  assert.equal(api.keyboardOverlap(500, 0, 500), 0);
  assert.equal(api.keyboardOverlap(800, 300, undefined), 0);
  assert.equal(api.keyboardOverlap(450, 0, 500), 0);
});
test('switching keyboards recomputes the remaining overlap', () => {
  assert.equal(api.keyboardOverlap(500, 300, 440), 360);
  assert.equal(api.keyboardOverlap(440, 360, 600), 200);
});
test('covered fields scroll above the keyboard, visible fields stay put', () => {
  assert.equal(api.focusedScrollOffset(0, 80, 500, 520, 56), 92);
  assert.equal(api.focusedScrollOffset(100, 80, 500, 150, 56), 100);
  assert.equal(api.focusedScrollOffset(100, 80, 500, 60, 56), 64);
  assert.equal(api.focusedScrollOffset(0, 80, 500, 20, 56), 0);
});
test('large multiline fields reveal their top rather than scrolling beyond it', () => {
  assert.equal(api.focusedScrollOffset(100, 80, 300, 150, 400), 154);
});
test('unmounting a form removes its focus listener', () => {
  let calls = 0;
  const unsubscribe = api.subscribeKeyboardFocus(() => calls++);
  api.notifyKeyboardFocus();
  unsubscribe();
  api.notifyKeyboardFocus();
  assert.equal(calls, 1);
});
test('all three apps use the same keyboard geometry, scroll container and focus notifications', () => {
  const root = path.resolve(__dirname, '../..');
  const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const file of ['utils/keyboardLayout.ts', 'components/KeyboardScrollView.tsx', 'hooks/useKeyboardVisible.ts']) {
    const customer = read(path.join(root, 'sutura-app/src', file));
    for (const app of ['sutura-agent', 'merchant-app']) assert.equal(read(path.join(root, app, 'src', file)), customer, `${app}/${file}`);
  }
});
