const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TAGMAR_TEST_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..'),base='C:/Users/PIRATA/OneDrive/Documentos/ChatGPT/FOUNDRY VTT';
const native=path.join(process.env.TAGMAR_TEST_FOUNDRY||'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app','public');
const fx=path.join(base,'modulos_foundry/tagmar-token-fx');
const out=process.env.TAGMAR_CRITICAL_OUTPUT||path.join(base,'outputs/critical-damage-percent-20261103');
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:460,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://damage.test/**',async route=>{
   const name=new URL(route.request().url()).pathname;
   if(name==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<html><head><link rel="stylesheet" href="/native/css/foundry2.css"><link rel="stylesheet" href="/css/sheet.css"><style>body{padding:20px;background:#17121c;color:#241f17;font:14px Arial}.chat-message{background:#e8e5d2;padding:12px;border:2px solid #918875;width:340px;border-radius:5px}.message-content>img{display:none!important}.message-content button{color:#282218;background:rgba(255,255,255,.35)}.message-content button:hover{background:#e4d5a2}.rola{color:#252016}</style></head><body><article class="chat-message"><div class="message-content"></div></article></body></html>'});
   const filename=name.startsWith('/native/')?path.join(native,name.slice(8)):name.startsWith('/fx/')?path.join(fx,name.slice(4)):name.startsWith('/icons/')?path.join(native,name):path.join(root,name);
   try{return route.fulfill({body:await fs.readFile(filename),contentType:/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://damage.test/');
  const itemSource=await fs.readFile(path.join(root,'modules/tagmarItem.js'),'utf8');
  const method=(name,next)=>itemSource.slice(itemSource.indexOf(`    ${name==='help'?'_chatActionButtons':'async '+name}(`),itemSource.indexOf(`    async ${next}(`)).replace(/let dadosColoridos = await import\([^;]+;/g,'let dadosColoridos = {};');
  const methods=method('help','_curaFixaToChat')+method('combateToChat','combateToChatPlus')+method('combateToChatPlus','rollCombate');
  const bootstrap=await fs.readFile(path.join(root,'modules/tagmar.js'),'utf8'),start=bootstrap.indexOf('async function aplicarDanoPeloChat('),end=bootstrap.indexOf("Hooks.on('tagmar_Critico'",start);
  await page.evaluate(async({methods,handler})=>{
   window.mod=await import('/modules/critical-consequences.mjs');window.fxChat=await import('/fx/scripts/attack-chat.mjs');
   window.calls=[];window.warnings=[];window.criticalCalls=0;
   window.foundry={utils:{escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')}};
   window.game={system:{id:'tagmar_rpg'},user:{id:'gm',isGM:true},settings:{get:()=>false},tagmar:{tabela_resol:[],rolarCritico:async()=>({id:'critical-resolution'})}};
   window.ui={notifications:{warn:text=>warnings.push(text),error:text=>warnings.push(text)}};
   window.ChatMessage={getSpeaker:()=>({actor:'archer'})};
   window.Hooks={callAll:()=>{}};
   const actor={name:'Selecionado',uuid:'Actor.selected',isOwner:true,async _aplicarDano(data,token){calls.push({data,token:token.id});}};
   window.selected={id:'selected',name:'Selecionado',actor,document:{uuid:'Scene.s.Token.selected'}};
   window.other={id:'other',actor:{isOwner:true,async _aplicarDano(){throw Error('Unselected token was hit');}}};
   window.canvas={tokens:{controlled:[selected]}};
   window.game.user.targets=new Set([other]);
   const Weapon=new Function('return class {'+methods+'}')();window.weapon=new Weapon();
   Object.assign(weapon,{id:'weapon',actor:{name:'Arqueiro',uuid:'Actor.archer'},name:'Arco de Guerra',img:'icons/svg/sword.svg',type:'Combate',flags:{},system:{descricao:'Teste de dano crítico',tipo:'C',penalidade:{},dano:Object.fromEntries(Array.from({length:12},(_,i)=>['d'+(i+1)*25,(i+1)*5]))},_tagmarCriticalToChat:async()=>{criticalCalls++;}});
   const click=new Function(handler+';return aplicarDanoPeloChat;')();document.addEventListener('click',click);
   window.renderMessage=data=>{window.message=data;document.querySelector('.message-content').innerHTML=data.flavor;};
   window.makeRoll=()=>({total:20,async toMessage(data){renderMessage(data);return {id:'attack'};}});
   window.showCard=async(method='combateToChat',color='cinza',compact=true)=>{
    const args=[0,color,false,false,false,false,makeRoll(),'',0];if(method==='combateToChatPlus')args.push(50);
    await weapon[method](...args);if(compact)mod.compactCriticalDamage(message,document.querySelector('.chat-message'));
   };
   await showCard('combateToChat','cinza',false);
  },{methods,handler:bootstrap.slice(start,end)});
  assert.deepEqual(await page.locator('button.aplicarDano').allTextContents(),['Aplicar 25% Dano','Aplicar 50% Dano','Aplicar 75% Dano','Aplicar 100% Dano']);
  const before=await page.locator('button.aplicarDano').evaluateAll(bs=>bs.map(b=>({...b.dataset})));
  await page.evaluate(()=>mod.compactCriticalDamage(message,document.querySelector('.chat-message')));
  assert.deepEqual(await page.locator('button.aplicarDano').evaluateAll(bs=>bs.map(b=>({...b.dataset}))),before);
  assert.deepEqual(await page.locator('.tagmar-damage-percent').allTextContents(),['25%','50%','75%','100%']);
  assert.deepEqual(await page.locator('.tagmar-critical-damage tbody td').allTextContents(),['5','10','15','20']);
  assert.equal(await page.locator('.tagmar-critical-damage').count(),1);
  assert.equal(await page.locator('.message-content table').count(),1);
  assert.match(await page.locator('.tagmar-damage-percent').first().getAttribute('title'),/25%: 5 pontos/);
  for(const percent of ['25%','50%','75%','100%'])await page.locator('.tagmar-damage-percent').filter({hasText:percent}).click();
  await page.waitForFunction(()=>calls.length===4);
  assert.deepEqual(await page.evaluate(()=>calls.map(c=>[c.data.valor,c.data.isCritico,c.data.isCura,c.token])),[[5,true,false,'selected'],[10,true,false,'selected'],[15,true,false,'selected'],[20,true,false,'selected']]);
  await page.locator('.tagmar-damage-percent').first().press('Enter');await page.waitForFunction(()=>calls.length===5);
  await page.screenshot({path:path.join(out,'clickable-critical-percentages.png')});
  await page.evaluate(()=>mod.compactCriticalDamage(message,document.querySelector('.chat-message')));assert.equal(await page.locator('button.aplicarDano').count(),4);
  await page.evaluate(()=>{canvas.tokens.controlled=[];});await page.locator('.tagmar-damage-percent').first().click();
  assert.equal(await page.evaluate(()=>calls.length),5);assert.match(await page.evaluate(()=>warnings.at(-1)),/Nenhum token selecionado/);
  await page.evaluate(()=>{canvas.tokens.controlled=[selected];game.user.isGM=false;selected.actor.isOwner=false;});await page.locator('.tagmar-damage-percent').first().click();assert.equal(await page.evaluate(()=>calls.length),5);
  await page.evaluate(()=>{game.user.isGM=true;selected.actor.isOwner=true;});
  for(const method of ['combateToChat','combateToChatPlus'])for(const color of ['cinza','verde']){
   await page.evaluate(args=>showCard(...args),[method,color]);assert.equal(await page.locator('.tagmar-damage-percent').count(),4);assert.equal(await page.locator('.message-content table').count(),1);
  }
  await page.evaluate(async()=>{weapon.flags={tagmarSync:{healTarget:'EF'}};await showCard();});
  assert.equal(await page.locator('.tagmar-damage-percent').count(),0);assert.equal(await page.locator('.aplicarDano[data-cura="true"][data-cura-tipo="EF"]').count(),4);
  await page.locator('.aplicarDano').first().click();await page.waitForFunction(()=>calls.length===6);assert.deepEqual(await page.evaluate(()=>calls.at(-1).data),{valor:5,isCura:true,curaTipo:'EF',isCritico:false});
  await page.evaluate(async()=>{weapon.flags={};await showCard('combateToChat','vermelho');});
  assert.equal(await page.locator('.tagmar-damage-percent').count(),0);assert.equal(await page.locator('button.aplicarDano').count(),2);
  await page.evaluate(async()=>{await fxChat.attackToChat(weapon,selected,makeRoll(),{total:0,column:0,color:'cinza',critical:true},{whisper:['gm'],requestId:'request'});mod.compactCriticalDamage(message,document.querySelector('.chat-message'));});
  assert.equal(await page.locator('.tagmar-damage-percent').count(),4);assert.equal(await page.locator('.message-content table').count(),1);assert.equal(await page.locator('.message-content details').count(),0);
  for(const width of [460,350]){await page.setViewportSize({width,height:900});const overflow=await page.locator('.tagmar-critical-damage').evaluate(e=>[...e.querySelectorAll('button')].some(b=>b.getBoundingClientRect().right>e.getBoundingClientRect().right+1));assert(!overflow);}
  assert.deepEqual(errors,[]);console.log('PASS: actual attack/fumble/overflow cards, old controls moved into table headers, exact damage attributes, selected-token native dispatch, keyboard, permissions, healing unchanged, FX cards without duplicate controls and compact widths.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
