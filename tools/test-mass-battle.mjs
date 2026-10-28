import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {derive,damageUpdate} from '../modules/mass-combat/rules.mjs';
import {roster,orderedUnits,currentUnit,currentTask,stateOf,contextFor,validPlan} from '../modules/mass-combat/battle-state.mjs';
import {startBattle,savePlan,advanceBattle,rollCurrent,acceptBattleMessage,registerBattleChatResult,chooseVariant,skipAttack,recordSupport,supportPackets,resolveBattle,rescueCurrent,stopBattle,battleHTML,registerBattle} from '../modules/mass-combat/battle.mjs';
import {rollTroop,resolvePending,enqueue,applyAttackPacket} from '../modules/mass-combat/actions.mjs';
import {exclusive} from '../modules/vehicles/actions.mjs';

const merge=(a,b)=>{const r=structuredClone(a);for(const[k,v]of Object.entries(b))r[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(r[k]??{},v):v;return r;};
function set(o,path,value){const keys=path.split('.'),last=keys.pop();for(const k of keys)o=o[k]??={};o[last]=structuredClone(value);}
class Collection extends Map{[Symbol.iterator](){return this.values();}find(fn){return [...this.values()].find(fn);}get contents(){return [...this.values()];}}
const schema=JSON.parse(fs.readFileSync(new URL('../template.json',import.meta.url)));
const GM={id:'gm',isGM:true},PLAYER={id:'player',isGM:false},stranger={id:'stranger',isGM:false};
let counter=0,die=10;
const messages=[],hooks=new Map(),views={};
const snapshot=(name,c)=>{views[name]=battleHTML(c);};
globalThis.game={system:{id:'tagmar_rpg'},user:GM,users:{activeGM:GM},combats:new Collection(),messages,settings:{get:()=>false},tagmar:{}};
globalThis.foundry={utils:{randomID:()=>`id${++counter}`},applications:{api:{ApplicationV2:class{}}}};
globalThis.ui={notifications:{info(){},warn(){}},combat:{render(){}}};
globalThis.Hooks={on:(k,fn)=>hooks.set(k,fn),once:(k,fn)=>hooks.set(k,fn)};
game.tagmar.tabela_resol=vm.runInNewContext(fs.readFileSync(new URL('../modules/tagmar.js',import.meta.url),'utf8').match(/const tabela_resol = (\[[\s\S]*?\n\]);/)[1]);
function message(data){const m={...data,id:`message${++counter}`,author:game.user,getFlag:(scope,key)=>data.flags?.[scope]?.[key]};messages.push(m);return m;}
globalThis.Roll=class{constructor(formula,data={}){this.formula=formula;this.data=data;}async evaluate(){this.total=this.formula.startsWith('1d10')?die+(this.data.general??0)+(this.data.voice??0)-(this.data.penalty??0):die;return this;}async toMessage(data){return message(data);}};
globalThis.ChatMessage={getSpeaker:({actor})=>({alias:actor.name}),create:async data=>message(data)};
class Actor{
 constructor(id,army,extra={}){this.id=id;this.uuid=`Actor.${id}`;this.name=id;this.type='Tropa';this.flags={};this.system=merge(merge(schema.Actor.templates.base,schema.Actor.Tropa),{exercito:army,ef:{value:200,max:200},estagio:4,equipamento:'medio',comando:{totalManual:10},especialista:{totalManual:10},...extra});}
 get isOwner(){return game.user.isGM||game.user.id===PLAYER.id;}
 testUserPermission(u){return u.isGM||u.id===PLAYER.id;}
 getFlag(scope,key){return this.flags[scope]?.[key];}
 async setFlag(scope,key,v){return this.update({[`flags.${scope}.${key}`]:v});}
 async update(update){for(const[k,v]of Object.entries(update))set(this,k,v);return this;}
}
class Combat{
 constructor(id,actors){this.id=id;this.round=0;this.turn=null;this.flags={};this.combatants=new Collection();for(const a of actors)this.combatants.set(a.id,{id:a.id,name:a.name,actor:a,token:{uuid:`Scene.test.Token.${a.id}`},initiative:5});this.setupTurns();}
 getFlag(scope,key){return this.flags[scope]?.[key];}
 async setFlag(scope,key,v){return this.update({[`flags.${scope}.${key}`]:v});}
 async update(update){for(const[k,v]of Object.entries(update))set(this,k,v);return this;}
 async updateEmbeddedDocuments(_type,updates){for(const u of updates)Object.assign(this.combatants.get(u._id),u);this.setupTurns();}
 setupTurns(){this.turns=[...this.combatants].sort((a,b)=>this._sortCombatants(a,b));}
 _sortCombatants(a,b){return b.initiative-a.initiative;}
 async nextTurn(){return 'native-turn';}async nextRound(){return 'native-round';}async previousTurn(){return 'native-back';}async previousRound(){return 'native-back-round';}
}
globalThis.CONFIG={Combat:{documentClass:Combat}};
registerBattle();
const a=new Actor('a','Azul',{aparatos:{quantidade:1,porUnidade:100,atual:100},perdasRodada:20,ocupada:2});
const b=new Actor('b','Rubro',{fortificacao:{ativa:true,muros:20}});
const support=new Actor('s','Azul',{tipos:{apoio:true}}),cavalry=new Actor('c','Azul',{tipos:{cavalaria:true}});
const combat=new CONFIG.Combat.documentClass('battle',[a,b,support,cavalry]);game.combats.set(combat.id,combat);game.combat=combat;
const normal=new CONFIG.Combat.documentClass('normal',[]);
assert.equal(await normal.nextTurn(),'native-turn');assert.equal(await normal.nextRound(),'native-round');assert.equal(await normal.previousTurn(),'native-back');
assert.throws(()=>roster(new Combat('bad',[a,{...b,type:'NPC'}])));
assert.throws(()=>validPlan({id:'a',army:'Azul'},{action:'attack',targets:['s']},roster(combat)));
assert.match(battleHTML(combat),/Iniciar batalha guiada/);snapshot('setup',combat);
await startBattle(combat,{Azul:{general:5,voice:0},Rubro:{general:0,voice:0}});
assert.equal(a.system.absorcao.value,40);assert.equal(a.system.aparatos.atual,100);assert.equal(b.system.fortificacao.muros,20);
assert.equal(a.system.perdasRodada,20,'Rescue reference survives round preparation');assert.equal(a.system.ocupada,1);
assert.deepEqual(stateOf(combat).order,['b','a','s','c']);
assert.equal(combat.combatants.get('a').initiative,11);assert.equal(stateOf(combat).initiatives.Azul,11);assert.equal(stateOf(combat).initiatives.Rubro,10);
snapshot('preparation',combat);assert.equal(combat.turns[0].id,'b');assert.equal(combat.round,1);
assert.equal(hooks.get('preUpdateCombat')(combat,{round:9},{}),false);
assert.equal(hooks.get('preUpdateCombat')(normal,{round:9},{}),undefined);
assert.equal(hooks.get('preUpdateCombat')(combat,{round:1},{tagmarBattle:true}),undefined);
await assert.rejects(()=>startBattle(combat,{}));await assert.rejects(()=>advanceBattle(combat));
// Retrying partial preparation never decrements occupation or restores an already-prepared unit again.
await a.update({'system.absorcao.value':12});await combat.setFlag(game.system.id,'massBattle',{...stateOf(combat),preparing:true});await advanceBattle(combat);
assert.equal(a.system.absorcao.value,12);assert.equal(a.system.ocupada,1);
await a.update({'system.ocupada':0});
while(stateOf(combat).phase==='preparation'){
 const id=currentUnit(stateOf(combat));game.user=PLAYER;
 const plan=id==='a'?{action:'attack',targets:['b']}:id==='s'?{action:'support',targets:['a']}:{action:'defend',targets:[]};
 await savePlan(combat,plan);await assert.rejects(()=>advanceBattle(combat));game.user=GM;await combat.nextTurn();
}
assert.equal(stateOf(combat).phase,'field');snapshot('field',combat);assert.equal(combat.round,1);
await combat.nextRound();assert.equal(stateOf(combat).phase,'extras','Native next-round button advances a phase, not the round');
snapshot('extras',combat);await assert.rejects(()=>resolvePending(a));await assert.rejects(()=>rollTroop(a));
const before=structuredClone({a:a.system.ef,b:b.system.ef});
await rollCurrent(combat);const extraMessage=messages.at(-1);assert.ok(extraMessage.getFlag(game.system.id,'troopAttack').battle);
assert(!extraMessage.flavor.includes('data-troop-apply'));assert(extraMessage.flavor.includes('Registrar para a resolução'));
await acceptBattleMessage({...extraMessage,author:stranger});assert.equal(currentTask(stateOf(combat)).status,'waiting','Unauthorized message is ignored');
let releaseTarget;const held=exclusive(b,()=>new Promise(resolve=>{releaseTarget=resolve;}));
await assert.rejects(()=>acceptBattleMessage(extraMessage));assert.equal(currentTask(stateOf(combat)).status,'critical','Busy target leaves a recoverable pending result');
releaseTarget();await held;await registerBattleChatResult(extraMessage,0);await acceptBattleMessage(extraMessage);await registerBattleChatResult(extraMessage,0);
assert.equal(currentTask(stateOf(combat)).status,'done');assert.equal(b.system.pendentes.length,1);
await advanceBattle(combat);assert.equal(stateOf(combat).phase,'attacks');assert.equal(stateOf(combat).tasks.length,2,'Defender responds to attacker');
// Critical is held until the GM chooses, and a duplicate message cannot add damage twice.
die=20;game.user=PLAYER;await rollCurrent(combat);const crit=messages.at(-1);game.user=GM;
await acceptBattleMessage(crit);snapshot('critical',combat);assert.equal(currentTask(stateOf(combat)).status,'critical');
await assert.rejects(()=>advanceBattle(combat));await registerBattleChatResult(crit,0);await acceptBattleMessage(crit);await assert.rejects(()=>registerBattleChatResult(crit,1));
await advanceBattle(combat);
die=10;await rollCurrent(combat);await acceptBattleMessage(messages.at(-1));await advanceBattle(combat);
await registerBattleChatResult(crit,0);await registerBattleChatResult(extraMessage,0);
assert.equal(stateOf(combat).phase,'support');assert.equal(combat.round,1);assert.deepEqual({a:a.system.ef,b:b.system.ef},before);
snapshot('support',combat);assert(supportPackets(combat,stateOf(combat),'s').length>0);
await recordSupport(combat,'s');const packetCount=b.system.pendentes.length;await recordSupport(combat,'s');assert.equal(b.system.pendentes.length,packetCount);
await advanceBattle(combat);assert.equal(stateOf(combat).phase,'resolution');
await applyAttackPacket(b,{id:'manual-first',amount:10,kind:'critico'});
await enqueue(b,{id:'manual-extra-b',amount:30,kind:'critico'});await enqueue(a,{id:'manual-extra-a',amount:30,kind:'critico'});
const expectedA=damageUpdate(a.system,a.system.pendentes).result.pools,expectedB=damageUpdate(b.system,b.system.pendentes).result.pools;
assert.match(battleHTML(combat),/Confirmar resolução/);snapshot('resolution',combat);
await resolveBattle(combat);assert.equal(stateOf(combat).phase,'finished');assert.equal(a.system.ef.value,expectedA.ef);assert.equal(b.system.ef.value,expectedB.ef);
assert.equal(stateOf(combat).lastLosses.b,200-b.system.ef.value,'Manual resolution damage is included in this round losses');assert.equal(b.system.fortificacao.muros,expectedB.muros);assert.equal(b.system.pendentes.length,0);await assert.rejects(()=>resolveBattle(combat));
assert.match(battleHTML(combat),/Recuperação para a próxima rodada/);await assert.rejects(()=>rescueCurrent(combat,{sameHex:true}),'No immediate healing in resolution');
snapshot('finished',combat);const losses=a.system.perdasRodada;await advanceBattle(combat);assert.equal(combat.round,2);assert.equal(stateOf(combat).phase,'preparation');assert.equal(a.system.ocupada,0);assert.equal(a.system.perdasRodada,losses);
await assert.rejects(()=>registerBattleChatResult(crit,0),'Old round cannot queue old damage');
// Rescuing is a next-round preparation action with one durable roll and one EF update.
assert.equal(currentUnit(stateOf(combat)),'b');assert.ok(stateOf(combat).lastLosses.b>0);
assert.equal(b.system.absorcao.value,derive(b.system).absorption,'Equipment ABS restores at next preparation');
assert.equal(b.system.fortificacao.muros,expectedB.muros,'Walls never restore for free');
await savePlan(combat,{action:'rescue',targets:[]});await assert.rejects(()=>advanceBattle(combat));
await assert.rejects(()=>rescueCurrent(combat),'Hex must be confirmed');
game.user=PLAYER;await assert.rejects(()=>rescueCurrent(combat,{sameHex:true}));game.user=GM;
const efBeforeRescue=b.system.ef.value,absBeforeRescue=b.system.absorcao.value;die=15;
await rescueCurrent(combat,{sameHex:true});
const rescue=stateOf(combat).rescues.b;
assert.equal(b.system.ef.value,Math.min(b.system.ef.max,efBeforeRescue+rescue.variants[0].amount));
assert.equal(b.system.ocupada,1);assert.equal(b.system.absorcao.value,absBeforeRescue,'Rescue does not restore armor a second time');
const recovered=b.system.ef.value;
await combat.setFlag(game.system.id,'massBattle',{...stateOf(combat),rescues:{...stateOf(combat).rescues,b:{...stateOf(combat).rescues.b,done:false}}});
await rescueCurrent(combat,{sameHex:true});assert.equal(b.system.ef.value,recovered);
await assert.rejects(()=>savePlan(combat,{action:'attack',targets:['a']}),'Rescue consumes this action');snapshot('rescue-complete',combat);
await advanceBattle(combat);assert.equal(currentUnit(stateOf(combat)),'a');assert.ok(stateOf(combat).lastLosses.a>0);
await savePlan(combat,{action:'rescue',targets:[]});die=20;const beforeCritical=a.system.ef.value;
await rescueCurrent(combat,{sameHex:true});assert.equal(stateOf(combat).rescues.a.done,false);assert.equal(a.system.ef.value,beforeCritical);
snapshot('rescue-critical',combat);await assert.rejects(()=>advanceBattle(combat));
await rescueCurrent(combat,{index:3});assert.equal(a.system.ef.value,Math.min(a.system.ef.max,beforeCritical+stateOf(combat).lastLosses.a));
const criticalEF=a.system.ef.value;await rescueCurrent(combat,{index:0});assert.equal(a.system.ef.value,criticalEF);
await advanceBattle(combat);assert.equal(currentUnit(stateOf(combat)),'s');await assert.rejects(()=>savePlan(combat,{action:'rescue',targets:[]}),'No losses cannot be rescued');
game.user=stranger;await assert.rejects(()=>registerBattleChatResult(crit,0));await assert.rejects(()=>savePlan(combat,{action:'defend',targets:[]}));await assert.rejects(()=>stopBattle(combat));game.user=GM;
while(stateOf(combat).phase==='preparation'){await savePlan(combat,{action:'defend',targets:[]});await advanceBattle(combat);}
await advanceBattle(combat);assert.equal(stateOf(combat).phase,'support');await advanceBattle(combat);await resolveBattle(combat);await advanceBattle(combat);
assert.equal(combat.round,3);assert.equal(a.system.ocupada,0);assert.equal(b.system.ocupada,0);assert.equal(b.system.absorcao.value,derive(b.system).absorption);
assert.equal(stateOf(combat).lastLosses.b,0);await assert.rejects(()=>savePlan(combat,{action:'rescue',targets:[]}),'Old losses cannot be reused in later rounds');
await stopBattle(combat);assert.equal(await combat.nextTurn(),'native-turn');
console.log('PASS army initiative, cavalry order, normal tracker delegation, full round, player choices, target/defense snapshots, deferred damage, critical decisions, duplicate messages/support, resolution, retry-safe preparation, permissions, next-round absorption, rescue eligibility, critical rescue, occupation and no double recovery.');

if(process.env.TAGMAR_BATTLE_VIEWS)fs.writeFileSync(process.env.TAGMAR_BATTLE_VIEWS,JSON.stringify(views,null,2));
