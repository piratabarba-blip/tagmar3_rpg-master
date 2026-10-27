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
 const actions=[];sheet.action=async type=>actions.push({type,stage:actor.system.estagio});
 let release;sheet.nextChange=new Promise(resolve=>release=resolve);
 const pending=sheet._onChangeInput({});sheet._getSubmitData=()=>({'system.estagio':5});
 const click=handlers.get('[data-troop-action]:click')({preventDefault(){},currentTarget:{dataset:{troopAction:'attack'}}});
 assert.equal(actions.length,0);release();await pending;await click;assert.equal(actions[0].stage,5);
 game.user.isGM=false;await assert.rejects(()=>sheet._updateObject(null,{'system.comando.totalManual':20}));game.user.isGM=true;
 const view=H.compile(fs.readFileSync(path.join(root,'templates/sheets/tropa-sheet.hbs'),'utf8'))(data);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'system.json')));
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/preview'){
   const theme=url.searchParams.get('theme')||'dark';res.setHeader('Content-Type','text/html;charset=utf-8');
   res.end(`<!doctype html><html><head><link rel="stylesheet" href="/css/foundry2.css">${manifest.styles.map(p=>`<link rel="stylesheet" href="/systems/tagmar_rpg/${p}">`).join('')}<style>body{margin:0;background:#17131a}.preview{position:absolute!important;left:20px;top:20px;width:860px;height:860px}.window-content{padding:8px!important}.preview .tab.active{display:block}</style></head><body class="theme-dark"><section class="app window-app tagmar sheet actor tagmar-vehicle tagmar-troop tagmar-${theme}-sheet preview"><header class="window-header"><h4 class="window-title">Tropa — Prévia</h4></header><div class="window-content">${view}</div></section><script>function tab(id){document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===id));}document.querySelectorAll('nav [data-tab]').forEach(e=>e.onclick=()=>tab(e.dataset.tab));tab('basico');</script></body></html>`);return;
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
    const brand=await page.locator('.tv-v-brand').boundingBox(),body=await page.locator('.tv-v-body').boundingBox();assert.ok(Math.abs(brand.width-body.width)<3);
    const name=await page.locator('input[name=name]').boundingBox();assert.ok(name.x+name.width<brand.x+brand.width-8);
    if(tab==='combate'){assert.equal(await page.locator('a[data-troop-action=attack]').count(),1);assert.equal(await page.locator('a[data-troop-action=apparatus]').count(),1);}
    await page.screenshot({path:path.join(out,`tropa-${theme}-${tab}.png`)});
   }
  }
  console.log('PASS production getData, pending-save attack, permission guard, templates and four tabs in both themes. '+out);
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
