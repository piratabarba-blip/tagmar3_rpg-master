import assert from 'node:assert/strict';
globalThis.FormApplication = class {};
let properties = {};
globalThis.game = {settings: {get: (_id, key) => key === 'tesourosPropriedades' ? properties : {}}};
const warnings = [];
globalThis.ui = {notifications: {warn: message => warnings.push(message)}};
globalThis.document = {createElement: () => ({textContent: '', get innerHTML() {return this.textContent.replaceAll('&', '&amp;').replaceAll('<', '&lt;');}})};
globalThis.Roll = class {
  constructor(formula) {this.formula = formula;}
  async evaluate() {const [, n, die, multiplier] = this.formula.match(/(\d+)d(\d+)(?: \* (\d+))?/); this.total = Number(n) * Number(die) * Number(multiplier || 1); return this;}
};
const {TesourosTagmarApp} = await import('../modules/tesourosTagmar.js');
const catalog = {weapons: [{realm:'reinos',item:{name:'Espada'}}], defenses:[{realm:'reinos',item:{name:'Elmo'}}], origins:[], magics:[]};
const options = {generationMode:'specific', treasureType:5, itemCount:3, itemKind:'ring', magicMode:'none', includeMoney:true};
const app = new TesourosTagmarApp();
app._loadCatalog = async () => {throw Error('Coins must not load item catalog');};
assert.equal(await app._generateWithOptions({...options,treasureMode:'coins',magicCount:99,itemKind:'pool',itemPool:[],moneyMoBonus:7},{render:false}),true);
assert.equal(app._preview.length,1);
assert.equal(app._preview[0].kind,'money');
assert.equal(app._preview[0].money.mo,37);
assert.equal(app._lastRoll.moneyOnly,true);
app._loadCatalog = async () => catalog;
for (const itemKind of ['weapon','defense','ring','staff']) {
  const input = {...options,treasureMode:'mundane',itemKind,magicCount:99,magicBonus:20,focus:90,uses:8,includeCurse:true,includeHistory:true,mundaneQuality:'Boa fabricação'};
  const before = structuredClone(input);
  assert.equal(await app._generateWithOptions(input,{render:false}),true);
  assert.deepEqual(input,before);
  assert.equal(app._preview.length,3);
  for (const item of app._preview) {
    assert.equal(item.bonus + item.focus + item.resistance + item.absorption,0);
    assert.equal(item.magics.length,0);
    assert.equal(item.curse,null);
    assert.equal(item.lore,null);
    assert.doesNotMatch(item.description,/Integridade mágica|Matrizes de poder/);
    assert.match(item.description,/Boa fabricação/);
  }
}
assert.equal(await app._generateWithOptions({...options,treasureMode:'mundane',itemKind:'pool',itemPool:['potion|||Poção','ring|||Anel']},{render:false}),true);
assert.ok(app._preview.every(item=>item.kind==='ring'));
for (const itemKind of ['weapon','defense','ring','staff']) {
  assert.equal(await app._generateWithOptions({...options,itemKind,treasureMode:'magical'},{render:false}),true);
  assert.equal(app._preview.length,3);
  assert.ok(app._preview.every(item=>item.bonus||item.focus||item.resistance||item.absorption||item.magics.length));
}
const previous = app._preview;
properties = {bonus:false,focus:false,resistencia:false,absorcao:false,magia:false};
assert.equal(await app._generateWithOptions({...options,treasureMode:'magical'},{render:false}),undefined);
assert.equal(app._preview,previous);
properties = {};
assert.equal(await app._generateWithOptions({...options,treasureMode:'mixed'},{render:false}),true);
assert.equal(app._preview.length,4);
assert.equal(app._preview.at(-1).kind,'money');
assert.equal(app._preview[0].resistance,0);
catalog.magics = [{key:'light',name:'Luz',levels:[1,3,5],origins:[],realms:['reinos'],traditions:[],repertoires:['core']}];
assert.equal(await app._generateWithOptions({...options,treasureMode:'magical',magicMode:'yes',magicCount:1},{render:false}),true);
assert.ok(app._preview.every(item=>item.magics.length===1));
console.log('PASS: coins, mundane, magical, mixed; filters, nonmutation, fallback and transactional failure.');
