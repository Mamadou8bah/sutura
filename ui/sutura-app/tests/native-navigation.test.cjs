const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(platform, initialRoutes) {
  let current = initialRoutes.at(-1), cursor = 0;
  const actions = [], effects = [], refs = [];
  const navigation = {
    isReady: () => true, getCurrentRoute: () => ({ name: current }),
    getRootState: () => ({ routes: initialRoutes.map(name => ({ name })) }),
    navigate(name) { actions.push(['navigate', name]); current = name; },
    dispatch(action) { actions.push(['popTo', action.name]); current = action.name; },
  };
  const react = { useRef(value) { return refs[cursor++] ?? (refs[cursor - 1] = { current: value }); },
    useEffect(fn) { effects.push(fn); } };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/components/NativeNavigator.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === './NativeControls') return { NativeHeaderContext: { Provider: 'HeaderProvider' } };
    if (name === '@react-navigation/native-stack') return {
      createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }),
    };
    if (name === '@react-navigation/native') return {
      NavigationContainer: 'NavigationContainer', createNavigationContainerRef: () => navigation,
      StackActions: { popTo: name => ({ name }) }, DefaultTheme: { colors: {} }, DarkTheme: { colors: {} },
    };
    if (name.includes('ThemeContext')) return { useTheme: () => ({ colors: {}, mode: 'light' }) };
    throw new Error(name);
  } });
  return { actions,
    render(props) { cursor = 0; return exports.NativeNavigator({ screens: ['home', 'wallets', 'settings'],
      renderScreen: screen => screen, onChange() {}, ...props }); },
    flush() { while (effects.length) effects.shift()(); },
    nativeBack(name) { current = name; },
  };
}

test('new context route pushes a native screen without feeding the same route back into context', () => {
  const app = harness('android', ['home']); const changes = [];
  const tree = app.render({ screen: 'wallets', onChange: name => changes.push(name) }); app.flush();
  assert.equal(app.actions[0][0], 'navigate'); assert.equal(app.actions[0][1], 'wallets');
  tree.props.onStateChange(); assert.equal(changes.length, 0);
});

test('back to an existing route pops the native stack instead of adding duplicate screens', () => {
  const app = harness('ios', ['home', 'wallets', 'settings']);
  app.render({ screen: 'wallets' }); app.flush();
  assert.equal(app.actions[0][0], 'popTo'); assert.equal(app.actions[0][1], 'wallets');
});

test('a native iOS back gesture updates the shared route', () => {
  const app = harness('ios', ['home', 'wallets']); const changes = [];
  const tree = app.render({ screen: 'wallets', onChange: name => changes.push(name) }); app.flush();
  app.nativeBack('home'); tree.props.onStateChange(); assert.equal(changes[0], 'home');
});

test('callbacks from a previous authenticated scope cannot change the new account route', () => {
  const app = harness('ios', ['home']); const changes = [];
  const old = app.render({ screen: 'wallets', scope: 'previous-account', onChange: name => changes.push(name) });
  app.render({ screen: 'home', scope: 'current-account' });
  app.nativeBack('settings'); old.props.onStateChange(); assert.equal(changes.length, 0);
});

test('web keeps its current screen renderer without native stack actions', () => {
  const app = harness('web', ['home']);
  const tree = app.render({ screen: 'wallets' }); app.flush();
  assert.equal(tree.props.children, 'wallets'); assert.equal(app.actions.length, 0);
});
