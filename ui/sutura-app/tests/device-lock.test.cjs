const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');

function harness({ enabled = true, storageAvailable = true, storageError = false } = {}) {
  const slots = []; let cursor = 0, dirty = true, tree, now = 1000, unlocked, reads = 0, signsOut = 0;
  const effects = [], listeners = new Set();
  const record = enabled ? { failures: 0, blockedUntil: 0, biometricHash: null } : null;
  const props = { scope: 'customer:a', children: 'Private account content', onSignOut: async () => { signsOut++; } };
  const depsChanged = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) { const index = cursor++; if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[index].value, value => { const next = typeof value === 'function' ? value(slots[index].value) : value; if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; } }]; },
    useRef(initial) { const index = cursor++; if (!slots[index]) slots[index] = { current: initial }; return slots[index]; },
    useCallback(fn, deps) { const index = cursor++; if (!slots[index] || depsChanged(slots[index].deps, deps)) slots[index] = { fn, deps }; return slots[index].fn; },
    useEffect(fn, deps) { const index = cursor++; const previous = slots[index]; if (!previous || depsChanged(previous.deps, deps)) { const slot = { deps, fn, cleanup: previous?.cleanup }; slots[index] = slot; effects.push(slot); } },
  };
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/context/DeviceLockContext.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Date: { now: () => now }, require(name) {
    if (name.endsWith('KeyboardScrollView')) return { KeyboardScrollView: 'ScrollView' };
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { AppState: { currentState: 'active', addEventListener: (_, cb) => { listeners.add(cb); return { remove: () => listeners.delete(cb) }; } }, Platform: { OS: 'android' }, View: 'View', ScrollView: 'ScrollView', ActivityIndicator: 'Spinner' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeArea' };
    if (name === '@expo/vector-icons') return { Ionicons: 'Icon' };
    if (name.endsWith('NativeControls')) return { NativeButton: 'Button', NativeInput: 'Input', NativePressable: 'Pressable', NativeText: 'Text' };
    if (name.endsWith('ThemeContext')) return { useTheme: () => ({ colors: {} }) };
    if (name.endsWith('deviceVault')) return { nativeVaultAvailable: async () => storageAvailable };
    if (name.endsWith('deviceAccess')) return { setDeviceUnlocked: value => unlocked = value };
    if (name.endsWith('localSecurity')) return {
      readLock: async scope => { reads++; if (storageError) throw Error('keychain unavailable'); return scope === 'customer:a' ? record : null; }, biometricAvailable: async () => false,
      verifyPin: async (_, pin) => { if (pin !== '294618') throw Error('Incorrect PIN'); return record; },
    };
    if (name.endsWith('theme')) return { fonts: {} };
    throw Error(name);
  } });
  function render() { cursor = 0; dirty = false; tree = exports.DeviceLockProvider(props); while (effects.length) { const e = effects.shift(); e.cleanup?.(); e.cleanup = e.fn(); } }
  async function flush() { for (let i = 0; i < 12; i++) { if (dirty) render(); await new Promise(resolve => setImmediate(resolve)); if (!dirty) break; } }
  function nodes(node) { if (!node || typeof node !== 'object') return []; const children = [node.props?.children].flat(Infinity); return [node, ...children.flatMap(nodes)]; }
  return { props, flush, get tree() { return tree; }, get unlocked() { return unlocked; }, get reads() { return reads; }, get signsOut() { return signsOut; },
    input: () => nodes(tree).find(n => n.type === 'Input'),
    button: label => nodes(tree).find(n => n.type === 'Button' && n.props.label === label),
    pressable: label => nodes(tree).find(n => n.type === 'Pressable' && n.props.accessibilityLabel === label),
    hasContent: () => nodes(tree).some(n => n.type === 'View' && n.props.children === props.children && n.props.style.display === 'flex'),
    state: async (state, time) => { now = time; listeners.forEach(cb => cb(state)); await flush(); },
    rerender: async () => { dirty = true; await flush(); },
  };
}

test('saved PIN blocks account mounting until successful local unlock; failed PIN never exposes content', async () => {
  const app = harness(); await app.flush(); assert.equal(app.hasContent(), false); assert.equal(app.unlocked, false);
  assert.equal(app.input().props.secureTextEntry, true); assert.equal(app.input().props.maxLength, 6);
  app.input().props.onChangeText('846291'); await app.flush(); app.button('Unlock').props.onPress(); await app.flush();
  assert.equal(app.hasContent(), false); assert.equal(app.input().props.value, '');
  app.input().props.onChangeText('294618'); await app.flush(); app.button('Unlock').props.onPress(); await app.flush();
  assert.equal(app.hasContent(), true); assert.equal(app.unlocked, true);
});
test('backgrounding conceals content immediately, short returns resume, and thirty seconds away requires PIN again', async () => {
  const app = harness(); await app.flush(); app.input().props.onChangeText('294618'); await app.flush(); app.button('Unlock').props.onPress(); await app.flush();
  await app.state('inactive', 2000); assert.equal(app.hasContent(), false); assert.equal(app.unlocked, false);
  await app.state('active', 3000); assert.equal(app.hasContent(), true);
  await app.state('background', 4000); await app.state('active', 34001); assert.equal(app.hasContent(), false); assert.equal(app.unlocked, false);
  app.pressable('Sign in with password instead').props.onPress(); await app.flush(); assert.equal(app.signsOut, 1);
});
test('session re-renders do not relock an unlocked account; a different account gets separate checks', async () => {
  const app = harness({ enabled: false }); await app.flush(); assert.equal(app.hasContent(), true); const reads = app.reads;
  await app.rerender(); assert.equal(app.reads, reads); assert.equal(app.hasContent(), true);
  app.props.scope = 'customer:b'; app.props.children = 'Other account content'; await app.rerender(); assert.equal(app.reads, reads + 1); assert.equal(app.hasContent(), true);
});
test('unavailable or unreadable native secure storage fails closed and offers password sign-in', async () => {
  for (const config of [{ storageAvailable: false }, { storageError: true }]) {
    const app = harness(config); await app.flush(); assert.equal(app.hasContent(), false); assert.equal(app.unlocked, false); assert(app.button('Try again')); assert(app.pressable('Sign in with password instead'));
  }
});
