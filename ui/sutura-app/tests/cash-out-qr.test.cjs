const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function load(file, dependencies=()=>({})) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:dependencies,Date,Error,Response});
  return exports;
}
const parser=load('../../sutura-agent/src/utils/agentQr.ts');
const fresh=()=>({app:'sutura',v:2,operation:'WITHDRAWAL',reference:'wd_fixture',token:'A'.repeat(43),expiresAt:new Date(Date.now()+30000).toISOString(),amount:'100',currency:'GMD'});
test('cash-out scanner refuses legacy references, expired QR and missing capabilities',()=>{
  for(const invalid of [{...fresh(),v:1},{...fresh(),token:undefined},{...fresh(),token:'forged'},{...fresh(),expiresAt:new Date(Date.now()-1000).toISOString()}])
    assert.equal(parser.parseAgentQr(JSON.stringify(invalid)),null);
  assert.equal(parser.parseAgentQr('wd_fixture'),null);
});
test('scanner retains a fresh capability for server validation',()=>{
  const parsed=parser.parseAgentQr(JSON.stringify(fresh()));
  assert.equal(parsed.token,'A'.repeat(43)); assert.equal(parsed.reference,'wd_fixture');
});
test('phone cash-out never sends a financial request; scanning and completion send separate capabilities',async()=>{
  const calls=[];
  const api=load('../../sutura-agent/src/api/client.ts',name=>name==='./sessionAuth'?{
    authFetch:async(url,init)=>{calls.push({url,...init});return Response.json({});},
    readAuthJson:r=>r.json(),
  }:name==='./config'?{API_BASE:'https://fixture.invalid'}:{}).agentApi;
  await assert.rejects(api.createCash('WITHDRAWAL',5,'100','GMD','fixture'),/Phone cash-out/);
  assert.equal(calls.length,0);
  await api.scanCashOut('wd_fixture','QR_CAPABILITY');
  await api.complete('wd_fixture','AGENT_APPROVAL');
  assert.equal(JSON.parse(calls[0].body).token,'QR_CAPABILITY');
  assert.equal(JSON.parse(calls[1].body).token,'AGENT_APPROVAL');
  assert.match(calls[0].url,/\/scan$/); assert.match(calls[1].url,/\/complete$/);
});
