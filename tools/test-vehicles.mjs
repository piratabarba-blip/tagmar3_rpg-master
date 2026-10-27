// Tests the real rules/actions and native combat methods, with Foundry document/I/O doubles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import * as rules from '../modules/vehicles/rules.mjs';
import * as actions from '../modules/vehicles/actions.mjs';
import * as operators from '../modules/vehicles/operators.mjs';

const clone=value=>structuredClone(value);
const schema=JSON.parse(fs.readFileSync(new URL('../template.json',import.meta.url)));
const merged=(a,b)=>{const r=clone(a);for(const [k,v] of Object.entries(b))r[k]=v&&typeof v==='object'&&!Array.isArray(v)?merged(r[k]??{},v):v;return r;};
const system=(document,type)=>merged(schema[document].templates.base,schema[document][type]);
const assign=(target,path,value)=>{const keys=path.split('.');const last=keys.pop();let obj=target;for(const k of keys)obj=obj[k]??={};obj[last]=value;};
class Document {
 constructor(data={},context={}) {Object.assign(this,data);this.actor=context.parent;this.isOwner=true;this.uuid=data.uuid??'Item.test';this.flags=data.flags??{};this.id=data._id??'test';}
 async update(changes) {for(const [path,value] of Object.entries(changes))assign(this,path,value);return this;}
}
const hooks=[],messages=[],warnings=[];
globalThis.Item=Document;
globalThis.Actor=Document;
globalThis.Hooks={callAll:(...args)=>hooks.push(args)};
globalThis.ui={notifications:{warn:value=>warnings.push(value),info:()=>{}}};
globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id})};
globalThis.canvas={ready:false};
globalThis.foundry={applications:{ux:{TextEditor:{enrichHTML:async text=>text}}}};
let die=10;
globalThis.Roll=class {
 constructor(formula){this.formula=formula;this.dice=[{options:{}}];}
 async evaluate(){this.total=die;return this;}
 async toMessage(message){messages.push(message);return message;}
};
globalThis.game={system:{id:'tagmar_rpg'},user:{isGM:true,id:'gm',targets:new Set()},settings:{get:()=>false},actors:[],tagmar:{}};
const bootstrap=fs.readFileSync(new URL('../modules/tagmar.js',import.meta.url),'utf8');
game.tagmar.tabela_resol=vm.runInNewContext(bootstrap.match(/const tabela_resol = (\[[\s\S]*?\n\]);/)[1]);
// Only relocate imports; the production combat/skill method bodies are used unchanged.
let itemSource=fs.readFileSync(new URL('../modules/tagmarItem.js',import.meta.url),'utf8');
itemSource=itemSource.replace('"./vehicles/actions.mjs"',JSON.stringify(new URL('../modules/vehicles/actions.mjs',import.meta.url).href));
itemSource=itemSource.replaceAll('"/systems/"+game.system.id+"/modules/dadosColoridos.js"',JSON.stringify(new URL('../modules/dadosColoridos.js',import.meta.url).href));
const {tagmarItem}=await import('data:text/javascript;base64,'+Buffer.from(itemSource).toString('base64'));
game.tagmar.tagmarItem=tagmarItem;
const {tagmarActor}=await import('../modules/tagmarActor.js');
const vehicle=new tagmarActor({type:'Veiculo',name:'Navio de teste',uuid:'Actor.ship',system:system('Actor','Veiculo')});
vehicle.system.absorcao={value:100,max:100};vehicle.system.arm=10;
vehicle.system.tripulacao={minima:2,atual:2};vehicle.system.bonus_habil=0;
const weapon=new tagmarItem({type:'Arma_Guerra',name:'Balista',uuid:'Actor.ship.Item.weapon',system:system('Item','Arma_Guerra')},{parent:vehicle});
weapon.system.dano25=10;weapon.system.municao=5;weapon.system.recarga=2;weapon.system.operacao.totalManual=10;
const skill={id:'navigation',name:'Navegação',type:'Habilidade',system:{nivel:6,ajuste:{atributo:'INT'},penalidade:-1,bonus:2}};
const operator={documentName:'Actor',type:'Personagem',name:'Capitão',uuid:'Actor.captain',isOwner:true,items:new Map([[skill.id,skill]]),system:{atributos:{INT:3},bonus_habil:1}};
operator.items.filter=fn=>[...operator.items.values()].filter(fn);
operator.items.find=fn=>[...operator.items.values()].find(fn);
globalThis.fromUuid=async uuid=>uuid===operator.uuid?operator:null;

assert.equal(rules.structuralDamage(vehicle.system,8).after,100);
assert.equal(rules.structuralDamage(vehicle.system,10).after,100);
assert.equal(rules.structuralDamage(vehicle.system,30).after,80);
assert.equal(rules.structuralDamage(vehicle.system,999).collapsed,true);
assert.throws(()=>rules.structuralDamage(vehicle.system,-1));
assert.throws(()=>rules.structuralDamage(vehicle.system,'abc'));
await vehicle._aplicarDano({valor:30,isCura:false});assert.equal(vehicle.system.absorcao.value,80);
await vehicle._aplicarDano({valor:30,isCura:true});assert.equal(vehicle.system.absorcao.value,80);
assert.equal(rules.structuralDamage(vehicle.system,50,{repair:true}).after,100);
assert.equal(rules.cargoWeight([{type:'Pertence',system:{peso:2,quant:3}},weapon],4),10);
console.log('PASS damage/ARM, repairs, collapse, native damage dispatch and cargo');

const linked={modo:'vinculado',operador:operator.uuid,habilidade:skill.id};
assert.equal((await actions.resolveOperator(linked)).total,11);
operator.system.atributos.INT=5;assert.equal((await actions.resolveOperator(linked)).total,13);
operator.items.set('effect',{type:'Efeito',name:'Bênção',system:{ativo:true,atributo:'INT',tipo:'+',valor:2}});
assert.equal((await actions.resolveOperator(linked)).total,15);
operator.items.delete('effect');
operator.items.set('profession',{type:'Profissao',system:{grupo_pen:'outro'}});
operator.system.hab_nata=skill.name;operator.system.estagio=8;
assert.equal((await actions.resolveOperator(linked)).total,15);
operator.items.delete('profession');operator.system.hab_nata='';
skill.system.nivel=0;assert.deepEqual(rules.skillTotal(operator,skill),{total:-7,trained:false});skill.system.nivel=6;
game.user.isGM=false;
await assert.rejects(actions.resolveOperator({modo:'manual',totalManual:20}));
operator.isOwner=false;await assert.rejects(actions.resolveOperator(linked));operator.isOwner=true;
assert.equal((await actions.resolveOperator(linked)).total,13);
weapon.isOwner=false;await assert.rejects(actions.rollWarWeapon(weapon,{}));weapon.isOwner=true;
game.user.isGM=true;
await assert.rejects(actions.resolveOperator({...linked,habilidade:'missing'}));
console.log('PASS live skill total, untrained column, ownership and missing operator');

const shot={category:'L',defense:2,adjustment:0};
die=10;
const result=await actions.rollWarWeapon(weapon,shot);
assert.equal(result.attack.column,8);
assert.equal(weapon.system.municao,4);assert.equal(weapon.system.recargaRestante,0);
assert.match(messages.at(-1).flavor,/Balista/);
assert.doesNotMatch(messages.at(-1).flavor,/Aplicar Cura/);
weapon.system.recargaRestante=99; // Old saved timers must never block a shot now.
await actions.rollWarWeapon(weapon,shot);assert.equal(weapon.system.municao,3);
weapon.system.recargaRestante=0;weapon.system.municao=0;
await assert.rejects(actions.rollWarWeapon(weapon,shot),/munição/);
weapon.system.municao=5;vehicle.system.tripulacao.atual=0;
await assert.rejects(actions.rollWarWeapon(weapon,shot),/Tripulação/);
vehicle.system.tripulacao.atual=2;weapon.system.operadoresAtuais=0;
assert.equal(rules.weaponProblem(weapon,vehicle),null); // Crew now comes from the vehicle.
vehicle.system.absorcao.value=0;
await assert.rejects(actions.rollWarWeapon(weapon,shot),/inoperante/);
vehicle.system.absorcao.value=100;weapon.system.desativada=true;
await assert.rejects(actions.rollWarWeapon(weapon,shot),/desativada/);weapon.system.desativada=false;
console.log('PASS native attack card, defense, ammunition, obsolete reload ignored, vehicle crew and disabled structure');

weapon.system.operacao.totalManual=42;weapon.system.recargaRestante=0;
const high=await actions.rollWarWeapon(weapon,shot);assert.equal(high.attack.column,20);assert.equal(high.attack.extraDamage,50);
weapon.system.operacao.totalManual=10;weapon.system.recargaRestante=0;
die=20;hooks.length=0;await actions.rollWarWeapon(weapon,{category:'L',defense:0,adjustment:0});
assert.match(messages.at(-1).flavor,/Crítico/);
assert.equal(hooks.some(h=>h[0]==='tagmar_Critico'),false);
weapon.system.recargaRestante=0;die=1;await actions.rollWarWeapon(weapon,shot);
assert.doesNotMatch(messages.at(-1).flavor,/class="aplicarDano/);
const normal=new tagmarItem({type:'Combate',name:'Espada',system:{tipo:'Corte',dano:rules.damageTable(5),descricao:''}},{parent:vehicle});
await normal.combateToChat(10,'cinza',false,false,false,false,new Roll('1d20'),'',10);
assert.equal(hooks.some(h=>h[0]==='tagmar_Critico'),true);
console.log('PASS AAC20, critical/fumble handling, legacy weapon critical preserved');

die=10;vehicle.system.manobra={...linked,ajuste:-2};
await actions.rollManeuver(vehicle,1);assert.match(messages.at(-1).flavor,/Manobra/);
assert.match(messages.at(-1).flavor,/12/);
vehicle.system.tripulacao.atual=0;await assert.rejects(actions.rollManeuver(vehicle),/Tripulação/);
vehicle.system.tripulacao.atual=2;skill.system.nivel=0;
await actions.rollManeuver(vehicle,100);assert.match(messages.at(-1).flavor,/-7/);
console.log('PASS maneuver uses native skill resolution, penalties, crew and untrained -7');

weapon.system.recargaRestante=0;weapon.system.municao=5;
globalThis.Dialog=class {constructor(){throw Error('Attack/maneuver must not open a dialog');}};
vehicle.system.inf_ataque={cat_def:'M',valor_def:3,bonus:2};weapon.system.def_m=4;
const direct=await actions.attackDialog(weapon);assert.equal(direct.attack.column,13);assert.equal(weapon.system.municao,4);
weapon.system.municao=5;
await Promise.all([actions.attackFromSheet(weapon),actions.attackFromSheet(weapon)]);
assert.equal(weapon.system.municao,4);
console.log('PASS direct roll uses sheet defense/bonus/category without dialog; duplicate local clicks yield a single shot');

skill.system.nivel=6;
const secondSkill={...skill,id:'pilot',name:'Pilotagem',system:{...skill.system,nivel:3}};
const second={...operator,uuid:'Actor.second',name:'João',system:{atributos:{INT:1},bonus_habil:0},items:new Map([[secondSkill.id,secondSkill]])};
second.items.find=fn=>[...second.items.values()].find(fn);
second.items.filter=fn=>[...second.items.values()].filter(fn);
const registry=new Map([[operator.uuid,operator],[second.uuid,second]]);
globalThis.fromUuid=async uuid=>registry.get(uuid);
game.actors=[operator,second];
const multi={...linked,operadores:[{operador:second.uuid,habilidade:secondSkill.id}]};
assert.equal(operators.bindings(multi).length,2);
assert.equal((await actions.resolveOperator(multi,second.uuid)).total,5);
assert.equal((await actions.resolveOperator(multi,operator.uuid)).total,13);
await assert.rejects(actions.resolveOperator(multi,'Actor.outside'),/vinculados/);
const form={'system.manobra.operador':second.uuid,'system.manobra.habilidade':skill.id};
operators.syncOperatorForm(multi,'system.manobra',form);
assert.equal(form['system.manobra.habilidade'],secondSkill.id);
assert.equal(form['system.manobra.operadores'].length,2);
assert.equal(operators.searchName('JOÃO'),operators.searchName('joao'));
game.user.isGM=false;operator.isOwner=false;
const field=await operators.rollOperatorField(multi);
assert.match(field,/João/);assert.doesNotMatch(field,/Capitão/);
assert.equal((await operators.operatorOptions(multi)).actors.length,2);
assert.equal((await operators.operatorOptions(multi)).skills[0].label,'Habilidade indisponível');
weapon.system.operacao=multi;weapon.system.municao=8;
await assert.rejects(actions.attackFromSheet(weapon));
const selected=await actions.rollWarWeapon(weapon,{...shot,operator:second.uuid});
assert.equal(selected.attack.column,3);
assert.match(messages.at(-1).flavor,/João/);
vehicle.system.manobra={...multi,ajuste:0};
await assert.rejects(actions.maneuverFromSheet(vehicle));
await actions.rollManeuver(vehicle,0,second.uuid);assert.match(messages.at(-1).flavor,/João/);
second.isOwner=false;await assert.rejects(actions.rollWarWeapon(weapon,{...shot,operator:second.uuid}));
second.isOwner=true;registry.delete(second.uuid);await assert.rejects(actions.resolveOperator(multi,second.uuid));
registry.set(second.uuid,second);operator.isOwner=true;game.user.isGM=true;
const previousSkill=skill.id;
await operators.linkOperator(vehicle,'manobra',second.uuid,secondSkill.id);
assert.equal(operators.bindings(vehicle.system.manobra).length,2);
assert.equal(vehicle.system.manobra.operador,second.uuid);
assert.equal(operators.bindings(vehicle.system.manobra).find(row=>row.operador===operator.uuid).habilidade,previousSkill);
Dialog.confirm=async data=>data.yes();
await operators.removeOperator(vehicle,'manobra');
assert.equal(operators.bindings(vehicle.system.manobra).length,1);
assert.equal(vehicle.system.manobra.operador,operator.uuid);
assert.deepEqual(rules.shotUpdate({controlarMunicao:false,recarga:99}),{});
console.log('PASS multiple operators, legacy links, per-character skills, selected rolls, revoked permissions, deleted actors, add/remove and accent-insensitive search');

// Regression from the reported world: manual maneuver, weapon independently linked with no operator.
vehicle.system.manobra={modo:'manual',totalManual:10,ajuste:2,operadores:[],operador:'',habilidade:''};
weapon.system.operacao={modo:'vinculado',totalManual:0,operadores:[],operador:'',habilidade:''};
weapon.system.municao=10;
await actions.maneuverFromSheet(vehicle);assert.match(messages.at(-1).flavor,/12/);
vehicle.system.manobra.ajusteCircunstancial=3;
await actions.maneuverDialog(vehicle);assert.match(messages.at(-1).flavor,/15/);
await actions.rollManeuver(vehicle);assert.match(messages.at(-1).flavor,/12/);
await assert.rejects(actions.attackFromSheet(weapon));assert.equal(weapon.system.municao,10);
const manualShot=await actions.rollWarWeapon(weapon,{...shot,mode:'manual',manualTotal:10});
assert.equal(manualShot.attack.column,8);
assert.equal(weapon.system.operacao.modo,'vinculado','One-off manual roll must not change stored weapon configuration');
game.user.isGM=false;
await assert.rejects(actions.rollWarWeapon(weapon,{...shot,mode:'manual',manualTotal:99}),/mestre/);
game.user.isGM=true;
await assert.rejects(actions.rollWarWeapon(weapon,{...shot,mode:'manual',manualTotal:'NaN'}),/numérico/);
console.log('PASS manual maneuver 10+2, independent weapon mode, GM manual attack without bindings, permissions and invalid totals');
assert.ok(schema.Actor.types.includes('Veiculo')&&schema.Item.types.includes('Arma_Guerra'));
console.log('All vehicle tests passed. Live Foundry rendering remains a separate validation.');
