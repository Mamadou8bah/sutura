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
  const api = load('../src/api/sessionAuth.ts', name => name === '../storage/deviceAccess' ? {deviceIsUnlocked:()=>true} : name === './config' ? { API_BASE: 'https://test.invalid' } : {
    availabilityFetch: async url => { if (url.endsWith('/refresh')) throw new Error('offline'); return new Response('', { status: 401 }); },
  });
  api.bindTokenSession({ getSession: () => session, updateSession: async () => {}, clearSession: async () => { cleared++; } });
  await assert.rejects(api.authFetch('/wallets'), /offline/);
  assert.equal(cleared, 0);
});

test('refresh service outages and malformed responses keep the session; only rejected credentials clear it', async () => {
  for (const [status, body, expires] of [[503, '{}', false], [200, '<html>upstream error</html>', false], [200, '{"success":false}', false], [401, '{}', true], [403, '{}', true]]) {
    let cleared = 0; const session = { accessToken: 'access', refreshToken: 'refresh' };
    const api = load('../src/api/sessionAuth.ts', name => name === '../storage/deviceAccess' ? { deviceIsUnlocked: () => true } : name === './config' ? { API_BASE: 'https://test.invalid' } : { availabilityFetch: async url => new Response(url.endsWith('/refresh') ? body : '', { status: url.endsWith('/refresh') ? status : 401 }) });
    api.bindTokenSession({ getSession: () => session, updateSession: async () => {}, clearSession: async () => { cleared++; } });
    await assert.rejects(api.authFetch('/wallets'));
    assert.equal(cleared, expires ? 1 : 0, `refresh status ${status}`);
  }
});

test('parallel unauthorized reads share one refresh, and an account switch cannot inherit an old refresh', async () => {
  let session = { accessToken: 'old-access', refreshToken: 'old-refresh' }, refreshes = 0;
  let release; const response = new Promise(resolve => release = resolve);
  const api = load('../src/api/sessionAuth.ts', name => name === '../storage/deviceAccess' ? { deviceIsUnlocked: () => true } : name === './config' ? { API_BASE: 'https://test.invalid' } : { availabilityFetch: async (url, init) => {
    if (url.endsWith('/refresh')) { refreshes++; return response; }
    return new Response('[]', { status: init.headers.Authorization === 'Bearer fresh-access' ? 200 : 401 });
  } });
  let cleared = 0; api.bindTokenSession({ getSession: () => session, updateSession: async value => session = value, clearSession: async () => { cleared++; } });
  const first = api.authFetch('/wallets'), second = api.authFetch('/transactions');
  await new Promise(resolve => setImmediate(resolve)); assert.equal(refreshes, 1);
  session = { accessToken: 'other-access', refreshToken: 'other-refresh' };
  release(new Response('{"success":true,"data":{"accessToken":"fresh-access","refreshToken":"fresh-refresh"}}'));
  await assert.rejects(first, /Account changed/); await assert.rejects(second, /Account changed/);
  assert.equal(session.accessToken, 'other-access'); assert.equal(cleared, 0);
});

test('locked devices cannot start writes, and refresh success retains account metadata', async () => {
  let unlocked = false, calls = 0; let session = { accessToken: 'old', refreshToken: 'refresh', firstName: 'Kept', role: 'USER' };
  const api = load('../src/api/sessionAuth.ts', name => name === '../storage/deviceAccess' ? { deviceIsUnlocked: () => unlocked } : name === './config' ? { API_BASE: 'https://test.invalid' } : { availabilityFetch: async (url, init) => {
    calls++; if (url.endsWith('/refresh')) return new Response('{"success":true,"data":{"accessToken":"new","refreshToken":"rotated"}}');
    return new Response('[]', { status: init.headers.Authorization === 'Bearer new' ? 200 : 401 });
  } });
  api.bindTokenSession({ getSession: () => session, updateSession: async value => session = value, clearSession: async () => assert.fail('No logout expected') });
  await assert.rejects(api.authFetch('/transfers', { method: 'POST' }), /Unlock/); assert.equal(calls, 0);
  unlocked = true; assert.equal((await api.authFetch('/wallets')).status, 200);
  assert.equal(session.firstName, 'Kept'); assert.equal(session.role, 'USER'); assert.equal(session.refreshToken, 'rotated');
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
