const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(platform = 'android') {
  const effects = [], subscriptions = [], cleanup = [];
  let state;
  const react = {
    useState(initial) { state = initial; return [initial, value => { state = value; }]; },
    useRef(value) { return { current: value }; },
    useCallback(fn) { return fn; },
    useEffect(fn) { effects.push(fn); },
  };
  const native = {
    Platform: { OS: platform },
    BackHandler: { addEventListener(name, handler) {
      assert.equal(name, 'hardwareBackPress');
      const item = { handler, active: true }; subscriptions.push(item);
      return { remove() { item.active = false; } };
    } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useBackNavigation.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name === 'react' ? react : native });
  return { api: exports, get state() { return state; },
    mount() { while (effects.length) { const fn = effects.shift()(); if (fn) cleanup.push(fn); } },
    press() { return subscriptions.slice().reverse().some(item => item.active && item.handler()); },
    unmount() { cleanup.forEach(fn => fn()); },
  };
}

test('Android Back retraces visited screens and exits only when history is exhausted', () => {
  const app = harness();
  const [, navigate] = app.api.useBackNavigation('home'); app.mount();
  navigate('wallets'); navigate('activity'); navigate('profile');
  assert.equal(app.press(), true); assert.equal(app.state, 'activity');
  assert.equal(app.press(), true); assert.equal(app.state, 'wallets');
  assert.equal(app.press(), true); assert.equal(app.state, 'home');
  assert.equal(app.press(), false);
});

test('explicit back links remove forward history rather than creating navigation loops', () => {
  const app = harness();
  const [, navigate] = app.api.useBackNavigation('home'); app.mount();
  navigate('more'); navigate('settings'); navigate('more');
  assert.equal(app.press(), true); assert.equal(app.state, 'home');
  assert.equal(app.press(), false);
});

test('local form/review steps consume Back before parent navigation regardless of effect order', () => {
  const app = harness(); let reviewing = true;
  app.api.useHardwareBack(() => { if (!reviewing) return false; reviewing = false; return true; });
  const [, navigate] = app.api.useBackNavigation('home'); app.mount();
  navigate('send');
  assert.equal(app.press(), true); assert.equal(reviewing, false); assert.equal(app.state, 'send');
  assert.equal(app.press(), true); assert.equal(app.state, 'home');
});

test('authentication history reset prevents Back from reopening login after sign-in', () => {
  const app = harness();
  const [, navigate, reset] = app.api.useBackNavigation('welcome', 'home'); app.mount();
  navigate('login'); navigate(() => 'home'); reset();
  assert.equal(app.press(), false); assert.equal(app.state, 'home');
  navigate('verification'); reset();
  assert.equal(app.press(), true); assert.equal(app.state, 'home');
});

test('unmount removes native listeners and web keeps browser Back handling', () => {
  const app = harness(); const [, navigate] = app.api.useBackNavigation('home');
  app.mount(); navigate('settings'); app.unmount(); assert.equal(app.press(), false);
  const web = harness('web'); web.api.useBackNavigation('home'); web.mount();
  assert.equal(web.press(), false);
});

test('all three applications share the same navigation behavior', () => {
  const read = app => fs.readFileSync(path.join(__dirname, '../../', app, 'src/hooks/useBackNavigation.ts'), 'utf8');
  assert.equal(read('sutura-app'), read('sutura-agent'));
  assert.equal(read('sutura-app'), read('merchant-app'));
});
