const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
test('hiding wallet balances leaves transaction amounts and their accessible labels visible', () => {
  const api = {};
  const jsx = (type, props) => ({ type, props });
  const source = fs.readFileSync(path.join(__dirname, '../src/components/TransactionRow.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: api, require(name) {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-native') return { View: 'View', StyleSheet: { create: value => value } };
      if (name === '@expo/vector-icons') return { Ionicons: 'Icon' };
      if (name.endsWith('NativeControls')) return { NativePressable: 'Button', NativeText: 'Text' };
      if (name.endsWith('ThemeContext')) return { useTheme: () => ({ colors: {} }), useThemedStyles: factory => factory({}) };
      if (name.endsWith('WalletContext')) return { useWallet: () => ({ balanceHidden: true, openTransaction() {} }) };
      if (name.endsWith('Money')) return { Money: 'Money' };
      if (name.endsWith('StatusPill')) return { StatusPill: 'Status', statusLabel: value => value };
      if (name.endsWith('transactionDetails')) return { transactionTypeLabel: () => 'Sent' };
      if (name.endsWith('format')) return { formatMoney: () => 'GMD 100.00', formatTimestamp: () => 'Today' };
      if (name.endsWith('theme')) return { fonts: {}, type: {} };
      throw Error(name);
    },
  });
  const tree = api.TransactionRow({ txn: { id: '1', type: 'TRANSFER_OUT', counterparty: 'Awa', amount: 100, currency: 'GMD', status: 'COMPLETED', time: '2026-11-20' } });
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const amount = nodes(tree).find(node => node.type === 'Money');
  assert.equal(amount.props.amount, 100);
  assert.equal(amount.props.hidden, undefined);
  assert.match(tree.props.accessibilityLabel, /minus GMD 100.00/);
});
