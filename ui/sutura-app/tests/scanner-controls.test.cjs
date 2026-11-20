const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function harness(){
  const hooks=[],effects=[];let cursor=0,listener;const scanned=[];
  const app={currentState:'active',addEventListener:(_event,fn)=>{listener=fn;return {remove(){listener=null}}}};
  const react={
    useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>hooks[i]=typeof value==='function'?value(hooks[i]):value]},
    useRef(initial){const i=cursor++;if(!(i in hooks))hooks[i]={current:initial};return hooks[i]},
    useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,j)=>!Object.is(v,hooks[i].deps[j])))effects.push(()=>{hooks[i]?.cleanup?.();hooks[i]={deps,cleanup:fn()}})},
  };
  const exports={},jsx=(type,props)=>({type,props});
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/QrScanner.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require(name){
    if(name==='react')return react;
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(name==='react-native')return {AppState:app,View:'View',StyleSheet:{absoluteFill:{}},useWindowDimensions:()=>({height:844}),Linking:{}};
    if(name==='expo-camera')return {CameraView:'CameraView',useCameraPermissions:()=>[{granted:true},async()=>{}]};
    if(name==='./ScannerChrome')return {ScannerChrome:'ScannerChrome'};
    if(name.includes('ThemeContext'))return {useTheme:()=>({colors:{}})};
    if(name==='./NativeControls')return {NativeText:'Text',NativePressable:'Pressable'};
    if(name==='./ui')return {PrimaryButton:'Button'};
    throw Error(name);
  }});
  return {render(){cursor=0;const tree=exports.QrScanner({onCode:value=>scanned.push(value),label:'Scan'});while(effects.length)effects.shift()();return tree},
    app(state){app.currentState=state;listener?.(state)},scanned,
    unmount(){for(const hook of hooks)hook?.cleanup?.()}};
}
function find(tree,type){if(!tree)return null;if(Array.isArray(tree)){for(const item of tree){const found=find(item,type);if(found)return found;}return null}if(tree.type===type)return tree;return find(tree.props?.children,type)}
test('flashlight is off initially, gated by camera readiness and bound to the native torch',()=>{
  const h=harness();let tree=h.render();find(tree,'ScannerChrome').props.onToggle();
  assert.equal(find(h.render(),'CameraView').props.enableTorch,false);
  find(tree,'CameraView').props.onCameraReady();tree=h.render();find(tree,'ScannerChrome').props.onToggle();
  tree=h.render();assert.equal(find(tree,'CameraView').props.enableTorch,true);
  find(tree,'ScannerChrome').props.onToggle();assert.equal(find(h.render(),'CameraView').props.enableTorch,false);
});
test('backgrounding releases the camera and foregrounding resets the torch',()=>{
  const h=harness();let tree=h.render();const oldCamera=find(tree,'CameraView');oldCamera.props.onCameraReady();tree=h.render();find(tree,'ScannerChrome').props.onToggle();
  h.app('background');assert.equal(h.render(),null);h.app('active');tree=h.render();
  oldCamera.props.onCameraReady();assert.equal(find(h.render(),'ScannerChrome').props.ready,false);
  assert.equal(find(tree,'CameraView').props.enableTorch,false);
});
test('one camera session accepts one QR and immediately switches off its light',()=>{
  const h=harness();let tree=h.render();find(tree,'CameraView').props.onCameraReady();tree=h.render();find(tree,'ScannerChrome').props.onToggle();
  const camera=find(h.render(),'CameraView');camera.props.onBarcodeScanned({data:'fixture-qr'});camera.props.onBarcodeScanned({data:'duplicate'});
  assert.deepEqual(h.scanned,['fixture-qr']);assert.equal(find(h.render(),'CameraView').props.enableTorch,false);
});
test('late scan events after leaving the screen cannot submit a code',()=>{
  const h=harness();let tree=h.render();find(tree,'CameraView').props.onCameraReady();const camera=find(h.render(),'CameraView');h.unmount();
  camera.props.onBarcodeScanned({data:'late'});assert.deepEqual(h.scanned,[]);
});
test('camera errors turn the light off and stale callbacks cannot revive the failed session',()=>{
  const h=harness();let tree=h.render();find(tree,'CameraView').props.onCameraReady();tree=h.render();find(tree,'ScannerChrome').props.onToggle();
  const camera=find(h.render(),'CameraView');camera.props.onMountError();tree=h.render();
  assert.equal(find(tree,'CameraView'),null);camera.props.onCameraReady();camera.props.onBarcodeScanned({data:'stale'});
  assert.deepEqual(h.scanned,[]);find(tree,'Button').props.onPress();tree=h.render();
  assert.equal(find(tree,'CameraView').props.enableTorch,false);assert.equal(find(tree,'ScannerChrome').props.ready,false);
});
test('customer and agent scanners share the same camera and control policy',()=>{
  for(const file of ['QrScanner.tsx','ScannerChrome.tsx'])assert.equal(fs.readFileSync(path.join(__dirname,'../src/components',file),'utf8'),fs.readFileSync(path.join(__dirname,'../../sutura-agent/src/components',file),'utf8'));
});
