const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/transferActivity.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api });
const transaction = (changes = {}) => ({ id: 1, reference: 'request-a', type: 'TRANSFER', sourceWalletId: 8,
  amount: 100, currency: 'GMD', description: 'Transfer to Awa', status: 'PENDING', createdAt: '2026-11-21T10:00:00Z', ...changes });

test('incoming transfers identify the sender rather than reusing the senders description', () => {
  const tx = transaction({ destinationWalletId: 9, sourceName: 'Mamadou Bah', destinationName: 'Awa Jallow' });
  assert.equal(api.toActivity(tx, [9]).counterparty, 'Mamadou Bah');
  assert.equal(api.toActivity(tx, [9]).type, 'TRANSFER_IN');
  assert.equal(api.toActivity(tx, [8]).counterparty, 'Awa Jallow');
  assert.equal(api.toActivity(tx, [8]).type, 'TRANSFER_OUT');
});

test('accepted pending transfer is processing, never shown as completed or under review without a review verdict', () => {
  assert.equal(api.toActivity(transaction(), [8]).status, 'PROCESSING');
  assert.equal(api.toActivity(transaction({ sentinelRecommendation: 'review' }), [8]).status, 'UNDER_REVIEW');
  assert.equal(api.toActivity(transaction({ status: 'FAILED', failureReason: 'Scoring unavailable' }), [8]).failureReason, 'Scoring unavailable');
});
test('server response identifies transfer direction using ownership, not presence of a source wallet', () => {
  assert.equal(api.toActivity(transaction(), [8]).type, 'TRANSFER_OUT');
  assert.equal(api.toActivity(transaction(), [9]).type, 'TRANSFER_IN');
});
test('read reconciliation retains uncertain requests and resolves only the exact reference', () => {
  const intent = { ...api.toActivity(transaction(), [8]), id: 'request-a', status: 'UNKNOWN', submissionState: 'uncertain' };
  const unrelated = api.toActivity(transaction({ id: 2, reference: 'request-b', status: 'COMPLETED' }), [8]);
  const waiting = api.reconcileTransfers([unrelated], [intent]);
  assert.equal(waiting.transactions.length, 2);
  assert.equal(waiting.unresolved[0].status, 'UNKNOWN');
  const resolved = api.reconcileTransfers([api.toActivity(transaction({ status: 'COMPLETED' }), [8])], [intent]);
  assert.equal(resolved.unresolved.length, 0);
  assert.equal(resolved.transactions.length, 1);
  assert.equal(resolved.transactions[0].status, 'COMPLETED');
});
test('processing, review and unknown count as pending; completed and failed do not', () => {
  assert.equal(api.pendingTransfers(['PROCESSING','UNKNOWN','UNDER_REVIEW','FAILED','COMPLETED'].map(status => ({status}))), 3);
  assert.match(api.transferStatusMessage({status:'UNKNOWN'}), /before sending again/);
  assert.match(api.transferStatusMessage({status:'UNDER_REVIEW'}), /No money has been sent/);
});

test('restart preserves uncertainty over stale cached Processing but keeps a confirmed terminal outcome', () => {
  const cached = api.toActivity(transaction(), [8]);
  const uncertain = { ...cached, id: cached.reference, status: 'UNKNOWN', submissionState: 'uncertain' };
  assert.equal(api.restoreTransferActivity([cached], [uncertain])[0].status, 'UNKNOWN');
  assert.equal(api.restoreTransferActivity([{...cached,status:'COMPLETED'}], [uncertain])[0].status, 'COMPLETED');
});
