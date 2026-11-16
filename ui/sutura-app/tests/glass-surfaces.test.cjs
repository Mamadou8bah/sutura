const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function render(platform, solid, available, throws = false) {
 let calls = 0;
 const jsx = (type, props) => ({type, props});
 const exports = {};
 const source = fs.readFileSync(path.join(__dirname,'../src/components/GlassBackdrop.tsx'),'utf8');
 const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require(name){
  if(name==='react')return {useEffect(){},useRef:()=>({current:null}),useState:()=>[solid,()=>{}]};
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='react-native')return {Platform:{OS:platform},StyleSheet:{absoluteFill:{},hairlineWidth:0.5},View:'View'};
  if(name==='expo-blur')return {BlurTargetView:'BlurTarget',BlurView:'Blur'};
  if(name==='expo-glass-effect')return {GlassView:'Glass',isGlassEffectAPIAvailable(){calls++;if(throws)throw Error('Unavailable');return available},isLiquidGlassAvailable:()=>available};
  if(name.includes('ThemeContext'))return {useTheme:()=>({mode:'light',colors:{surface:'#fff',surfaceMuted:'#eee',orange:'#f70'}})};
  throw Error(name);
 }});
 return {tree:exports.GlassBackdrop(),calls};
}
test('Reduce Transparency uses a solid surface without probing native glass',()=>{
 const {tree,calls}=render('ios',true,true);assert.equal(calls,0);assert.equal(tree.type,'View');assert.equal(tree.props.pointerEvents,'none');assert.equal(tree.props.style[1].backgroundColor,'#fff');
});
test('native glass is used only on supported iOS and a missing API falls back safely',()=>{
 assert.equal(render('ios',false,true).tree.props.children[1].type,'Glass');
 assert.equal(render('ios',false,false).tree.props.children[1].type,'Blur');
 assert.equal(render('ios',false,false,true).tree.props.children[1].type,'Blur');
});
test('Android uses bounded blur with a fallback on older devices and never calls iOS APIs',()=>{
 const {tree,calls}=render('android',false,true);assert.equal(calls,0);assert.equal(tree.props.pointerEvents,'none');const blur=tree.props.children[1];assert.equal(blur.type,'Blur');assert.equal(blur.props.blurMethod,'dimezisBlurViewSdk31Plus');assert.equal(blur.props.blurTarget,tree.props.children[0].props.ref);
});
