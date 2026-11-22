const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const repo = path.resolve(__dirname, '../../..');
const root = path.dirname(repo);
const hasSentinel = fs.existsSync(path.join(root, 'sentinel/frontend/src/api/hostedKyc.ts'));
const source = fs.readFileSync(path.join(__dirname, '../src/api/kycWarmup.ts'), 'utf8');
function load() {
  const exports = {}; let now = 0;
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Error, SyntaxError, AbortController, Date: { now: () => now },
    setTimeout: (fn, ms) => setTimeout(() => { now += ms; fn(); }, ms === 5000 ? 0 : 20), clearTimeout,
  });
  return exports;
}
test('KYC warmup recovers transient outages without changing the returned verdict', async () => {
  const api = load(); let calls = 0, retries = 0;
  const result = await api.withKycWarmup(async () => { if (++calls < 3) throw new api.KycTemporaryError(); return { status: 'PENDING', sessionId: 7 }; }, { onRetry: () => retries++ });
  assert.equal(result.status, 'PENDING'); assert.equal(result.sessionId, 7);
  assert.equal(calls, 3); assert.equal(retries, 2);
});
test('authentication and validation failures are not retried', async () => {
  for (const message of ['Unauthorized', 'Invalid verification link', 'Forbidden']) {
    const api = load(); let calls = 0;
    await assert.rejects(api.withKycWarmup(async () => { calls++; throw new Error(message); }), new RegExp(message));
    assert.equal(calls, 1);
  }
});
test('exhausted cold-start budget returns a neutral connection state', async () => {
  const api = load(); let calls = 0;
  await assert.rejects(api.withKycWarmup(async () => { calls++; throw new api.KycTemporaryError(); }, { deadline: 10000 }), error => error instanceof api.KycConnectionPending);
  assert.equal(calls, 2);
});
test('leaving the screen cancels even an operation that ignores its abort signal', async () => {
  const api = load(), controller = new AbortController(); let calls = 0;
  const pending = api.withKycWarmup(async () => { calls++; return new Promise(() => {}); }, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /cancelled/); assert.equal(calls, 1);
});
test('already cancelled requests never start a KYC session', async () => {
  const api = load(), controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(api.withKycWarmup(async () => { calls++; }, { signal: controller.signal }), /cancelled/);
  assert.equal(calls, 0);
});
test('all KYC clients share the bounded retry policy', () => {
  for (const file of ['ui/merchant-app/src/api/kycWarmup.ts', 'ui/web/lib/kyc-warmup.ts']) {
    assert.equal(fs.readFileSync(path.join(repo, file), 'utf8'), source, file);
  }
});
function hosted(fetch) {
  const exports = {}, warmup = load();
  const source = fs.readFileSync(path.join(root, 'sentinel/frontend/src/api/hostedKyc.ts'), 'utf8')
    .replaceAll("import.meta.env.VITE_HOSTED_KYC_API_BASE_URL", "'https://fixture.invalid'")
    .replaceAll("import.meta.env.VITE_API_BASE_URL", "'https://fixture.invalid'");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { assert.equal(name, './kycWarmup'); return warmup; }, fetch, AbortController, setTimeout, clearTimeout });
  return exports;
}
test('hosted verification bypasses staff auth and demo fallback during a cold start', { skip: !hasSentinel }, async () => {
  let calls = 0;
  const api = hosted(async (url, options) => {
    assert.equal(url, 'https://fixture.invalid/api/kyc/hosted/fixture%2Ftoken');
    assert.equal(options.headers.Authorization, undefined);
    return ++calls === 1 ? new Response('', { status: 503 }) : Response.json({ status: 'PENDING' });
  });
  assert.equal((await api.loadHostedKyc('fixture/token')).status, 'PENDING');
  assert.equal(calls, 2);
});
test('unavailable evidence submission is sent once and never fabricated as successful', { skip: !hasSentinel }, async () => {
  const methods = [];
  const api = hosted(async (url, options) => {
    const method = options.method || 'GET';
    methods.push(method);
    return method === 'POST' ? new Response('', { status: 503 }) : Response.json({ status: 'PENDING' });
  });
  await assert.rejects(api.submitHostedKyc('fixture', { fullName: 'Fixture' }), /temporarily unavailable/);
  assert.deepEqual(methods, ['POST', 'GET']);
});
