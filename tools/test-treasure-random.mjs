import assert from 'node:assert/strict';
globalThis.FormApplication = class {};
let properties = {};
globalThis.game = {settings:{get:(_id,key)=>key==='tesourosPropriedades'?properties:{}}};
const warnings=[];
globalThis.ui={notifications:{warn:m=>warnings.push(m)}};
globalThis.document={createElement:()=>({textContent:'',content:{textContent:''},get innerHTML(){return this.textContent;}})};
let quantity=20, spellDraw=2;
globalThis.Roll=class {constructor(formula){this.formula=formula;} async evaluate(){this.total=Number(this.formula.split('d')[1]);if(this.formula==='1d20')this.total=quantity;if(this.formula==='1d2')this.total=spellDraw;return this;}};
const {TesourosTagmarApp}=await import('../modules/tesourosTagmar.js');
const {randomKinds,matchesMagicFilter,randomMagicFilters}=await import('../modules/treasureRandom.mjs');
const catalog={weapons:[{realm:'reinos',item:{name:'Espada'}},{realm:'terras',item:{name:'Machado'}}],
 defenses:[{realm:'reinos',item:{name:'Elmo'}}],origins:[],magics:[
 {key:'fogo',name:'Fogo',levels:[1,3,5],origins:['Elemental'],realms:['reinos'],traditions:['mage'],repertoires:['core']},
 {key:'cura',name:'Cura',levels:[1,3,5],origins:['Ganis'],realms:['reinos'],traditions:['priest'],repertoires:['core']},
 {key:'rito',name:'Rito',levels:[1,3,5],origins:['Selvagem'],realms:['terras'],traditions:['berserker'],repertoires:['core']},
 {key:'invalida',name:'Efeito alto',levels:[9],origins:[],realms:['reinos'],traditions:['mage'],repertoires:['core']}
]};
const app=new TesourosTagmarApp();app._loadCatalog=async()=>catalog;
const input={generationMode:'quick',treasureMode:'magical',treasureType:5,itemKind:'weapon',contentSource:'reinos',magicMode:'none',randomObjectTypes:['weapon','defense'],
 randomPropertyMode:'chosen',randomProperties:['bonus','focus'],randomMagicFilters:[{tradition:'mage',repertoire:'core',origin:''},{tradition:'priest',repertoire:'core',origin:''}]};
let seed=55;const nativeRandom=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
try {
 const before=structuredClone(input);
 assert.equal(await app._generateWithOptions(input,{render:false}),true);
 assert.deepEqual(input,before);assert.deepEqual(properties,{});
 assert.equal(app._preview.length,app._lastRoll.count);
 assert.deepEqual(new Set(app._preview.map(e=>e.kind)),new Set(['weapon','defense']));
 assert.ok(app._preview.every(e=>e.bonus>0&&e.focus>0&&!e.resistance&&!e.absorption&&!e.magics.length));
 for(const props of [['bonus'],['focus'],['magia'],['resistencia'],['absorcao'],['bonus','focus','magia']]) {
   const types=props.includes('absorcao')?['defense','ring']:['weapon','defense'];
   assert.equal(await app._generateWithOptions({...input,randomObjectTypes:types,randomProperties:props},{render:false}),true);
   for(const e of app._preview){
     for(const key of ['bonus','focus','resistencia','absorcao','magia']){
       const present=key==='resistencia'?e.resistance>0:key==='absorcao'?e.absorption>0:key==='magia'?e.magics.length>0:e[key]>0;
       assert.equal(present,props.includes(key),`${props}: ${key}`);
     }
     assert.ok(e.magics.every(m=>['Fogo','Cura'].includes(m.name)&&m.effect<=5));
     assert.equal(new Set(e.magics.map(m=>m.name)).size,e.magics.length);
     assert.ok(e.magics.length<=2);
   }
 }
 assert.equal(await app._generateWithOptions({...input,randomObjectTypes:['random'],itemKind:'random',randomProperties:['bonus']},{render:false}),true);
 assert.ok(app._preview.every(e=>['weapon','defense'].includes(e.kind)&&e.bonus>0));
 let previous=app._preview;
 for(const extra of [{randomObjectTypes:['weapon','ring'],randomProperties:['bonus']},{randomProperties:[]},
   {randomProperties:['magia'],randomMagicFilters:[{tradition:'bard'}]},
   {randomObjectTypes:['defense'],contentSource:'terras'},
   {randomPropertyMode:'random',randomObjectTypes:['weapon','potion'],magicMode:'none'}]){
   assert.equal(await app._generateWithOptions({...input,...extra},{render:false}),undefined);
   assert.equal(app._preview,previous);
 }
 properties={bonus:false};
 assert.equal(await app._generateWithOptions(input,{render:false}),undefined);assert.equal(app._preview,previous);assert.deepEqual(properties,{bonus:false});
 properties={};
 assert.equal(await app._generateWithOptions({...input,treasureMode:'mundane',magicMode:'none',randomObjectTypes:['weapon','defense'],randomProperties:['bonus']},{render:false}),true);
 assert.ok(app._preview.every(e=>!e.bonus&&!e.focus&&!e.magics.length));
 assert.equal(await app._generateWithOptions({...input,includeCurse:true,curseNature:'automatic'},{render:false}),true);
 assert.ok(app._preview.every(e=>e.bonus>0&&e.focus>0&&e.curse));
 assert.deepEqual(randomKinds({randomObjectTypes:['weapon','weapon','defense']}),['weapon','defense']);
 assert.equal(matchesMagicFilter(catalog.magics[1],randomMagicFilters(input)[1]),true);
 assert.equal(matchesMagicFilter(catalog.magics[2],randomMagicFilters(input)[1]),false);
 assert.equal(matchesMagicFilter(catalog.magics[0],{tradition:'mage',repertoire:'lost',origin:''}),false);
 assert.equal(matchesMagicFilter(catalog.magics[0],{tradition:'mage',repertoire:'core',origin:'Ganis'}),false);
 const minimumInput={...input,treasureMode:'mixed',randomPropertyMode:'random',randomProperties:[],randomObjectTypes:['weapon'],magicMode:'random'};
 spellDraw=1;
 assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:0},{render:false}),true);
 assert.ok(app._preview.every(e=>e.magics.length===0),'zero preserves the property chance');
 const quantityWithoutMinimum=app._preview.length;
 for (const minimum of [1,2]) {
   assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:minimum},{render:false}),true);
   assert.equal(app._preview.length,quantityWithoutMinimum);
   assert.ok(app._preview.every(e=>e.magics.length===minimum));
 }
 const previousMinimum=app._preview;
 for (const minimum of [-1,3,1.5,'invalid']) {
   assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:minimum},{render:false}),undefined);
   assert.equal(app._preview,previousMinimum);
 }
 assert.equal(await app._generateWithOptions({...minimumInput,randomObjectTypes:['potion'],itemKind:'potion',randomMagicMinimum:2},{render:false}),undefined);
 assert.equal(app._preview,previousMinimum);
 assert.equal(await app._generateWithOptions({...minimumInput,randomObjectTypes:['random'],itemKind:'random',randomMagicMinimum:2},{render:false}),true);
 assert.ok(app._preview.every(e=>e.kind!=='potion'&&e.magics.length>=2));
 assert.equal(await app._generateWithOptions({...minimumInput,randomObjectTypes:['staff'],itemKind:'staff',randomMagicMinimum:2},{render:false}),true);
 assert.ok(app._preview.every(e=>e.magics.length>=2&&e.magics.length<=4));
 spellDraw=2;
 const singleFamily=[{tradition:'mage',repertoire:'core',origin:''}];
 assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:1,randomMagicFilters:singleFamily},{render:false}),true);
 assert.ok(app._preview.every(e=>e.magics.length===1));
 const singlePreview=app._preview;
 assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:2,randomMagicFilters:singleFamily},{render:false}),undefined);
 assert.equal(app._preview,singlePreview);
 assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:1,magicMode:'none'},{render:false}),true);
 assert.ok(app._preview.every(e=>e.magics.length===0));
 assert.equal(await app._generateWithOptions({...input,randomMagicMinimum:1},{render:false}),true);
 assert.ok(app._preview.every(e=>e.magics.length===0),'bonus/focus-only recipe overrides dormant minimum');
 assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:1,includeCurse:true,curseNature:'automatic'},{render:false}),true);
 assert.ok(app._preview.every(e=>e.magics.length>=1&&e.curse));
 properties={magia:false};
 assert.equal(await app._generateWithOptions({...minimumInput,randomMagicMinimum:1},{render:false}),undefined);
 assert.deepEqual(properties,{magia:false});properties={};
 console.log('PASS: minimum 0/1/2, unchanged object quantity, insufficient repertoire, compatible random types, potion/staff limits, inactive minimum, curse compatibility, validation and immutable settings.');
 console.log('PASS: combined types/families, guaranteed selected properties only, region/level caps, unique spells, unchanged quantities, immutable global settings and input, incompatible/empty recipes, transactional rejection, mundane and curse modes.');
}finally{Math.random=nativeRandom;}
