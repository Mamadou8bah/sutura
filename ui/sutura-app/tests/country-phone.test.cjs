const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const countries=require('../src/data/phoneCountries.json');
const exportsObject={};
new Function('exports','require',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/utils/countryPhone.ts'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022},
}).outputText)(exportsObject,id=>id.includes('phoneCountries.json')?countries:require(id));
const phone=exportsObject;

test('country-aware drafts handle local numbers, trunk prefixes and international paste',()=>{
  assert.equal(phone.internationalPhoneDraft('328 1914','GM'),'+2203281914');
  assert.equal(phone.internationalPhoneDraft('020 7946 0018','GB'),'+442079460018');
  assert.equal(phone.internationalPhoneDraft('07700 900123','GB'),'+447700900123');
  assert.equal(phone.internationalPhoneDraft('00 44 20 7946 0018','GM'),'+442079460018');
  assert.equal(phone.internationalPhoneDraft('+221 77 123 45 67','GM'),'+221771234567');
  assert.equal(phone.internationalPhoneDraft('','GM'),'');
});

test('submit validation rejects partial, unknown, extended and unqualified numbers',()=>{
  for(const invalid of ['', '3281914', '+220123', '+999123456789', '+442079460018 ext 123','Call +2203281914'])
    assert.equal(phone.normalizeCountryPhone(invalid),null,invalid);
  assert.equal(phone.normalizeCountryPhone('+2203281914'),'+2203281914');
  assert.equal(phone.normalizeCountryPhone('+44 20 7946 0018'),'+442079460018');
});

test('pasted international numbers infer the country including shared calling codes',()=>{
  assert.equal(phone.countryForPhone('+221771234567').iso,'SN');
  assert.equal(phone.countryForPhone('+442079460018').iso,'GB');
  assert.equal(phone.countryForPhone('+14165551234').iso,'CA');
  assert.equal(phone.countryForPhone('+12025550123').iso,'US');
  assert.equal(phone.countryForPhone('').iso,'GM');
  assert.equal(phone.countryForPhone('+1').iso,'US');
});

test('country search supports names, codes and calling codes without hiding merchant restrictions',()=>{
  assert(phone.searchPhoneCountries('gambia').some(c=>c.iso==='GM'));
  assert(phone.searchPhoneCountries('+44').some(c=>c.iso==='GB'));
  assert.equal(phone.searchPhoneCountries('nonexistent country').length,0);
  assert.equal(phone.searchPhoneCountries('United Kingdom',['GM']).length,0);
  assert.equal(phone.searchPhoneCountries('',['GM']).length,1);
  assert(phone.searchPhoneCountries('').length>200);
});

test('all apps ship the same country metadata and number parsing rules',()=>{
  for(const app of ['sutura-agent','merchant-app']){
    for(const file of ['utils/countryPhone.ts','data/phoneCountries.json','components/CountryPhoneInput.tsx']){
      assert.equal(fs.readFileSync(path.join(__dirname,'../src',file),'utf8').replace(/\r\n/g,'\n'),
        fs.readFileSync(path.join(__dirname,'../../',app,'src',file),'utf8').replace(/\r\n/g,'\n'));
    }
  }
});
