const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetch, timers = {}) {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/api/demo.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({ API_BASE: 'http://test.invalid' }), fetch, Response, AbortController, setTimeout, clearTimeout, ...timers });
  return exports;
}
test('wrong credentials do not enable demo', async () => {
  const demo = load(async () => new Response('{"message":"Invalid credentials"}', { status: 401 }));
  assert.equal((await demo.availabilityFetch('http://test.invalid/api/auth/login', { method: 'POST' })).status, 401);
  assert.equal(demo.isDemoMode(), false);
});
test('network failure enables demo but never reports a live write as completed', async () => {
  let calls = 0;
  const demo = load(async () => { calls++; throw new TypeError('Network request failed'); });
  await assert.rejects(demo.availabilityFetch('http://test.invalid/api/v1/transfers', { method: 'POST', body: '{"amount":50}' }), /unconfirmed/);
  assert.equal(demo.isDemoMode(), true);
  assert.equal(calls, 1);
  assert.equal((await demo.demoResponse('/api/v1/transactions').json()).length, 0);
});
test('server error stays live and does not fabricate login success', async () => {
  const demo = load(async () => new Response('', { status: 503 }));
  await assert.rejects(demo.availabilityFetch('http://test.invalid/api/auth/login', { method: 'POST' }), /unavailable/);
  assert.equal(demo.isDemoMode(), false);
});
test('startup probe treats protected but reachable server as available', async () => {
  const demo = load(async () => new Response('', { status: 401 }));
  assert.equal(await demo.serverAvailable(), true);
});
test('startup probe detects an offline server', async () => {
  const demo = load(async () => { throw new TypeError('offline'); });
  assert.equal(await demo.serverAvailable(), false);
});
test('demo payments remain local and exit discards sample changes', async () => {
  const demo = load(async () => { throw new Error('Demo must never contact server'); });
  demo.setDemoMode(true);
  const result = await (await demo.availabilityFetch('http://test.invalid/api/v1/transfers', { method: 'POST', body: '{"amount":50}' })).json();
  assert.match(result.transaction.reference, /^DEMO-/);
  assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance, 12450);
  demo.setDemoMode(false);
  demo.setDemoMode(true);
  assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance, 12500);
});
test('demo never verifies identity or resolves a real operation reference', async () => {
  const demo = load(() => {});
  assert.equal(demo.demoResponse('/api/v1/kyc/sessions', { method: 'POST' }).status, 503);
  assert.equal(demo.demoResponse('/api/v1/agent/operations/real-reference').status, 400);
});
test('demo cash settlement changes balance once', async () => {
  const demo = load(() => {});
  const cash = await demo.demoResponse('/api/v1/deposits', { method: 'POST', body: '{"amount":250,"userId":1,"paymentMethod":"agent"}' }).json();
  assert.equal(cash.status, 'AWAITING_AGENT');
  const path = `/api/v1/agent/operations/${cash.reference}/complete`;
  demo.demoResponse(path, { method: 'POST' });
  demo.demoResponse(path, { method: 'POST' });
  assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance, 12750);
});
test('in-flight live data is discarded when mode changes', async () => {
  let finish;
  const demo = load(() => new Promise((resolve) => { finish = resolve; }));
  const request = demo.availabilityFetch('http://test.invalid/api/v1/wallets');
  demo.setDemoMode(true);
  finish(new Response('[{"id":999,"name":"Real private wallet"}]'));
  await assert.rejects(request, /mode changed/);
});
test('all three apps use the same fallback implementation', () => {
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '../src/api/demo.ts'), 'utf8');
  for (const app of ['sutura-agent', 'merchant-app']) {
    assert.equal(fs.readFileSync(path.join(__dirname, `../../${app}/src/api/demo.ts`), 'utf8'), source);
  }
});
test('new demo wallets start empty and receive deposits in the correct wallet', async () => {
  const demo = load(() => { throw new Error('No network'); });
  const wallet = await demo.demoResponse('/api/v1/wallets', { method: 'POST', body: '{"name":"Savings","currency":"GMD"}' }).json();
  assert.equal((await demo.demoResponse(`/api/v1/wallets/${wallet.id}/balance`).json()).balance, 0);
  demo.demoResponse('/api/v1/deposits', { method: 'POST', body: JSON.stringify({ walletId: wallet.id, amount: 100, paymentMethod: 'mobile_money' }) });
  assert.equal((await demo.demoResponse(`/api/v1/wallets/${wallet.id}/balance`).json()).balance, 100);
  assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance, 12500);
});


test('phone transfers resolve only the demo recipient and reject unknown numbers without debiting', async () => {
  const demo = load(() => { throw new Error('No network'); });
  demo.setDemoMode(true);
  const post = phone => demo.demoResponse('/api/v1/transfers', { method: 'POST', body: JSON.stringify({sourceWalletId:1, recipientPhone:phone, amount:50}) });
  assert.equal(post('+2207000001').status, 400);
  assert.equal(post('not-a-phone').status, 400);
  assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance, 12500);
  assert.equal(post('700 0002').status, 200);
  assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance, 12450);
});

test('merchant collections validate wallet currency, preserve amount and appear in history', async()=>{
 const demo=load();demo.setDemoMode(true);
 const create=body=>demo.demoResponse('/api/v1/payment-links',{method:'POST',body:JSON.stringify(body)});
 assert.equal(create({walletId:1,amount:'25',currency:'USD',expiresDays:7}).status,400);
 assert.equal(create({walletId:1,amount:'0',currency:'GMD',expiresDays:7}).status,400);
 const result=create({walletId:1,amount:'125.5055',currency:'GMD',expiresDays:7,description:'Order 42'});assert.equal(result.status,201);
 const collection=await result.json();assert.match(collection.reference,/^plink-[a-z0-9]{12}$/);assert.equal(collection.amount,125.5055);
 assert.equal((await demo.demoResponse(`/api/v1/payment-links/ref/${collection.reference}`).json()).description,'Order 42');
 assert.equal((await demo.demoResponse('/api/v1/payment-links').json())[0].reference,collection.reference);
 assert.equal((await demo.demoResponse('/api/v1/wallets/1/balance').json()).balance,12500);
});
test('agent history records a settled operation once with completion time',async()=>{
 const demo=load();demo.setDemoMode(true);
 const operation=await demo.demoResponse('/api/v1/deposits',{method:'POST',body:JSON.stringify({userId:1,amount:'50',currency:'GMD'})}).json();
 assert.equal((await demo.demoResponse('/api/v1/agent/operations').json()).length,1);
 for(let i=0;i<2;i++)await demo.demoResponse(`/api/v1/agent/operations/${operation.reference}/complete`,{method:'POST'}).json();
 const rows=await demo.demoResponse('/api/v1/agent/operations').json();assert.equal(rows.length,1);assert.equal(rows[0].status,'COMPLETED');assert.ok(rows[0].completedAt);
});


test('demo recovers to live sign-in when the server returns', async () => {
  const demo = load(async () => new Response('{"status":"UP"}'));
  demo.setDemoMode(true);
  await demo.recoverLiveConnection();
  assert.equal(demo.isDemoMode(), false);
});

test('request deadline completes even when native fetch ignores abort', async () => {
  let expire;
  const demo = load(() => new Promise(() => {}), {
    setTimeout(fn) { expire = fn; return 1; }, clearTimeout() {},
  });
  const pending = demo.availabilityFetch('http://test.invalid/api/auth/login', { method: 'POST' });
  expire();
  await assert.rejects(pending, /unconfirmed/);
});
