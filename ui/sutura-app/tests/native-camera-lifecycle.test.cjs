const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function render(relative, focused) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const colors = { primary: '#111', surfaceMuted: '#eee', slate700: '#333' };
  const source = fs.readFileSync(path.join(__dirname, relative), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === '@react-navigation/native') return { useIsFocused: () => focused };
    if (name === 'react') return { useState: initial => [initial, () => {}] };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'expo-camera') return { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] };
    if (name === 'react-native') return { View: 'View', Linking: {}, StyleSheet: { create: value => value } };
    if (name.includes('ThemeContext')) return { useTheme: () => ({ colors }), useThemedStyles: fn => fn(colors) };
    if (name === './NativeControls') return { NativeText: 'Text', NativePressable: 'Pressable' };
    if (name === './ui') return { PrimaryButton: 'Button' };
    if (name === '../theme') return { colors };
    throw new Error(name);
  } });
  return exports.default({ onCode() {}, onManual() {} });
}

for (const [name, relative] of [
  ['customer', '../src/components/MerchantScanner.native.tsx'],
  ['agent', '../../sutura-agent/src/components/NativeCamera.tsx'],
]) {
  test(`${name} unmounts camera preview while its native screen is unfocused`, () => {
    assert.equal(render(relative, false), null);
    assert.notEqual(render(relative, true), null);
  });
}
