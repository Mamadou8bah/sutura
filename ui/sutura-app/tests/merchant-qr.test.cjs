const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
function load(file,extra={}){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,URL,Response,AbortController,setTimeout,clearTimeout,require:()=>({API_BASE:'https://test.invalid'}),...extra});return exports;}
const {parseMerchantQr}=load('../src/utils/merchantQr.ts');
test('merchant QR accepts references and payment links without trusting embedded destinations or amounts',()=>{
 for(const value of ['plink-123456abcdef','/pay/plink-123456abcdef','https://example.test/pay/plink-123456abcdef?amount=1&walletId=999','suturaapp://pay/plink-123456abcdef'])assert.equal(parseMerchantQr(value),'plink-123456abcdef');
 assert.throws(()=>parseMerchantQr('DEMO-COLLECTION'));
});
test('merchant QR rejects unrelated, executable, agent and malformed payloads',()=>{
 for(const value of ['','javascript:alert(1)','https://test.invalid/other/plink-123456abcdef','/pay/../../wallets','{"operation":"WITHDRAWAL","reference":"DEMO-1"}','plink-invalid','a'.repeat(2049)])assert.throws(()=>parseMerchantQr(value));
});
