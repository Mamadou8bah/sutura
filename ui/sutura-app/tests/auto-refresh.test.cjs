const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
test('automatic refresh pauses in background, serializes reads and removes listeners',async()=>{
 let deviceUnlocked=true;
 const listeners={};let timer,cleanup;const state={currentState:'active',addEventListener:(_,fn)=>{listeners.app=fn;return {remove:()=>delete listeners.app};}};
 const document={visibilityState:'visible',addEventListener:(n,fn)=>listeners[n]=fn,removeEventListener:n=>delete listeners[n]};
 const window={addEventListener:(n,fn)=>listeners[n]=fn,removeEventListener:n=>delete listeners[n]};
 const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/hooks/useAutoRefresh.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>n==='../storage/deviceAccess'?{deviceIsUnlocked:()=>deviceUnlocked,subscribeDeviceUnlock:fn=>{listeners.unlock=fn;return()=>delete listeners.unlock;}}:n==='react'?{useEffect:fn=>cleanup=fn(),useRef:v=>({current:v})}:{AppState:state,Platform:{OS:'web'}},document,window,setInterval:fn=>{timer=fn;return 1;},clearInterval:()=>timer=null});
 let calls=0,release;exports.useAutoRefresh(()=>{calls++;return new Promise(resolve=>release=resolve);},true);
 timer();timer();assert.equal(calls,1);release();await new Promise(resolve=>setImmediate(resolve));
 document.visibilityState='hidden';timer();assert.equal(calls,1);
 document.visibilityState='visible';listeners.focus();assert.equal(calls,2);release();await new Promise(resolve=>setImmediate(resolve));
 deviceUnlocked=false;timer();assert.equal(calls,2);deviceUnlocked=true;
 state.currentState='background';timer();assert.equal(calls,2);
 state.currentState='active';listeners.app('active');assert.equal(calls,3);release();cleanup();assert.equal(timer,null);assert.deepEqual(Object.keys(listeners),[]);
});
