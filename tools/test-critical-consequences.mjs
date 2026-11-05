import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {consequenceOptions,normalizeParts,effectState,consequenceId} from '../modules/critical-rules.mjs';
import {applyConsequence,undoConsequence,synchronizeConsequences,consequenceRecord,selectedConsequenceTargets} from '../modules/critical-consequences.mjs';
import {penaltyTotal} from '../modules/timedPenalties.mjs';
const copy=v=>structuredClone(v);
const assign=(o,path,v)=>{const keys=path.split('.'),last=keys.pop();for(const key of keys)o=o[key]??={};o[last]=copy(v);};
let time=0;
class Collection extends Map{[Symbol.iterator](){return this.values();}get contents(){return [...this.values()];}}
const game={user:{id:'gm',isGM:true},users:[{id:'gm',isGM:true,active:true}],modules:new Map([['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:Math.floor(time/86400)})}}]]),time:{get worldTime(){return time;}}};
const nativeSource=await readFile((process.env.TAGMAR_TEST_FOUNDRY??'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app')+'/common/abstract/document.mjs','utf8');
const getterStart=nativeSource.indexOf('  getFlag(scope, key) {'),getterEnd=nativeSource.indexOf('\n  /*',getterStart);
assert(getterStart>0&&getterEnd>getterStart);
const NativeFlags=new Function('getProperty','return class {'+nativeSource.slice(getterStart,getterEnd)+'}')((obj,key)=>key.split('.').reduce((v,k)=>v?.[k],obj));
NativeFlags.database={getFlagScopes:()=>['core','world','tagmar_rpg','tagmar3er-oficial']};
class Effect extends NativeFlags{
 constructor(actor,data){super();this.parent=actor;this.id=data._id;Object.assign(this,copy(data));this.statuses=new Set(data.statuses??[]);}
 async update(update){for(const [k,v] of Object.entries(update))if(k.includes('.'))assign(this,k,v);else this[k]=k==='statuses'?new Set(v):copy(v);return this;}
}
function actor(id,type='NPC'){
 const a={uuid:'Scene.scene.Token.'+id+'.Actor.a',name:id,type,pack:null,effects:new Collection(),system:{inf_ataque:{bonus:3},bonus_habil:4},calls:0,
 async createEmbeddedDocuments(_type,rows,options){assert.equal(options.keepId,true);this.calls++;await new Promise(r=>setTimeout(r,5));return rows.map(data=>{assert(!this.effects.has(data._id),'Duplicate effect id');const effect=new Effect(this,data);this.effects.set(effect.id,effect);return effect;});}};
 return a;
}
const message={id:'message',uuid:'ChatMessage.message',flags:{tagmarCritical:{version:1,color:'cinza',failure:false,rows:[{key:'0',label:'Combate Desarmado',description:'100%. Nocaute, oponente fica desmaiado por 1 hora e incapacitado por 2 dias.'},{key:'1',label:'Corte',description:'Oponente decapitado.'}]}},async update(data){for(const [k,v] of Object.entries(data))assign(this,k,v);}};
const a=actor('synthetic'),b=actor('other');
const friendly={name:'Aliado selecionado',actor:a,document:{disposition:1}};
const hostile={name:'Inimigo selecionado',actor:b,document:{disposition:-1}};
assert.deepEqual(selectedConsequenceTargets({tokens:{controlled:[friendly,hostile,{actor:null},{actor:actor('vehicle','Veiculo')}]}}).map(t=>t.actor),[a,b]);
assert.deepEqual(selectedConsequenceTargets({tokens:{controlled:[]}}),[]);
assert.deepEqual(selectedConsequenceTargets(undefined),[]);
const baseParts=consequenceOptions('cinza',false,'Combate Desarmado')[0].parts;
const existing=new Effect(a,{_id:'preexisting',name:'Inconsciência anterior',disabled:false,statuses:['unconscious'],changes:[],flags:{other:{source:'independent'}}});a.effects.set(existing.id,existing);
const args={message,rowKey:'0',actor:a,tokenName:'Token A',parts:baseParts,game};
const results=await Promise.all([applyConsequence(args),applyConsequence(args)]);
assert.equal(a.calls,1);assert.equal(results.filter(r=>r.duplicate).length,1);
const id=await consequenceId(message.id,a.uuid),effect=a.effects.get(id);
assert(effect.statuses.has('unconscious'));assert.equal(consequenceRecord(effect).description,message.flags.tagmarCritical.rows[0].description);
assert.equal(consequenceRecord(effect).targetName,'Token A');
assert.equal(a.system.inf_ataque.bonus,3);assert.equal(a.system.bonus_habil,4);
assert.equal(a.system.EF,undefined,'No damage or healing is performed');
await assert.rejects(applyConsequence({...args,rowKey:'1'}),/Outra consequência/);
await applyConsequence({...args,actor:b,tokenName:'Token B'});assert.equal(b.calls,1);assert.notEqual(id,await consequenceId(message.id,b.uuid));
time=3600;await synchronizeConsequences([a,b],game);
assert.equal(effect.disabled,false);assert.equal(effect.statuses.size,0);assert(existing.statuses.has('unconscious'));
assert.equal(consequenceRecord(effect).parts[1].endsAt-consequenceRecord(effect).startsAt,172800);
time=172800;await synchronizeConsequences([a,b],game);assert.equal(effect.disabled,true);assert.equal(consequenceRecord(effect).endedReason,'expired');
await undoConsequence({message,actor:a,effectId:id,game});assert.equal(consequenceRecord(effect).endedReason,'undone');assert(existing.statuses.has('unconscious'));
await undoConsequence({message,actor:a,effectId:id,game});assert.equal(a.effects.size,2);
const signed=[{label:'Ajuste −7',duration:2,unit:'rounds',status:'',combat:-7,skill:-7}];
await applyConsequence({...args,parts:signed});assert.equal(a.calls,1,'Reapply explicitly reuses only own effect');
assert.equal(penaltyTotal(a,'combat'),7);assert.equal(penaltyTotal(a,'skill'),7);
assert.equal(a.system.inf_ataque.bonus,3);assert.equal(a.system.bonus_habil,4);
const duplicate=await applyConsequence({...args,parts:signed});assert(duplicate.duplicate);assert.equal(penaltyTotal(a,'combat'),7);
time+=29;await synchronizeConsequences([a],game);assert.equal(penaltyTotal(a,'combat'),7);
time+=1;await synchronizeConsequences([a],game);assert.equal(penaltyTotal(a,'combat'),0);assert.equal(effect.changes.length,0);
await undoConsequence({message,actor:a,effectId:id,game});
await applyConsequence({...args,parts:[{label:'Flecha até retirar',duration:0,unit:'manual',status:'',combat:-6,skill:0}]});
time+=86400;await synchronizeConsequences([a],game);assert.equal(effect.disabled,false);assert.equal(penaltyTotal(a,'combat'),6);
await undoConsequence({message,actor:a,effectId:id,game});assert.equal(penaltyTotal(a,'combat'),0);assert(existing.statuses.has('unconscious'));
await assert.rejects(applyConsequence({...args,game:{...game,user:{id:'player',isGM:false}}}),/Somente o mestre/);
await assert.rejects(undoConsequence({message,actor:a,effectId:id,game:{...game,user:{isGM:false}}}),/Somente o mestre/);
await assert.rejects(applyConsequence({...args,actor:actor('vehicle','Veiculo')}),/personagem ou PNJ/);
await assert.rejects(applyConsequence({...args,actor:{...a,pack:'compendium'}}),/mundo/);
await assert.rejects(applyConsequence({...args,game:{...game,modules:new Map()}}),/Grande Calendário/);
assert.throws(()=>normalizeParts([{...signed[0],duration:-1}]),/válidos/);
assert.throws(()=>normalizeParts([{...signed[0],combat:'NaN'}]),/válidos/);
assert.throws(()=>normalizeParts([{...signed[0],status:'made-up'}]),/status/);
assert.throws(()=>normalizeParts([{...signed[0],duration:0}]),/maior que zero/);
await applyConsequence({...args,parts:signed});time+=31;
await synchronizeConsequences([a],{...game,user:{id:'gm2',isGM:true},users:[{id:'gm',isGM:true,active:true},{id:'gm2',isGM:true,active:true}]});assert.equal(effect.disabled,false);
await synchronizeConsequences([a],game);assert.equal(effect.disabled,true);
const labels=['Combate Desarmado','Garras/Mordida','Corte','Esmagamento','Penetração','Magia','10 a 50 vezes o peso do atacante','Peso acima de 50 vezes'];
for(const color of ['cinza','roxo','azul','vermelho','laranja','amarelo','branco','verde'])for(const label of labels)for(const failure of [false,true])for(const opt of consequenceOptions(color,failure,label))normalizeParts(opt.parts);
assert.equal(consequenceOptions('azul',false,'Esmagamento').length,2);
assert.equal(consequenceOptions('branco',false,'Penetração')[1].parts[0].unit,'manual');
assert.equal(consequenceOptions('vermelho',true,'Falha')[0].parts[0].combat,0,'Self damage is manual and separate');
const source=await readFile(new URL('../modules/tagmar.js',import.meta.url),'utf8');
assert(source.includes('world: {...(context.flags?.world ?? {}), tagmarCritical: critical.record}'));assert(source.includes('tipo !== "" && tipo !== "MAG"'));
console.log('PASS: all critical/fumble presets, native status preservation, independent deadlines, exact synthetic actor, no damage, signed rolls, double clicks, manual recovery, undo/reapply, target isolation, GM permissions and expiration.');

// Reproduce the native Foundry scope validation that the first preview missed.
assert.throws(()=>effect.getFlag('tagmarCritical','consequence'),/not valid or not currently active/);
assert.equal(effect.getFlag('world','tagmarCritical.consequence'),consequenceRecord(effect));
const legacyActor=actor('legacy'),legacyId=await consequenceId(message.id,legacyActor.uuid);
const legacyRecord={...copy(consequenceRecord(effect)),actorUuid:legacyActor.uuid,startsAt:54000000000,
 endedReason:null,parts:[{label:'Ajuste antigo',seconds:86400,endsAt:54000000000+time+86400,status:'',combat:-4,skill:0}]};
const legacy=new Effect(legacyActor,{_id:legacyId,name:'Debilitação já aplicada',disabled:false,statuses:[],changes:effectState(legacyRecord,null).changes,flags:{tagmarCritical:{consequence:legacyRecord}}});
legacyActor.effects.set(legacyId,legacy);
assert.throws(()=>legacy.getFlag('tagmarCritical','consequence'),/not valid/);
assert.equal(penaltyTotal(legacyActor,'combat'),4);
const originalDeadline=legacyRecord.parts[0].endsAt;
await synchronizeConsequences([legacyActor],game);
assert.equal(legacy.getFlag('world','tagmarCritical.consequence').parts[0].endsAt,originalDeadline);
assert.equal(penaltyTotal(legacyActor,'combat'),4);
const result=await applyConsequence({...args,actor:legacyActor});assert(result.duplicate);assert.equal(legacyActor.calls,0);
assert.equal(consequenceRecord(legacy).parts[0].endsAt,originalDeadline);
await undoConsequence({message,actor:legacyActor,effectId:legacyId,game});assert.equal(penaltyTotal(legacyActor,'combat'),0);
console.log('PASS: actual Foundry getFlag validation, valid native world scope, already-applied legacy effect recovered without duplicate or renewed duration, and healing removes its penalty.');

// A linked-form return in 14.370 can leave an older ActorDelta instance in memory.
const retired={isToken:true,token:{actor:null},get effects(){throw Error('Retired actor must not be synchronized');}};
await synchronizeConsequences([retired],game);
console.log('PASS: expired criticals never update a retired synthetic actor after transformation.');
