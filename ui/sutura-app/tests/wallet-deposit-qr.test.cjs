const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const subject={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/utils/walletDepositQr.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(subject);

test('home deposit QR carries only the wallet identifier and round-trips',()=>{
 const raw=subject.encodeWalletDepositQr(7);const parsed=subject.parseWalletDepositQr(raw);
 assert.deepEqual(parsed,{app:'sutura',v:1,type:'wallet-deposit',walletId:7});
 assert.deepEqual(Object.keys(JSON.parse(raw)).sort(),['app','type','v','walletId']);
});
test('invalid, withdrawal, foreign and unsupported QR codes cannot become deposit wallets',()=>{
 for(const raw of ['', 'not json', 'x'.repeat(513), '{"app":"sutura","v":1,"operation":"WITHDRAWAL","reference":"wd-1"}',
  ...[-1,0,1.5,'7',Number.MAX_SAFE_INTEGER+1].map(walletId=>JSON.stringify({app:'sutura',v:1,type:'wallet-deposit',walletId})),
  JSON.stringify({app:'other',v:1,type:'wallet-deposit',walletId:7}),JSON.stringify({app:'sutura',v:2,type:'wallet-deposit',walletId:7})])assert.equal(subject.parseWalletDepositQr(raw),null);
 for(const id of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>subject.encodeWalletDepositQr(id));
});
test('a scanned wallet cannot supply an amount, customer identity, currency or withdrawal instruction',()=>{
 const parsed=subject.parseWalletDepositQr(JSON.stringify({app:'sutura',v:1,type:'wallet-deposit',walletId:7,amount:999999,currency:'USD',phone:'+2200000000',operation:'WITHDRAWAL',userId:999}));
 assert.deepEqual(parsed,{app:'sutura',v:1,type:'wallet-deposit',walletId:7});
});
test('agent and customer agree on the deposit-only QR contract',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../src/utils/walletDepositQr.ts'),'utf8').replace(/\r\n/g,'\n'),fs.readFileSync(path.join(__dirname,'../../sutura-agent/src/utils/walletDepositQr.ts'),'utf8').replace(/\r\n/g,'\n'));
});
