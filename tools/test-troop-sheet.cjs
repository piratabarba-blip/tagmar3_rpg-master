const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const app=process.env.FOUNDRY_APP||'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app';
const deps=process.env.NODE_DEPS||'C:/Users/PIRATA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const H=require(path.join(app,'node_modules/handlebars')),{chromium}=require(path.join(deps,'playwright'));
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../../outputs/mass-combat-preview-20261027');
const merge=(a,b)=>{const r=structuredClone(a);for(const [k,v]of Object.entries(b))r[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(r[k]??{},v):v;return r;};
const set=(obj,key,value)=>{const keys=key.split('.'),last=keys.pop();for(const k of keys)obj=obj[k]??={};obj[last]=value;};
class Sheet{
 constructor(doc){this.document=doc;this.actor=doc;this.isEditable=true;this.element={toggleClass(){}};}
 static get defaultOptions(){return {};}
 async getData(){return {editable:this.isEditable,owner:this.isEditable};}
 activateListeners(){}
 async _onChangeInput(){await this.nextChange;}
 async _updateObject(event,data){for(const [key,value]of Object.entries(data))set(this.actor,key,value);}
 _getSubmitData(){return {};}
}
global.foundry={appv1:{sheets:{ActorSheet:Sheet}},utils:{mergeObject:merge,getProperty:(obj,key)=>key.split('.').reduce((o,k)=>o?.[k],obj)},applications:{ux:{TextEditor:{enrichHTML:async html=>html}}}};
global.game={system:{id:'tagmar_rpg'},user:{isGM:true},settings:{get:()=> 'dark'},actors:[]};
global.fromUuid=async()=>null;
global.ui={notifications:{warn:msg=>{throw Error(msg);}}};
H.registerHelper('checked',v=>v?'checked':'');
H.registerHelper('selectOptions',(entries,context)=>new H.SafeString(Object.entries(entries).map(([k,v])=>`<option value="${H.escapeExpression(k)}" ${String(context.hash.selected)===k?'selected':''}>${H.escapeExpression(v)}</option>`).join('')));
H.registerHelper('editor',(html,ctx)=>new H.SafeString(`<div class="editor"><div class="editor-content" data-edit="${ctx.hash.target}">${html}</div></div>`));
(async()=>{
 const {TroopSheet}=await import(pathToFileURL(path.join(root,'modules/mass-combat/sheet.mjs')));
 const schema=JSON.parse(fs.readFileSync(path.join(root,'template.json')));
 const actor={name:'Guarda da fronteira — Tropa Verrogari',type:'Tropa',id:'example',uuid:'Actor.example',isOwner:true,img:'icons/svg/combat.svg',items:[],flags:{},system:merge(schema.Actor.templates.base,schema.Actor.Tropa)};
 Object.assign(actor.system,{estagio:4,equipamento:'medio',ef:{value:465,max:465},absorcao:{value:93,max:93},notaveis:6,colunas:{L:3,M:2,P:0},aparatos:{nome:'Torre de cerco',quantidade:1,porUnidade:150,atual:150}});
 actor.system.comando.totalManual=10;actor.system.especialista.totalManual=10;actor.system.biografia='<p>Exemplo do suplemento de Fábio Carvalho Magalhães.</p>';
 const sheet=new TroopSheet(actor),data=await sheet.getData();assert.equal(data.rows[0].damages[3],188);
 actor.update=async changes=>sheet._updateObject(null,changes);
 const handlers=new Map(),html={find:sel=>({each(){return this;},on(event,fn){handlers.set(sel+':'+event,fn);return this;}})};
 sheet.activateListeners(html);
 const detail={dataset:{troopDetail:'calculator'},open:true,isConnected:true,addEventListener(_type,fn){this.onToggle=fn;}};
 sheet.element[0]={querySelectorAll:()=>[detail]};
 await sheet._onChangeInput({});
 detail.open=false;html[0]={querySelectorAll:()=>[detail],querySelector:()=>null};sheet.activateListeners(html);
 assert.equal(detail.open,true,'Calculator survives form replacement on save');
 detail.open=false;detail.onToggle();detail.open=true;sheet.activateListeners(html);
 assert.equal(detail.open,false,'User can close the calculator and it stays closed');
 delete html[0];delete sheet.element[0];
 const actions=[];sheet.action=async type=>actions.push({type,stage:actor.system.estagio});
 let release;sheet.nextChange=new Promise(resolve=>release=resolve);
 const pending=sheet._onChangeInput({});sheet._getSubmitData=()=>({'system.estagio':5});
 const click=handlers.get('[data-troop-action]:click')({preventDefault(){},currentTarget:{dataset:{troopAction:'attack'}}});
 assert.equal(actions.length,0);release();await pending;await click;assert.equal(actions[0].stage,5);
 game.user.isGM=false;await assert.rejects(()=>sheet._updateObject(null,{'system.comando.totalManual':20}));game.user.isGM=true;
  let opened=0;game.packs=new Map([[`${game.system.id}.combate-grande-escala-livro`,{getDocument:async id=>{assert.equal(id,'tropaLivroGuia01');return {sheet:{render:()=>opened++}};}}]]);
 sheet.isEditable=false;sheet.activateListeners(html);
 await handlers.get('[data-troop-guide]:click')({preventDefault(){}});assert.equal(opened,1,'Read-only players can open the guide without saving the actor');sheet.isEditable=true;
 // Linking artwork must not copy weapon damage or change collective combat values.
 const savedSystem=structuredClone(actor.system);
 actor.getFlag=(scope,key)=>actor.flags?.[scope]?.[key];
 const artItem={type:'Arma_Guerra',uuid:'Item.art',img:'icons/weapons/artillery/ballista-wood-green.webp',name:'Balista',visible:true};
 global.Item={implementation:{fromDropData:async()=>artItem}};
 global.fromUuid=async uuid=>uuid===artItem.uuid?artItem:null;
 const dropEvent={target:{closest:()=>({dataset:{troopIconRow:'apparatus'}})}};
 await sheet._onDropItem(dropEvent,{type:'Item',uuid:artItem.uuid});
 assert.equal(actor.flags.tagmar_rpg.troopAttackIcons.apparatus.uuid,artItem.uuid);
 assert.deepEqual(actor.system,{...savedSystem,aparatos:{...savedSystem.aparatos,nome:'Balista'}},'Only apparatus name changes; statistics remain collective');
 assert.equal((await sheet.getData()).rows[1].img,artItem.img);
 artItem.img='icons/weapons/artillery/catapult-simple.webp';
 assert.equal((await sheet.getData()).rows[1].img,artItem.img,'Source image changes are read on render');
 global.fromUuid=async()=>null;
 assert.equal((await sheet.getData()).rows[1].img,'icons/weapons/artillery/ballista-wood-green.webp','Deleted source keeps saved artwork');
 let confirmOptions;
 global.Dialog={confirm:async options=>{confirmOptions=options;return false;}};
 const beforeRemoval=structuredClone(actor.system);
 await sheet.configureAttack('remove');assert.deepEqual(actor.system,beforeRemoval,'Cancelling deletion preserves all values');
 await confirmOptions.yes();
 assert.equal(actor.system.aparatos.quantidade,0);assert.equal(actor.system.aparatos.atual,0);
 assert.equal(actor.flags.tagmar_rpg.troopAttackIcons.apparatus,null);
 assert.equal((await sheet.getData()).rows.length,1,'Removed apparatus no longer offers an attack');
 assert.deepEqual(actor.system.ef,beforeRemoval.ef);assert.deepEqual(actor.system.comando,beforeRemoval.comando);
 await sheet.configureAttack('add');assert.equal(actor.system.aparatos.quantidade,1);assert.equal(actor.system.aparatos.atual,100);
 assert.equal((await sheet.getData()).rows.length,2);
 await sheet._onDropItem(dropEvent,{type:'Item',uuid:artItem.uuid});
 assert.equal(actor.system.aparatos.nome,'Balista');assert.equal(actor.system.aparatos.atual,100,'Replacement preserves apparatus values');
 await sheet.configureAttack('reset-icon','apparatus');assert.equal(actor.flags.tagmar_rpg.troopAttackIcons.apparatus,null);
 await sheet._onDropItem(dropEvent,{type:'Item',uuid:artItem.uuid});
 game.user.isGM=false;actor.isOwner=false;
 await assert.rejects(()=>sheet._onDropItem(dropEvent,{type:'Item'}));
 await assert.rejects(()=>sheet.configureAttack('add'));
 await assert.rejects(()=>sheet.configureAttack('remove'));
 actor.isOwner=true;game.user.isGM=true;
 global.fromUuid=async uuid=>uuid===artItem.uuid?artItem:null;
 const view=H.compile(fs.readFileSync(path.join(root,'templates/sheets/tropa-sheet.hbs'),'utf8'))(await sheet.getData());
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'system.json')));
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/preview'){
   const theme=url.searchParams.get('theme')||'dark';res.setHeader('Content-Type','text/html;charset=utf-8');
   res.end(`<!doctype html><html><head><link rel="stylesheet" href="/css/foundry2.css"><link rel="stylesheet" href="/fonts/fontawesome/css/all.min.css">${manifest.styles.map(p=>`<link rel="stylesheet" href="/systems/tagmar_rpg/${p}">`).join('')}<style>body{margin:0;background:#17131a}.preview{position:absolute!important;left:20px;top:20px;width:860px;height:860px}.window-content{padding:8px!important}.preview .tab.active{display:block}</style></head><body class="theme-dark"><section class="app window-app tagmar sheet actor tagmar-vehicle tagmar-troop tagmar-${theme}-sheet preview"><header class="window-header"><h4 class="window-title">Tropa — Prévia</h4></header><div class="window-content">${view}</div></section><script>function tab(id){document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===id));}document.querySelectorAll('nav [data-tab]').forEach(e=>e.onclick=()=>tab(e.dataset.tab));tab('basico');</script></body></html>`);return;
  }
  const system=url.pathname.startsWith('/systems/tagmar_rpg/'),base=system?root:path.join(app,'public');
  const file=path.resolve(base,decodeURIComponent(system?url.pathname.slice(20):url.pathname.slice(1)));
  if(!file.startsWith(path.resolve(base)+path.sep)){res.writeHead(403);res.end();return;}
  try{const ext=path.extname(file);res.setHeader('Content-Type',({'.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:940,height:920}});
  for(const theme of ['dark','foundry']){
   await page.goto(`http://127.0.0.1:${server.address().port}/preview?theme=${theme}`);
   for(const tab of ['basico','combate','fortificacoes','biografia']){
    await page.locator(`nav [data-tab="${tab}"]`).click();
    assert.equal(await page.locator('.sheet-primary').evaluate(el=>el.scrollWidth>el.clientWidth+2),false,theme+'/'+tab+' overflow');
    assert.equal(await page.locator('.tab.active').count(),1);
    assert.equal(await page.locator('.tc-header-resources').isVisible(),true);
    assert.match(await page.locator('.tc-header-resources').innerText(),/EF\s+465\s*\/\s*465/);
    const brand=await page.locator('.tv-v-brand').boundingBox(),body=await page.locator('.tv-v-body').boundingBox();assert.ok(Math.abs(brand.width-body.width)<3);
    const name=await page.locator('input[name=name]').boundingBox();assert.ok(name.x+name.width<brand.x+brand.width-8);
        if(tab==='basico'){
      const widths=await page.locator('.tab.active input[type=number]').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().width).map(el=>el.getBoundingClientRect().width));
      assert.ok(widths.every(width=>width<=90),'Numeric fields stay compact');
      assert.ok(await page.locator('.tab.active .tv-help[title]').count()>12,'Field help remains available');
      const colors=await page.locator('.tab.active .tc-stats').first().locator('tr th').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));assert.notEqual(colors[0],colors[1]);
    }
    if(tab==='combate'){
      assert.equal(await page.locator('[data-troop-icon-row] .imgItem').count(),2);
      assert.equal(await page.locator('[data-troop-config=edit]').count(),1);
      assert.equal(await page.locator('[data-troop-config=remove]').count(),1);
      assert.ok(await page.locator('[data-troop-icon-row] .imgItem').evaluateAll(els=>els.every(e=>e.complete&&e.naturalWidth>0&&e.getBoundingClientRect().width===28)),'Attack artwork loads at the standard size');
      assert.equal(await page.locator('a[data-troop-action=attack]').count(),1);assert.equal(await page.locator('a[data-troop-action=apparatus]').count(),1);}
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(out,`tropa-${theme}-${tab}.png`)});
   }
  }
  console.log('PASS production getData, pending-save attack, permission guard, templates and four tabs in both themes. '+out);
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
