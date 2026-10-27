import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {barVisible,installBarVisibility,registerBarVisibility,BAR_SETTING} from '../modules/compat/barbrawl-visibility.mjs';
const namespace=process.argv[2]??'tagmar_rpg';
const source=fs.readFileSync(process.argv[3] ?? `${process.env.LOCALAPPDATA}/FoundryVTT/Data/modules/barbrawl/module/api.js`,'utf8');
class Token {
  #document;
  constructor(document) {this.#document=document;this.hover=false;this.controlled=false;this.inCombat=false;this.layer={highlightObjects:false};this.bars=new Container();}
  get document(){return this.#document;}
}
class Container extends EventEmitter {
  children=[];visible=true;
  add(child){this.children.push(child);this.emit('childAdded',child,this,this.children.length-1);return child;}
}
globalThis.CONST={TOKEN_DISPLAY_MODES:{NONE:0,CONTROL:10,OWNER_HOVER:20,HOVER:30,OWNER:40,ALWAYS:50},TOKEN_DISPOSITIONS:{HOSTILE:-1}};
globalThis.foundry={canvas:{placeables:{Token}},utils:{getProperty:(obj,path)=>path.split('.').reduce((o,k)=>o?.[k],obj)}};
const values={hideHostile:false,[BAR_SETTING]:'individual'},definitions=new Map();
globalThis.game={system:{id:namespace},user:{isGM:true},settings:{get:(_ns,key)=>values[key],register:(ns,key,data)=>{assert.equal(ns,namespace);definitions.set(key,data);}},modules:new Map()};
const api=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
game.modules.set('barbrawl',{active:true,api});
registerBarVisibility(game);
assert.equal(definitions.get(BAR_SETTING).scope,'world');assert.equal(definitions.get(BAR_SETTING).restricted,true);
assert.equal(definitions.get(BAR_SETTING).default,'individual');
const flags={bar1:{id:'bar1',attribute:'custom',value:5,max:10,otherVisibility:0,ownerVisibility:50,gmVisibility:-1}};
const doc={isOwner:true,disposition:-1,flags:{barbrawl:{resourceBars:flags}},getFlag:()=>flags,
  bar1:{attribute:'system.ef'},bar2:{},_source:{displayBars:40},getBarAttribute:()=>({value:5,max:10})};
const token=new Token(doc);
for(const isGM of [false,true])for(const owner of [false,true])for(const other of [0,10,30,35,50])for(const own of [-1,0,10,30,35,50])for(const gm of [-1,0,10,30,35,50]) {
  game.user.isGM=isGM;doc.isOwner=owner;
  const bar={...flags.bar1,otherVisibility:other,ownerVisibility:own,gmVisibility:gm};
  const original=structuredClone(bar);
  for(const hover of [false,true])for(const controlled of [false,true]) {
    token.hover=hover;token.controlled=controlled;
    assert.equal(barVisible(token,bar,'individual',api),api.isBarVisible(token,structuredClone(bar)));
    const mode=isGM&&gm!==-1?gm:owner&&own!==-1?own:other;
    assert.equal(barVisible(token,bar,'hover',api),mode!==0&&hover);
    assert.equal(barVisible(token,bar,'hoverControl',api),mode!==0&&(hover||controlled));
    assert.deepEqual(bar,original,'Never rewrite saved visibility');
  }
}
game.user.isGM=false;doc.isOwner=false;token.hover=true;token.controlled=false;
values.hideHostile=true;
assert.equal(barVisible(token,{...flags.bar1,otherVisibility:50},'hover',api),false);
values.hideHostile=false;doc.isOwner=true;
for (const [condition,value] of [['hideFull',10],['hideEmpty',0],['hideCombat',5],['hideNoCombat',5]]) {
  token.inCombat=condition==='hideCombat';
  const bar={...flags.bar1,ownerVisibility:30,[condition]:true,value};
  assert.equal(barVisible(token,bar,'hover',api),false,condition);
  assert.equal(barVisible(token,bar,'hoverControl',api),false,condition);
}
token.inCombat=false;token.hover=false;token.layer.highlightObjects=true;
assert.equal(barVisible(token,flags.bar1,'hover',api),false,'Alt does not override strict hover');
assert.equal(barVisible(token,{...flags.bar1,ownerVisibility:30},'individual',api),true,'Original Alt behavior restored');
const legacy={id:'legacy',attribute:'custom',value:5,max:10,visibility:20};
token.hover=true;const savedLegacy=structuredClone(legacy);
assert.equal(barVisible(token,legacy,'hover',api),true);assert.deepEqual(legacy,savedLegacy);

// Integration uses actual API with asynchronous child creation and real hooks ordering.
game.user.isGM=true;doc.isOwner=true;token.hover=false;token.controlled=false;token.layer.highlightObjects=false;
const snapshot=JSON.stringify(doc.flags),canvas={ready:true,tokens:{placeables:[token]}};
let next=0;const callbacks=new Map();
const Hooks={on(name,fn){const id=++next;callbacks.set(id,{name,fn});return id;},off:(_n,id)=>callbacks.delete(id)};
const hook=(name,...args)=>{for(const entry of callbacks.values())if(entry.name===name)entry.fn(...args);};
const errors=[];
values[BAR_SETTING]='hover';
const integration=installBarVisibility({game,canvas,Hooks,onError:(...e)=>errors.push(e)});
const child=token.bars.add({name:'bar1',visible:true});
assert.equal(child.visible,false,'Async-created bar receives override before display');
assert.equal(token.bars.visible,true,'Native parent visibility untouched');
token.hover=true;api.refreshBarVisibility(token);hook('hoverToken',token);assert.equal(child.visible,true);
token.hover=false;token.controlled=true;api.refreshBarVisibility(token);hook('controlToken',token);assert.equal(child.visible,false);
values[BAR_SETTING]='hoverControl';integration.refreshAll();assert.equal(child.visible,true);
token.controlled=false;hook('refreshToken',token,{});assert.equal(child.visible,false);
values[BAR_SETTING]='individual';integration.refreshAll();assert.equal(child.visible,true,'Restore original always rule without reloading');
assert.equal(JSON.stringify(doc.flags),snapshot,'Settings and interaction do not mutate source flags');
assert.equal(token.bars.listenerCount('childAdded'),1);integration.refreshAll();assert.equal(token.bars.listenerCount('childAdded'),1);
const oldContainer=token.bars;token.bars=new Container();hook('drawToken',token);
assert.equal(oldContainer.listenerCount('childAdded'),0);assert.equal(token.bars.listenerCount('childAdded'),1);
hook('canvasTearDown');assert.equal(token.bars.listenerCount('childAdded'),0);
hook('canvasReady');assert.equal(token.bars.listenerCount('childAdded'),1);
hook('destroyToken',token);assert.equal(token.bars.listenerCount('childAdded'),0);
integration.destroy();assert.equal(callbacks.size,0);
game.modules.get('barbrawl').active=false;
const disabled=installBarVisibility({game,canvas,Hooks});assert.equal(token.bars.listenerCount('childAdded'),0);disabled.destroy();
assert.deepEqual(errors,[]);
// Boot real e onChange da opção global: não depende de recarregar o mundo.
game.modules.get('barbrawl').active=true;game.tagmar={};
const once=new Map();globalThis.Hooks={...Hooks,once:(name,fn)=>once.set(name,fn)};
globalThis.canvas=canvas;
const integrationSource=fs.readFileSync(new URL('../modules/compat/barbrawl-visibility.mjs',import.meta.url),'utf8');
await import(`data:text/javascript;base64,${Buffer.from(integrationSource).toString('base64')}`);
once.get('init')();once.get('ready')();
const rendered=token.bars.add({name:'bar1',visible:true});
values[BAR_SETTING]='hover';definitions.get(BAR_SETTING).onChange();assert.equal(rendered.visible,false);
token.hover=true;hook('hoverToken',token);assert.equal(rendered.visible,true);
token.hover=false;values[BAR_SETTING]='individual';definitions.get(BAR_SETTING).onChange();assert.equal(rendered.visible,true);
game.tagmar.barVisibility.destroy();assert.equal(callbacks.size,0);
delete globalThis.Hooks;
console.log('PASS: installed Bar Brawl API, GM/owner/other permission matrix, hidden hostile bars, full/empty/combat rules, strict hover, restoration, legacy flags, async rendering and lifecycle cleanup; no document writes.');
