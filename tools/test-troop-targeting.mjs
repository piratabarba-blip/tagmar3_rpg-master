import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {rollTroop,applyAttackPacket,enqueue,registerTroopChat} from '../modules/mass-combat/actions.mjs';
import {selectedTroopTarget,attackRecipients,registerTroopTargeting} from '../modules/mass-combat/targeting.mjs';
import {registerTroopFeedback,feedbackLines} from '../modules/mass-combat/feedback.mjs';
const merge=(a,b)=>{const r=structuredClone(a);for(const [k,v]of Object.entries(b))r[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(r[k]??{},v):v;return r;};
const schema=JSON.parse(fs.readFileSync(new URL('../template.json',import.meta.url)));
const hooks={},messages=[],scroll=[],combatUpdates=[];let random=0;
globalThis.Hooks={on:(name,fn)=>(hooks[name]??=[]).push(fn)};
globalThis.game={user:{id:'gm',isGM:true,targets:new Set()},system:{id:'tagmar_rpg'},settings:{get:(_id,key)=>key==='autoTarget'?'yes':false},tagmar:{},combats:[],actors:new Map()};
globalThis.foundry={utils:{randomID:()=>String(++random),flattenObject:obj=>obj}};
globalThis.ui={notifications:{info(){},warn(msg){throw Error(msg);}}};
globalThis.ChatMessage={getSpeaker:({actor}={})=>({actor:actor?.id,alias:actor?.name}),create:async data=>messages.push(data)};
globalThis.canvas={ready:true,tokens:{controlled:[],placeables:[]},interface:{createScrollingText:(position,text)=>scroll.push({position,text})}};
globalThis.Roll=class{async evaluate(){this.total=15;return this;}async toMessage(data){messages.push(data);}};
game.tagmar.tabela_resol=vm.runInNewContext(fs.readFileSync(new URL('../modules/tagmar.js',import.meta.url),'utf8').match(/const tabela_resol = (\[[\s\S]*?\n\]);/)[1]);
const actor=(id,system={})=>({id,uuid:`Actor.${id}`,name:id,type:'Tropa',isOwner:true,system:merge(merge(schema.Actor.templates.base,schema.Actor.Tropa),{ef:{value:100,max:100},...system}),async update(changes,options={}){
 for(const [key,value]of Object.entries(changes)){const parts=key.split('.'),last=parts.pop();let obj=this;for(const part of parts)obj=obj[part]??={};obj[last]=value;}
 for(const hook of hooks.updateActor??[])await hook(this,changes,options,'gm');
}});
const attacker=actor('A',{estagio:4,comando:{totalManual:10},colunas:{L:3,M:2,P:0}});
const defender=actor('B',{estagio:2,equipamento:'bom',tipos:{defesaEspecial:true},absorcao:{value:5}});
const other=actor('C');
const token=actor=>({name:actor.name,actor,document:{uuid:`Scene.scene.Token.${actor.id}`},isVisible:true,center:{x:100,y:200}});
const target=token(defender),second=token(other),own=token(attacker);
const documents=new Map([[target.document.uuid,{actor:defender}],[second.document.uuid,{actor:other}]]);
globalThis.fromUuid=async id=>documents.get(id);
game.user.targets.add(target);
const targetData=selectedTroopTarget(attacker);assert.equal(targetData.category,'P');assert.equal(targetData.defense,2);
const attack=await rollTroop(attacker);assert.equal(attack.column.totalColumn,7); // 4 + 5 + 0 - P2
const card=messages.at(-1).flags.tagmar_rpg.troopAttack;
assert.equal(card.target.tokenUuid,target.document.uuid);assert.match(messages.at(-1).flavor,/Alvo: B/);
assert.equal(attack.variants[0].amount,15); // coluna 7, dado 15 = 75%; resistência reduz 30 para 15
game.user.targets=new Set([second]);canvas.tokens.controlled=[own];
assert.deepEqual(await attackRecipients(card),[defender]);
documents.delete(target.document.uuid);await assert.rejects(()=>attackRecipients(card),/alvo original/);documents.set(target.document.uuid,{actor:defender});
game.user.targets=new Set([target,second]);await assert.rejects(()=>rollTroop(attacker),/apenas uma/);
game.user.targets=new Set([own]);assert.throws(()=>selectedTroopTarget(attacker),/si mesma/);
game.user.targets.clear();assert.equal(selectedTroopTarget(attacker),null);assert.deepEqual(await attackRecipients({actorUuid:other.uuid}),[attacker]);
await assert.rejects(()=>attackRecipients({actorUuid:attacker.uuid}));

registerTroopFeedback();
canvas.tokens.placeables=[target,{...target,isVisible:false},second];
game.combats=[{combatants:[{id:'b',actor:defender,defeated:false},{id:'c',actor:other,defeated:false}],async updateEmbeddedDocuments(type,data){combatUpdates.push(data);for(const d of data)this.combatants.find(c=>c.id===d._id).defeated=d.defeated;}}];
await enqueue(defender,{id:'future',amount:3,kind:'muros'});
assert.equal(await applyAttackPacket(defender,{id:'hit',amount:20,kind:'geral'}),true);
assert.equal(defender.system.ef.value,85);assert.equal(defender.system.absorcao.value,0);
assert.equal(defender.system.pendentes.length,1);assert.match(scroll.at(-1).text,/EF −15/);assert.match(scroll.at(-1).text,/ABS −5/);
assert.match(messages.at(-1).content,/ainda em combate/);
assert.equal(await applyAttackPacket(defender,{id:'hit',amount:20,kind:'geral'}),false);
await applyAttackPacket(defender,{id:'dead',amount:999,kind:'critico'});
assert.equal(defender.system.ef.value,0);assert.match(scroll.at(-1).text,/DERROTADA/);assert.match(messages.at(-1).content,/derrotada/);
assert.deepEqual(combatUpdates.at(-1),[{_id:'b',defeated:true}]);assert.equal(scroll.length,2,'Somente token visível da tropa afetada');
await defender.update({'system.ef.value':20});assert.deepEqual(combatUpdates.at(-1),[{_id:'b',defeated:false}]);
assert.deepEqual(feedbackLines({before:{ef:50,absorcao:0,muros:20,armadilhas:0,aparatos:0},pools:{ef:50,absorcao:0,muros:10,armadilhas:0,aparatos:0},defeated:false}),['Muros −10']);

registerTroopTargeting();game.user.targets=new Set([target]);canvas.tokens.controlled=[own];
await hooks.targetToken[0]({id:'other'},target,true);await new Promise(r=>setTimeout(r,0));assert.equal(attacker.system.inf_ataque.cat_def,'');
hooks.targetToken[0](game.user,target,true);await new Promise(r=>setTimeout(r,0));assert.equal(attacker.system.inf_ataque.cat_def,'P');assert.equal(attacker.system.inf_ataque.valor_def,2);
// Handler real do botão do chat: mudança de seleção não muda o destinatário.
registerTroopChat();game.user.targets=new Set([second]);canvas.tokens.controlled=[own];let click;
const button={dataset:{troopPacket:'0',troopApply:'true'},addEventListener:(_event,fn)=>click=fn};
const message={id:'chat-hit',getFlag:()=>({...card,variants:[{amount:7,kind:'critico'}]}),speaker:{alias:'A'}};
hooks.renderChatMessageHTML[0](message,{querySelectorAll:()=>[button]});await click();assert.equal(defender.system.ef.value,13);assert.equal(attacker.system.ef.value,100);assert.equal(other.system.ef.value,100);
game.user.isGM=false;await assert.rejects(()=>applyAttackPacket(defender,{id:'unauthorized',amount:1,kind:'geral'}));
console.log('PASS current target defense/resistance, snapshot destination, deleted/multiple/self targets, direct and queued damage, deduplication, scrolling text, survival/defeat, combat tracker recovery, target hook and real chat button.');
