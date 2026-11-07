const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: dependencies, Response, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const transport = fetch => load('../src/api/transport.ts', () => ({}), { fetch });

test('failed live writes are never replayed or replaced by sample results', async () => {
  let calls = 0;
  const api = transport(async () => { calls++; throw new Error('offline'); });
  for (let i = 0; i < 2; i++) await assert.rejects(api.availabilityFetch('https://test.invalid/transfers', { method: 'POST' }), /Could not confirm/);
  assert.equal(calls, 2);
});
test('read failures are recoverable and subsequent requests still contact the backend', async () => {
  let calls = 0;
  const api = transport(async () => { if (++calls === 1) throw new Error('offline'); return new Response('[]'); });
  await assert.rejects(api.availabilityFetch('https://test.invalid/wallets'), /Unable to connect/);
  assert.equal(await (await api.availabilityFetch('https://test.invalid/wallets')).text(), '[]');
});
test('authentication failures remain failures and server errors cannot fabricate success', async () => {
  assert.equal((await transport(async () => new Response('', { status: 401 })).availabilityFetch('https://test.invalid/login')).status, 401);
  await assert.rejects(transport(async () => new Response('', { status: 503 })).availabilityFetch('https://test.invalid/pay'), /temporarily unavailable/);
});
test('refresh network failures preserve the current authenticated session', async () => {
  let cleared = 0;
  const session = { accessToken: 'live-token', refreshToken: 'live-refresh' };
  const api = load('../src/api/sessionAuth.ts', name => name === './config' ? { API_BASE: 'https://test.invalid' } : {
    availabilityFetch: async url => { if (url.endsWith('/refresh')) throw new Error('offline'); return new Response('', { status: 401 }); },
  });
  api.bindTokenSession({ getSession: () => session, updateSession: async () => {}, clearSession: async () => { cleared++; } });
  await assert.rejects(api.authFetch('/wallets'), /offline/);
  assert.equal(cleared, 0);
});
test('all mobile apps use the same live transport implementation', () => {
  for (const file of ['transport.ts']) {
    const read = app => fs.readFileSync(path.join(__dirname, '../../', app, 'src/api', file), 'utf8');
    assert.equal(read('sutura-app'), read('sutura-agent'));
    assert.equal(read('sutura-app'), read('merchant-app'));
  }
});
test('web preview sessions cannot authenticate even in development with the old flag enabled', () => {
  let removed = false;
  const api = load('../../web/lib/demo-auth.ts', () => ({}), {
    process: { env: { NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_DEMO_AUTH: 'true' } },
    window: { localStorage: { removeItem() { removed = true; } } },
  });
  assert.equal(api.DEMO_AUTH_ENABLED, false);
  assert.equal(api.getDemoSession(), null);
  assert.equal(removed, true);
});
