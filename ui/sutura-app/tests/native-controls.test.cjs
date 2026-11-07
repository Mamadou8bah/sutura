const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(platform, device = false) {
  let sheet;
  const colors = { primary: '#111111', orange: '#f0a000', orangeDark: '#a05000', slate500: '#777777', border: '#dddddd' };
  const jsx = (type, props) => ({ type, props });
  const native = { Platform: { OS: platform }, PixelRatio: { getFontScale: () => 1 }, Text: 'Text', TextInput: 'TextInput', View: 'View',
    Pressable: 'Pressable', Button: 'Button', StyleSheet: { flatten: s => s, hairlineWidth: 1 },
    ActionSheetIOS: { showActionSheetWithOptions(options, onSelect) { sheet = { options, onSelect }; } } };
  function Picker() {} Picker.Item = 'PickerItem';
  const react = { forwardRef: fn => fn, createContext: value => ({ value }),
    useContext: c => c?.value, useEffect() {} };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/components/NativeControls.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return native;
    if (name === './DeviceControl') return { DeviceControl: device ? 'DeviceControl' : null, supportsButtonTint: device };
    if (name === '@react-native-picker/picker') return { Picker };
    if (name.includes('ThemeContext')) return { useTheme: () => ({ colors, mode: 'dark' }) };
    if (name === '@react-navigation/native') return { NavigationContext: { value: null } };
    throw new Error(name);
  } });
  return { api: exports, get sheet() { return sheet; } };
}

test('mobile typography uses system families and preserves weights, sizes and icon fonts', () => {
  const { api } = load('ios');
  const apple = api.platformTextStyle({ fontFamily: 'Inter_700Bold', fontSize: 24 }, 'ios');
  assert.equal(apple.fontFamily, 'System'); assert.equal(apple.fontWeight, '700'); assert.equal(apple.fontSize, 24);
  assert.equal(api.platformTextStyle({ fontFamily: 'Inter_400Regular', fontWeight: '600' }, 'android').fontWeight, '600');
  assert.equal(api.platformTextStyle({ fontFamily: 'Ionicons' }, 'ios').fontFamily, 'Ionicons');
  const original = { fontFamily: 'Inter_500Medium' };
  assert.equal(api.platformTextStyle(original, 'web'), original);
});

test('older mobile runtimes retain the fallback button and its disabled state', () => {
  const { api } = load('android'); let calls = 0;
  const tree = api.NativeButton({ label: 'Pay GMD 100', disabled: true, onPress: () => calls++ });
  assert.equal(tree.props.disabled, true);
  tree.props.onPress();
  assert.equal(calls, 0);
  assert.equal(tree.props.style({ pressed: false })[0].backgroundColor, '#f0a000');

});

test('Android selection validates values and cannot select an inactive wallet', () => {
  const { api } = load('android'); const changes = [];
  const tree = api.NativeSelect({ title: 'Wallet', value: '1', options: [
    { value: '1', label: 'Main' }, { value: '2', label: 'Frozen', enabled: false },
  ], onChange: value => changes.push(value) });
  const picker = tree.props.children[1];
  assert.equal(picker.props.mode, 'dialog');
  picker.props.onValueChange('2'); picker.props.onValueChange('unknown');
  assert.equal(changes.length, 0);
  picker.props.onValueChange('1'); assert.equal(changes[0], '1');
});

test('iOS action-sheet cancellation and disabled choices never change a wallet', () => {
  const app = load('ios'); const changes = [];
  const tree = app.api.NativeSelect({ title: 'Wallet', value: '1', options: [
    { value: '1', label: 'Main' }, { value: '2', label: 'Frozen', enabled: false },
  ], onChange: value => changes.push(value) });
  tree.props.onPress();
  assert.equal(app.sheet.options.userInterfaceStyle, 'dark');
  app.sheet.onSelect(2); app.sheet.onSelect(1); assert.equal(changes.length, 0);
  app.sheet.onSelect(0); assert.equal(changes[0], '1');
});

test('customer, agent and merchant use identical platform controls and stack adapters', () => {
  for (const filename of ['NativeTabBar.tsx', 'DeviceControl.tsx', 'NativeControls.tsx', 'NativeNavigator.tsx', 'SelectionSheet.tsx']) {
    const read = app => fs.readFileSync(path.join(__dirname, '../../', app, 'src/components', filename), 'utf8');
    assert.equal(read('sutura-app'), read('sutura-agent'));
    assert.equal(read('sutura-app'), read('merchant-app'));
  }
});

test('device buttons forward native theme and cannot invoke disabled payment actions', () => {
  for (const platform of ['android', 'ios']) {
    const { api } = load(platform, true); let calls = 0;
    const control = api.NativeButton({ label: 'Pay GMD 100', disabled: true, onPress: () => calls++ }).props.children;
    assert.equal(control.type, 'DeviceControl'); assert.equal(control.props.dark, true);
    assert.equal(control.props.buttonColor, '#f0a000');
    assert.equal(control.props.textColor, '#181a20');
    assert.equal(control.props.controlKind, 'button'); assert.equal(control.props.disabled, true);
    control.props.onAction(); assert.equal(calls, 0);
  }
});

test('device selector validates native events against active wallets and its disabled state', () => {
  const { api } = load('android', true); const changes = [];
  const props = { title: 'Wallet', value: '1', options: [
    { value: '1', label: 'Main' }, { value: '2', label: 'Frozen', enabled: false },
  ], onChange: value => changes.push(value) };
  const control = api.NativeSelect(props).props.children[1];
  for (const value of ['2', 'unknown', undefined]) control.props.onValueChange({ nativeEvent: { value } });
  assert.equal(changes.length, 0);
  control.props.onValueChange({ nativeEvent: { value: '1' } }); assert.equal(changes[0], '1');
  api.NativeSelect({ ...props, disabled: true }).props.children[1].props.onValueChange({ nativeEvent: { value: '1' } });
  assert.equal(changes.length, 1);
});

test('device switches only accept boolean changes while enabled', () => {
  const { api } = load('android', true); const changes = [];
  const props = { value: false, accessibilityLabel: 'Hide balances', onValueChange: next => changes.push(next) };
  const control = api.NativeSwitch(props);
  assert.equal(control.props.checked, false); assert.equal(control.props.label, 'Hide balances');
  control.props.onValueChange({ nativeEvent: { checked: 'true' } });
  assert.equal(changes.length, 0);
  control.props.onValueChange({ nativeEvent: { checked: true } }); assert.equal(changes[0], true);
  api.NativeSwitch({ ...props, disabled: true }).props.onValueChange({ nativeEvent: { checked: false } });
  assert.equal(changes.length, 1);
});

test('native view registration is skipped on web and on APKs without the bridge', () => {
  for (const [platform, installed] of [['web', true], ['android', false], ['ios', false], ['android', true], ['ios', true]]) {
    let registrations = 0, lookups = 0;
    const exports = {};
    const source = fs.readFileSync(path.join(__dirname, '../src/components/DeviceControl.tsx'), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    vm.runInNewContext(code, { exports, require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo') return {
        requireOptionalNativeModule() { lookups++; return installed ? {} : null; },
        requireNativeView() { registrations++; return 'FrameworkControl'; },
      };
      throw new Error(name);
    } });
    const available = platform !== 'web' && installed;
    assert.equal(exports.DeviceControl, available ? 'FrameworkControl' : null);
    assert.equal(exports.supportsNativeTabs, false); // Earlier bridges do not implement tabs.
    assert.equal(registrations, available ? 1 : 0);
    assert.equal(lookups, platform === 'web' ? 0 : 1);
  }
});


test('native tabs reject unknown, disabled and repeated navigation events', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/NativeTabBar.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  for (const available of [false, true]) {
    const exports = {};
    vm.runInNewContext(code, { exports, require(name) {
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (name === 'react-native') return { Platform: { OS: 'android' }, useWindowDimensions: () => ({ fontScale: 1 }) };
      if (name === '../context/ThemeContext') return { useTheme: () => ({ mode: 'dark' }) };
      if (name === './DeviceControl') return { supportsNativeTabs: available, DeviceControl: 'NativeTabs' };
      throw new Error(name);
    } });
    const changes = [];
    const bar = exports.NativeTabBar({ active: 'home', tabs: [
      { value: 'home', label: 'Home', icon: 'home-outline' },
      { value: 'activity', label: 'Activity', icon: 'receipt-outline' },
      { value: 'disabled', label: 'Unavailable', icon: '', enabled: false },
    ], onChange: value => changes.push(value) });
    if (!available) { assert.equal(bar, null); continue; }
    for (const value of ['home', 'disabled', 'unknown', undefined]) bar.props.onValueChange({ nativeEvent: { value } });
    assert.equal(changes.length, 0);
    bar.props.onValueChange({ nativeEvent: { value: 'activity' } });
    assert.deepEqual(changes, ['activity']);
  }
});
