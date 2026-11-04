const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TAGMAR_TEST_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..'),out=process.env.TAGMAR_CRITICAL_OUTPUT||path.join(root,'../critical-preview-20261103');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const native=path.join(process.env.TAGMAR_TEST_FOUNDRY||'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app','public');
 const serve=async(req,res)=>{try{
  const name=new URL(req.url,'http://local/').pathname;
  if(name==='/')return res.end('<html><head><link rel="stylesheet" href="/native/css/foundry2.css"><link rel="stylesheet" href="/css/sheet.css"><style>body{margin:0;padding:18px;background:#141017;color:#dacec6;display:flex;align-items:flex-start;gap:24px;font:14px Arial}.chat-message{flex:none;width:330px;max-height:950px;overflow:auto;padding:12px;background:#e6e2ce;color:#25221f;border-radius:6px}.sheet-demo{width:660px;flex:none;border:4px solid #645566;background:#1c1721;padding:12px}.sheet-demo h2{font:25px Arial}.sheet-demo input,.sheet-demo select{background:#342c3a;color:#e4d7cc}.sheet-demo .prim-tabs{display:flex;gap:30px}.sheet-demo .tab{display:none}.sheet-demo .tab.active{display:block}.sheet-demo table{margin-top:15px}.sheet-demo h3{font:22px Arial}.sheet-demo button{color:#dacec6}</style></head><body><article class="chat-message message"><div class="message-content"></div></article><section class="sheet-demo form_tagmar"><h2>PNJ — alvo do crítico</h2><nav class="prim-tabs"><label><a data-tab="basico">Básico</a></label></nav><div class="sheet-primary"><div class="tab" data-tab="basico"></div></div></section></body></html>');
  const file=name.startsWith('/native/')?path.join(native,name.slice(8)):path.join(root,name);
  if(!path.resolve(file).startsWith(path.resolve(name.startsWith('/native/')?native:root)))throw Error('Invalid path');
  res.setHeader('Content-Type',name.endsWith('.mjs')||name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.statusCode=404;await res.end('');}};
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1120,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://critical.test/**',async route=>{
   const headers={};const res={statusCode:200,setHeader:(k,v)=>headers[k]=v,end:body=>route.fulfill({status:res.statusCode,headers,body:body??''})};
   await serve({url:route.request().url()},res);
  });
  await page.goto('http://critical.test/');
  const source=await fs.readFile(path.join(root,'modules/tagmar.js'),'utf8');
  const start=source.indexOf('async function rolarCritico('),fn=source.slice(start,source.indexOf("\ndocument.addEventListener('mousedown'",start));
  await page.evaluate(async fn=>{
   window.mod=await import('/modules/critical-consequences.mjs');window.rules=await import('/modules/critical-rules.mjs');
   class Collection extends Map{get contents(){return [...this.values()];}[Symbol.iterator](){return this.values();}}
   const assign=(o,k,v)=>{const keys=k.split('.'),last=keys.pop();for(const key of keys)o=o[key]??={};o[last]=structuredClone(v);};
   window.changes=[];window.warnings=[];window.time=0;
   function actor(id){return {uuid:'Scene.s.Token.'+id+'.Actor.a',name:id,type:'NPC',effects:new Collection(),system:{EF:20,EH:40},async createEmbeddedDocuments(_type,rows){return rows.map(data=>{const effect={...structuredClone(data),id:data._id,parent:this,getFlag(s,k){if(!['core','world','tagmar_rpg','tagmar3er-oficial'].includes(s))throw Error('Flag scope invalid: '+s);return k.split('.').reduce((v,key)=>v?.[key],this.flags?.[s]);},async update(data){for(const [k,v] of Object.entries(data))if(k.includes('.'))assign(this,k,v);else this[k]=structuredClone(v);}};this.effects.set(effect.id,effect);changes.push(data);return effect;});}};}
   window.a=actor('Alvo A');window.b=actor('Alvo B');window.attacker=actor('Atacante');
   const token=(id,actor)=>({id,name:actor.name,actor,document:{uuid:'Scene.s.Token.'+id,parent:{id:'s'}}});
   const one=token('one',a),two=token('two',b),source=token('source',attacker);
   window.game={user:{id:'gm',isGM:true,targets:new Set([one,two])},users:[{id:'gm',isGM:true,active:true}],actors:new Collection(),messages:new Collection(),settings:{get:()=>false},modules:new Map([['tagmar-calendario',{active:true,api:{getDate:()=>({year:1500,dayOfYear:0})}}]]),time:{get worldTime(){return time;}}};
   window.selectedTokens={one,two,source};
   window.canvas={scene:{id:'s'},tokens:{placeables:[one,two,source],controlled:[]}};
   window.hookCallbacks=new Map();
   window.Hooks={on:(name,fn)=>{const callbacks=hookCallbacks.get(name)??[];callbacks.push(fn);hookCallbacks.set(name,callbacks);},once:()=>{},callAll:(name,...args)=>{for(const fn of hookCallbacks.get(name)??[])fn(...args);}};
   window.fromUuid=async uuid=>[a,b,attacker].find(a=>a.uuid===uuid);
   window.ui={notifications:{info:text=>{},warn:text=>warnings.push(text)}};
   window.ChatMessage={getSpeaker:()=>({actor:'a'})};
   window.Roll=class{total=1;async evaluate(){}async toMessage(data){return {...data,id:'message',uuid:'ChatMessage.message',async update(update){for(const [k,v] of Object.entries(update))assign(this,k,v);}};}};
   window.rollCritical=new Function('criticalCard',fn+';return rolarCritico;')(mod.criticalCard);
   mod.registerCriticalConsequences();
   for(const color of ['cinza','roxo','azul','vermelho','laranja','amarelo','branco','verde'])for(const type of ['C','MAG'])for(const failure of [false,true]){
    const m=await rollCritical(0,[[0,color]],game.user,attacker,type,failure,{whisper:['gm'],flags:{other:{kept:true}}});
    const d=m.flags.world.tagmarCritical;
    if(d.rows.length!==(failure?1:type==='MAG'?3:7))throw Error('Rows lost for '+color+' '+type+' '+failure+': '+d.rows.length);
    if(!m.flags.other.kept||m.whisper[0]!=='gm')throw Error('Message context was lost');
    const test=document.createElement('div');test.innerHTML=m.flavor;
    if(test.querySelectorAll('[data-critical-open]').length!==d.rows.length)throw Error('Missing buttons');
    if(test.querySelectorAll('.tagmar-critical-choice').length!==d.rows.length||test.querySelector('.tagmar-critical-choice[open]'))throw Error('Categories must start collapsed');
   }
   window.message=await rollCritical(0,[[0,'branco']],game.user,attacker,'C',false);game.messages.set('message',message);
   document.querySelector('.message-content').innerHTML=message.flavor;mod.bindCriticalChat(message,document.querySelector('.chat-message'));
   window.app={actor:a,_tabs:[{active:'efeitos'}]};
  },fn);
  assert.equal(await page.locator('.tagmar-critical-choice[open]').count(),0);
  assert.equal(await page.locator('[data-critical-open]').first().isVisible(),false);
  await page.screenshot({path:path.join(out,'critical-categories-collapsed.png')});
  await page.locator('[data-critical-choice="0"] > summary').click();
  assert.equal(await page.locator('[data-critical-open="0"]').isVisible(),true);
  await page.locator('[data-critical-choice="0"] > summary').click();
  assert.equal(await page.locator('[data-critical-open="0"]').isVisible(),false);
  await page.locator('[data-critical-choice="2"] > summary').click();
  await page.locator('[data-critical-open="2"]').click();
  assert.match(await page.locator('[data-critical-destination]').innerText(),/Nenhum.*selecionado/);
  // Marked targets alone must not apply an effect: only the current selection matters.
  await page.locator('[data-critical-confirm]').click();
  assert.match(await page.locator('[role="status"]').innerText(),/Selecione no mapa/);
  assert.equal(await page.evaluate(()=>changes.length),0);
  await page.evaluate(()=>{canvas.tokens.controlled=[selectedTokens.one];game.user.targets=new Set([selectedTokens.source]);Hooks.callAll('controlToken',selectedTokens.one,true);});
  await page.waitForFunction(()=>document.querySelector('[data-critical-destination]').textContent==='Alvo A');
  assert.equal(await page.locator('[data-critical-part] [data-field="combat"]').inputValue(),'-4');
  assert.equal(await page.locator('[data-critical-part] [data-field="skill"]').inputValue(),'0');
  await page.locator('.tagmar-critical-options summary').click();
  await page.locator('[data-field="combat"]').fill('-7');await page.locator('[data-field="duration"]').fill('2');await page.locator('[data-field="unit"]').selectOption('rounds');
  // Change selection after opening the editor, without sending a hook; confirmation
  // still reads the current selection and never uses the earlier snapshot.
  await page.evaluate(()=>{canvas.tokens.controlled=[selectedTokens.one,selectedTokens.two];});
  await page.locator('[data-critical-confirm]').click();
  await page.waitForFunction(()=>changes.length===2,{},{timeout:5000}).catch(async error=>{throw Error(error.message+' '+JSON.stringify(await page.evaluate(()=>({warnings,changes}))))});
  assert.deepEqual(await page.evaluate(()=>[a.system.EF,b.system.EF]),[20,20]);
  await page.evaluate(()=>{mod.bindCriticalChat(message,document.querySelector('.chat-message'));mod.renderCriticalEffects(app,document.querySelector('.sheet-demo'));});
  assert.equal(await page.locator('[data-critical-undo]').count(),2);
  assert.match(await page.locator('.tagmar-critical-effects').innerText(),/Corte.*|Crítico/);
  assert.match(await page.locator('.tagmar-critical-effects').innerText(),/combate -7/);
  assert.match(await page.locator('.tagmar-critical-effects').innerText(),/30 s/);
  const overflow=await page.locator('.tagmar-critical-editor').evaluate(el=>[...el.querySelectorAll('input,select')].some(e=>e.getBoundingClientRect().right>el.getBoundingClientRect().right+1));assert(!overflow);
  await page.screenshot({path:path.join(out,'critical-card-and-effects.png')});
  await page.locator('[data-critical-undo]').first().click();
  await page.waitForFunction(()=>[...a.effects][0].disabled);
  assert.equal(await page.evaluate(()=>a.effects.size),1);
  await page.evaluate(()=>{mod.bindCriticalChat(message,document.querySelector('.chat-message'));mod.renderCriticalEffects(app,document.querySelector('.sheet-demo'));});
  assert.match(await page.locator('.tagmar-critical-effects').innerText(),/Removida pelo mestre/);
  await page.evaluate(()=>{app.actor=b;mod.renderCriticalEffects(app,document.querySelector('.sheet-demo'));game.messages.delete(message.id);});
  assert.equal(await page.locator('[data-critical-end]').innerText(),'Curado');
  await page.locator('[data-critical-end]').click();
  await page.waitForFunction(()=>[...b.effects][0].disabled);
  assert.equal(await page.evaluate(()=>[...b.effects][0].changes.length),0);
  assert.deepEqual(await page.evaluate(()=>[a.system.EF,b.system.EF]),[20,20]);
  await page.evaluate(()=>mod.renderCriticalEffects(app,document.querySelector('.sheet-demo')));
  assert.match(await page.locator('.tagmar-critical-effects').innerText(),/Removida pelo mestre/);
  await page.evaluate(async()=>{const f=await rollCritical(0,[[0,'azul']],game.user,attacker,'C',false);message=f;document.querySelector('.message-content').innerHTML=f.flavor;mod.bindCriticalChat(f,document.querySelector('.chat-message'));});
  await page.locator('[data-critical-choice="3"] > summary').click();
  await page.locator('[data-critical-open="3"]').click();
  assert.equal(await page.locator('[data-critical-variant]').inputValue(),'');await page.locator('[data-critical-confirm]').click();
  assert.match(await page.locator('[role="status"]').innerText(),/Escolha o caso/);
  await page.locator('[data-critical-variant]').selectOption('1');assert.equal(await page.locator('[data-field="status"]').inputValue(),'unconscious');
  await page.screenshot({path:path.join(out,'conditional-helmet-choice.png')});
  await page.evaluate(async()=>{const f=await rollCritical(0,[[0,'roxo']],game.user,attacker,'C',true);message=f;document.querySelector('.message-content').innerHTML=f.flavor;mod.bindCriticalChat(f,document.querySelector('.chat-message'));});
  await page.locator('[data-critical-choice="0"] > summary').click();
  await page.locator('[data-critical-open="0"]').click();
  assert.match(await page.locator('[data-critical-destination]').innerText(),/Alvo A, Alvo B/);
  assert.equal(await page.evaluate(()=>attacker.effects.size),0);
  await page.evaluate(()=>{canvas.tokens.controlled=[selectedTokens.source];Hooks.callAll('controlToken',selectedTokens.source,true);});
  await page.waitForFunction(()=>document.querySelector('[data-critical-destination]').textContent==='Atacante');
  await page.locator('[data-critical-confirm]').click();
  await page.waitForFunction(()=>attacker.effects.size===1);
  assert.equal(await page.evaluate(()=>[...attacker.effects][0].changes[0].value),'-3');
  await page.evaluate(()=>{
   const legacy=document.createElement('article');legacy.innerHTML='<div class="message-content"><ul><li><b>Falha:</b> Texto antigo <button type="button" data-critical-open="0">Aplicar consequência</button></li></ul></div>';
   const before=JSON.stringify(message.flags);mod.bindCriticalChat(message,legacy);
   if(legacy.querySelectorAll('.tagmar-critical-choice').length!==1||legacy.querySelector('.tagmar-critical-choice').open||before!==JSON.stringify(message.flags))throw Error('Old card compaction must be local and preserve metadata');
  });
  await page.evaluate(()=>{game.user.isGM=false;mod.bindCriticalChat(message,document.querySelector('.chat-message'));});
  assert.equal(await page.locator('[data-critical-open],[data-critical-confirm],[data-critical-undo]').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: categories initially collapsed, click to reveal description/actions, old cards compacted locally, selected recipients, duration/Curado, undo, conditional equipment and GM permissions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
