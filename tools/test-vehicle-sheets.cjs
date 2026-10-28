// Visual/layout smoke test with production templates, styles and sheet getData.
// Does not connect to a user's world. Set FOUNDRY_APP and NODE_DEPS if needed.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const app=process.env.FOUNDRY_APP||'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app';
const deps=process.env.NODE_DEPS||'C:/Users/PIRATA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(deps,'playwright'));
const H=require(path.join(app,'node_modules/handlebars'));
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../../outputs/vehicle-direct-20261027');
const merge=(a,b)=>{const r=structuredClone(a);for(const [k,v]of Object.entries(b))r[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(r[k]??{},v):v;return r;};
class Sheet {
 constructor(document){this.document=document;this.actor=document;this.item=document;}
 static get defaultOptions(){return {};}
 async getData(){return {editable:true};}
 async _updateObject(event,data){this.lastForm=data;for(const [key,value]of Object.entries(data)){const parts=key.split('.'),last=parts.pop();let obj=this.document;for(const part of parts)obj=obj[part]??={};obj[last]=value;}}
 async _onChangeInput(){await this.nextChangePromise;}
 activateListeners(){}
 _getSubmitData(){return {};}
}
global.foundry={applications:{ux:{TextEditor:{enrichHTML:async text=>text}}},appv1:{sheets:{ActorSheet:Sheet,ItemSheet:Sheet}},utils:{mergeObject:merge}};
global.game={system:{id:'tagmar_rpg'},actors:[],user:{isGM:true}};
global.fromUuid=async()=>null;
H.registerHelper('editor',(content,options)=>new H.SafeString('<div class="editor"><a class="editor-edit" title="Editar biografia">Editar</a><div class="editor-content" data-edit="'+options.hash.target+'">'+content+'</div></div>'));
H.registerHelper('checked',value=>value?'checked':'');
H.registerHelper('selectOptions',(options,context)=>{
 const {selected,valueAttr='value',labelAttr='label'}=context.hash;
 const values=Array.isArray(options)?options.map(o=>[o[valueAttr],o[labelAttr]]):Object.entries(options);
 return new H.SafeString(values.map(([value,label])=>`<option value="${H.escapeExpression(value)}" ${value===selected?'selected':''}>${H.escapeExpression(label)}</option>`).join(''));
});
(async()=>{
 const {VehicleSheet,WarWeaponSheet}=await import(pathToFileURL(path.join(root,'modules/vehicles/sheets.mjs')));
 const schema=JSON.parse(fs.readFileSync(path.join(root,'template.json')));
 const vehicle={id:'boat',name:'Estrela do Mar',type:'Veiculo',img:'/icons/svg/anchor.svg',flags:{},isOwner:true,system:merge(schema.Actor.templates.base,schema.Actor.Veiculo),items:[]};
 Object.assign(vehicle.system,{absorcao:{value:170,max:200},arm:12,vb:20,carga:{max:2000},tripulacao:{minima:6,atual:8}});
 const weapon={id:'ballista',name:'Balista de proa',type:'Arma_Guerra',img:'/icons/svg/sword.svg',system:merge(schema.Item.templates.base,schema.Item.Arma_Guerra),actor:vehicle};
 Object.assign(weapon.system,{dano25:15,alcance:'Até 200 m',municao:12,recarga:2});
 vehicle.system.manobra.modo='vinculado';weapon.system.operacao.modo='vinculado';
 vehicle.system.notas='Construído em Calco.\nCapitão: Gonçalves & filhos.';
 vehicle.items.push(weapon,{id:'cargo',type:'Pertence',name:'Caixa de provisões',img:'/icons/svg/item-bag.svg',system:{peso:10,quant:3}});
 vehicle.items.push({...weapon,id:'ballista2',name:'Balista de popa'});
 vehicle.items.push({id:'cargo2',type:'Pertence',name:'Corda',img:'/icons/svg/item-bag.svg',system:{peso:2,quant:4}});
 const data=await new VehicleSheet(vehicle).getData({});assert.equal(data.cargoWeight,38);assert.match(data.biographyHTML,/Calco\.<br>Capitão: Gonçalves &amp; filhos/);assert.equal(vehicle.system.notas,'Construído em Calco.\nCapitão: Gonçalves & filhos.');
 const weaponData=await new WarWeaponSheet(weapon).getData({});assert.equal(weaponData.damage.d100,60);
 const sheet=new VehicleSheet(vehicle);await sheet._updateObject(null,{'system.absorcao.value':999,'system.absorcao.max':200,'system.arm':-4});
 assert.equal(sheet.lastForm['system.absorcao.value'],200);assert.equal(sheet.lastForm['system.arm'],0);
 // Exercise the production click handler: weapon name rolls directly.
 const handlers=new Map();
 const html={find:selector=>({each(){return this;},on(event,handler){handlers.set(selector+':'+event,handler);return this;}})};
 sheet.isEditable=true;sheet.element={toggleClass(){}};game.settings={get:()=> 'foundry'};
 vehicle.items.get=id=>vehicle.items.find(item=>item.id===id);
 weapon.isOwner=true;
 let shownDialog;
 global.Dialog=class {constructor(data){shownDialog=data;}render(){return this;}};
 const recorded=[];
 global.ui={notifications:{warn:message=>{throw Error(message);}}};
 global.Roll=class {async evaluate(){this.total=10;return this;}};
 game.tagmar={tabela_resol:[[5,...Array(20).fill('verde')]],tagmarItem:class {
  constructor(data){Object.assign(this,data);}
  async rollHabilidade(){recorded.push({maneuver:this.system.total});}
  async combateToChat(column){recorded.push({attack:column});}
 }};
 weapon.system.operacao={modo:'manual',totalManual:5};weapon.system.controlarMunicao=false;
 sheet.activateListeners(html);
 const click=action=>handlers.get('[data-action]:click')({preventDefault(){},currentTarget:{dataset:{action},closest:()=>({dataset:{itemId:weapon.id}})}});
 await click('attack');assert.equal(recorded.at(-1).attack,5);assert.equal(shownDialog,undefined);
 await click('belonging');assert.match(shownDialog.content,/Transporte/);
 // A click waits for a pending auto-save and uses the manual values visible in the form.
 let releaseChange;sheet.nextChangePromise=new Promise(resolve=>releaseChange=resolve);
 const pending=sheet._onChangeInput({});
 sheet._getSubmitData=()=>({'system.manobra.modo':'manual','system.manobra.totalManual':10});
 const maneuverClick=click('maneuver');releaseChange();await pending;await maneuverClick;
 assert.equal(recorded.at(-1).maneuver,10);assert.match(shownDialog.content,/Transporte/);
 // Embedded weapon controls save on the item and a quick name click waits for them.
 const fieldHandlers={};
 const field={dataset:{weaponField:'operacao.totalManual'},value:'7',closest:()=>({dataset:{itemId:weapon.id}}),addEventListener:(event,handler)=>fieldHandlers[event]=handler};
 html[0]={querySelector:()=>null,querySelectorAll:selector=>selector==='[data-weapon-field]'?[field]:[]};
 let releaseWeapon;
 weapon.update=async changes=>{await new Promise(resolve=>releaseWeapon=resolve);for(const [key,value]of Object.entries(changes))weapon.system.operacao[key.split('.').at(-1)]=value;};
 game.tagmar.tabela_resol.push([7,...Array(20).fill('verde')]);
 sheet.activateListeners(html);
 let stopped=false;fieldHandlers.change({stopPropagation(){stopped=true;}});
 const immediateAttack=click('attack');
 while(!releaseWeapon)await new Promise(resolve=>setTimeout(resolve,0));
 releaseWeapon();await immediateAttack;
 assert.equal(stopped,true);assert.equal(recorded.at(-1).attack,7);assert.equal(weapon.system.operacao.totalManual,7);
 assert.equal(vehicle.system.manobra.totalManual,10);
 vehicle.update=async changes=>sheet._updateObject(null,changes);
 game.user.targets=new Set([{actor:{system:{d_ativa:{categoria:'P',valor:6}}}}]);
 await click('target-defense');assert.equal(vehicle.system.inf_ataque.cat_def,'P');assert.equal(vehicle.system.inf_ataque.valor_def,6);
 vehicle.system.manobra.modo='vinculado';
 assert.equal(VehicleSheet.defaultOptions.tabs[0].initial,'basico');
 const render=(name,data)=>H.compile(fs.readFileSync(path.join(root,'templates/sheets/'+name+'.hbs'),'utf8'))(data);
 const views={vehicle:render('veiculo-sheet',data),weapon:render('arma-guerra-sheet',weaponData)};
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'system.json')));
 const mime={'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff'};
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/preview'){
   const kind=url.searchParams.get('kind')||'vehicle',theme=url.searchParams.get('theme')||'dark';
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end(`<!doctype html><html><head><link rel="stylesheet" href="/css/foundry2.css"><link rel="stylesheet" href="/fonts/fontawesome/css/all.min.css">${manifest.styles.map(p=>`<link rel="stylesheet" href="/systems/tagmar_rpg/${p}">`).join('')}<style>body{margin:0;background:#16141b}.preview{position:absolute!important;left:24px;top:24px;width:${kind==='vehicle'?860:650}px;height:${kind==='vehicle'?820:650}px}.window-content{padding:12px!important}.preview .tab.active{display:block}.sheet-header{align-items:center}</style></head><body class="theme-dark"><section class="app window-app tagmar sheet ${kind==='vehicle'?'actor':'item'} tagmar-vehicle tagmar-${theme}-sheet preview"><header class="window-header"><h4 class="window-title">Prévia de teste — ${kind==='vehicle'?'Veículo / Máquina':'Arma de Guerra'}</h4></header><div class="window-content">${views[kind]}</div></section><script>const tabs=document.querySelectorAll('nav [data-tab]');function tab(id){document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===id));}tabs.forEach(el=>el.onclick=()=>tab(el.dataset.tab));tab(tabs[0].dataset.tab);</script></body></html>`);return;
  }
  const isSystem=url.pathname.startsWith('/systems/tagmar_rpg/');
  const base=isSystem?root:path.join(app,'public');
  const relative=decodeURIComponent(isSystem?url.pathname.slice('/systems/tagmar_rpg/'.length):url.pathname.slice(1));
  const file=path.resolve(base,relative);
  if(!file.startsWith(path.resolve(base)+path.sep)){res.writeHead(403);res.end();return;}
  try {res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:950,height:900}});
  for(const [kind,tabs] of [['vehicle',['basico','combate','pertences','biografia']],['weapon',['basico','operacao','descricao']]]){
   for(const theme of ['dark','foundry']){
    await page.goto(`http://127.0.0.1:${server.address().port}/preview?kind=${kind}&theme=${theme}`);
    for(const tab of tabs){
     await page.locator(`nav [data-tab="${tab}"]`).click();
     const overflow=await page.locator('.sheet-primary').evaluate(el=>el.scrollWidth>el.clientWidth+2);
     assert.equal(overflow,false,`${kind}/${theme}/${tab} overflows horizontally`);
     assert.equal(await page.locator('.tab.active').count(),1);
     const header=await page.locator('.sheet-header').boundingBox();
     const brand=await page.locator('.sheet-header > div').first().boundingBox();
     assert.ok(Math.abs(header.width-brand.width)<2,'Header must fill the sheet width');
          if(kind==='vehicle'&&tab==='basico'){
      const widths=await page.locator('.tab.active input[type=number]').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().width).map(el=>el.getBoundingClientRect().width));assert.ok(widths.every(width=>width<=90),'Vehicle numeric fields stay compact');
      assert.ok(await page.locator('.tab.active .tv-help[title]').count()>10);
     }
     if(kind==='vehicle'&&tab==='biografia'){assert.equal(await page.locator('.tab.active .tc-guide').count(),1);assert.equal(await page.locator('.tab.active [data-edit="system.notas"]').count(),1);}
     if(kind==='vehicle'&&tab==='combate') {
      assert.equal(await page.locator('.tab.active .rollable[data-action="attack"]').count(),2);
      assert.equal(await page.locator('.tab.active button[data-action="attack"]').count(),0);
      const colors=await page.locator('.tab.active tr.item').evaluateAll(rows=>rows.map(r=>getComputedStyle(r).backgroundColor));
      assert.notEqual(colors[0],colors[1],'Item rows must alternate colors');
      const row=page.locator('.tab.active tr.item').first();
      const img=await row.locator('img').boundingBox(),name=await row.locator('.rollable').boundingBox();
      assert.ok(Math.abs((img.y+img.height/2)-(name.y+name.height/2))<12,'Name must be beside the icon');
     }
     if(kind==='weapon'&&tab==='basico') assert.equal(await page.locator('.tv-w-damage th').count(),12);
     await page.screenshot({path:path.join(out,`${kind}-${theme}-${tab}.png`)});
    }
   }
  }
  console.log('PASS production getData, validation, Handlebars templates and all seven tabs in two themes. Screenshots: '+out);
  // Exercise inline searches in the real sheet DOM with 500 actors and multiple skills.
  await page.goto(`http://127.0.0.1:${server.address().port}/preview?kind=vehicle&theme=foundry`);
  await page.evaluate(async()=>{
   const ops=await import('/systems/tagmar_rpg/modules/vehicles/inline-operators.mjs');
   const actors=Array.from({length:500},(_,i)=>({documentName:'Actor',type:'NPC',uuid:'Actor.'+i,name:i===420?'João da Maré':'Marinheiro '+i,isOwner:i!==499,system:{atributos:{INT:2},bonus_habil:0},items:[{id:'nav',type:'Habilidade',name:'Navegação',system:{nivel:4,ajuste:{atributo:'INT'}}},{id:'write',type:'Habilidade',name:'Escrita',system:{nivel:1,ajuste:{atributo:'INT'}}}]}));
   for(const actor of actors)actor.items.get=id=>actor.items.find(item=>item.id===id);
   window.game={user:{isGM:false},actors};window.fromUuid=async uuid=>actors.find(a=>a.uuid===uuid);
   window.ui={notifications:{warn:message=>{throw Error(message);}}};
   window.testDocument={isOwner:true,system:{manobra:{modo:'vinculado',operador:'',habilidade:'',operadores:[]}},async update(changes){for(const [path,value]of Object.entries(changes))this.system.manobra[path.split('.').at(-1)]=value;document.body.dataset.saved=String(this.system.manobra.operadores.length);}};
   window.Dialog=class {constructor(){throw Error('Linking must not open a dialog');}};
   window.showInlineEditor=async()=>{
     const old=document.querySelector('[data-operator-editor]');old.outerHTML=await ops.inlineOperatorHTML(testDocument.system.manobra,true);
     await ops.activateInlineOperators({document:testDocument,isEditable:true},[document.querySelector('form')],'manobra',async()=>{});
   };
   window.searchChanges=0;document.querySelector('form').addEventListener('change',()=>searchChanges++);
   await showInlineEditor();
  });
  await page.locator('.tab[data-tab=basico] [data-character-search]').fill('joao');
  assert.equal(await page.locator('.tab[data-tab=basico] [data-character-results] [role=option]').count(),1);
  await page.locator('.tab[data-tab=basico] [data-character-search]').press('Enter');
  await page.locator('.tab[data-tab=basico] [data-skill-search]').fill('navegacao');
  assert.equal(await page.locator('.tab[data-tab=basico] [data-skill-results] [role=option]').count(),1);
  await page.screenshot({path:path.join(out,'inline-skill-search.png')});
  await page.locator('.tab[data-tab=basico] [data-skill-search]').press('Enter');
  await page.locator('.tab[data-tab=basico] [data-operator-save]').click();await page.waitForFunction(()=>document.body.dataset.saved==='1');
  await page.evaluate(()=>showInlineEditor());
  await page.locator('.tab[data-tab=basico] [data-operator-add]').click();
  await page.locator('.tab[data-tab=basico] [data-character-search]').fill('Marinheiro 123');
  await page.locator('.tab[data-tab=basico] [data-character-results] [role=option]').click();
  await page.locator('.tab[data-tab=basico] [data-skill-search]').fill('escr');
  await page.locator('.tab[data-tab=basico] [data-skill-results] [role=option]').click();
  await page.locator('.tab[data-tab=basico] [data-operator-save]').click();await page.waitForFunction(()=>document.body.dataset.saved==='2');
  assert.equal(await page.evaluate(()=>testDocument.system.manobra.operador),'Actor.123');
  assert.equal(await page.evaluate(()=>testDocument.system.manobra.operadores.find(r=>r.operador==='Actor.420').habilidade),'nav');
  await page.evaluate(()=>showInlineEditor());
  await page.screenshot({path:path.join(out,'inline-two-operators.png')});
  await page.locator('.tab[data-tab=basico] [data-operator-select="Actor.420"]').click();
  assert.equal(await page.evaluate(()=>testDocument.system.manobra.operador),'Actor.420');
  assert.equal(await page.evaluate(()=>testDocument.system.manobra.operadores.length),2);
  await page.evaluate(()=>showInlineEditor());
  await page.locator('.tab[data-tab=basico] [data-operator-edit="Actor.420"]').click();
  await page.locator('.tab[data-tab=basico] [data-skill-search]').fill('escr');
  await page.locator('.tab[data-tab=basico] [data-skill-results] [role=option]').click();
  await page.locator('.tab[data-tab=basico] [data-operator-save]').click();
  await page.waitForFunction(()=>testDocument.system.manobra.operadores.find(r=>r.operador==='Actor.420').habilidade==='write');
  assert.equal(await page.evaluate(()=>testDocument.system.manobra.operadores.find(r=>r.operador==='Actor.123').habilidade),'write');
  await page.evaluate(()=>showInlineEditor());
  await page.locator('.tab[data-tab=basico] [data-operator-add]').click();
  await page.locator('.tab[data-tab=basico] [data-character-search]').fill('Marinheiro 499');
  assert.equal(await page.locator('.tab[data-tab=basico] [data-character-results] [role=option]').count(),0);
  await page.locator('.tab[data-tab=basico] [data-character-search]').fill('nobody matches');
  assert.equal(await page.locator('.tab[data-tab=basico] [data-character-results] [role=option]').count(),0);
  assert.equal(await page.locator('.tab[data-tab=basico] [data-skill-search]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>searchChanges),0,'Search input changes must not auto-submit the document');
  console.log('PASS inline actor/skill search, 500 actors, accents, keyboard and mouse, ownership, two links, no modal and no search auto-submit');
 } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
