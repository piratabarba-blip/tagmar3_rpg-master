const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TAGMAR_TEST_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
const native=process.env.TAGMAR_TEST_FOUNDRY||'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app';
const out=process.env.TAGMAR_TREASURE_OUTPUT||path.join(root,'../../outputs/treasure-builder-browser');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:820,height:1000}}),errors=[];
  page.setDefaultTimeout(5000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://treasure-builder.test/**',async route=>{
   const name=new URL(route.request().url()).pathname;
   if(name==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/native/css/foundry2.css"><link rel="stylesheet" href="/native/fonts/fontawesome/css/all.min.css"><link rel="stylesheet" href="/css/modern-dialogs.css"><style>body{padding:18px;background:#251e1a;font:14px Arial;color:#f0dfba}#tesouros-tagmar{position:relative;inset:auto;width:760px;height:940px;display:flex;flex-direction:column;background:#10171f;border:1px solid #b98518;border-radius:7px;overflow:hidden}.window-header{display:flex;align-items:center;padding:8px 10px;gap:10px;flex:none;background:#17131b;color:#f0dfba}.window-title{flex:1;margin:0;font-size:15px}.window-content{flex:1;min-height:0;display:flex;flex-direction:column}.tab:not(.active){display:none}.tesouro-body>.tab.active{display:block}.tesouro-body{flex:1;min-height:0}.dialog-shell{position:fixed;inset:70px auto auto 100px;width:580px;background:#10171f;border:2px solid #b98518;border-radius:6px;padding:14px;z-index:99}.dialog-shell h2{font-size:20px;color:#f0dfba}.dialog-shell button{width:auto;margin:6px;color:#f0dfba}.dialog-shell input[type=checkbox]{width:20px;height:20px}</style><script src="/vendor/jquery.js"></script><script src="/vendor/handlebars.js"></script></head><body><main id="fixture"></main></body></html>'});
   const file=name.startsWith('/native/')?path.join(native,'public',name.slice(8)):
    name==='/vendor/jquery.js'?path.join(native,'node_modules/jquery/dist/jquery.min.js'):
    name==='/vendor/handlebars.js'?path.join(native,'node_modules/handlebars/dist/handlebars.js'):path.join(root,name);
   try{await route.fulfill({body:await fs.readFile(file),contentType:/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':undefined});}
   catch{await route.fulfill({status:404,body:''});}
  });
  await page.goto('http://treasure-builder.test/');
  const template=await fs.readFile(path.join(root,'templates/apps/tesouros-tagmar.hbs'),'utf8');
  await page.evaluate(async template=>{
   window.notices=[];window.created=[];window.messages=[];window.saved={};
   const clone=value=>structuredClone(value);
   window.foundry={utils:{deepClone:clone,mergeObject:(a,b)=>({...clone(a),...clone(b)})}};
   window.game={user:{id:'gm',isGM:true},users:[{id:'gm',isGM:true}],settings:{get:(_id,key)=>saved[key]??{},set:async(_id,key,value)=>{saved[key]=value;}}};
   window.ui={notifications:{warn:m=>notices.push(m),error:m=>notices.push(m),info:()=>{}}};
   window.Item={createDocuments:async data=>{created.push(...clone(data));return data.map((d,i)=>({...d,id:String(i)}));}};
   window.ChatMessage={getSpeaker:()=>({}),create:async data=>messages.push(data)};
   window.FormApplication=class {
    static get defaultOptions(){return {};}
    constructor(){this._tabs=[{active:'gerar'}];this.options=this.constructor.defaultOptions;}
    _getHeaderButtons(){return [];}
    activateListeners(){}
    render(){window.lastRender=drawApp(this);return this;}
   };
   window.Dialog=class{
    constructor(data){this.data=data;}
    static async confirm(){return true;}
    render(){
     const shell=document.createElement('section');shell.className='dialog-shell tesouro-properties-dialog';
     shell.innerHTML=`<h2>${this.data.title}</h2>${this.data.content}<footer></footer>`;
     for(const value of Object.values(this.data.buttons)){const b=document.createElement('button');b.textContent=value.label;b.onclick=async()=>{await value.callback?.(jQuery(shell));shell.remove();};shell.querySelector('footer').append(b);}
     document.body.append(shell);return this;
    }
   };
   const data={name:'Espada longa',_id:'sword',type:'Combate',img:'icons/svg/sword.svg',system:{tipo:'EL',alcance:'2 m',peso:2,descricao:'Espada base.',dano_base:Object.fromEntries(Array.from({length:12},(_,i)=>['d'+(i+1)*25,(i+1)*5])),dano:{},def_l:2,def_m:1,def_p:0,bonus:'FOR',bonus_dano:'FOR'}};
   const weapon={name:data.name,uuid:'Compendium.test.sword',toObject:()=>clone(data)};
   window.catalog={weapons:[{realm:'reinos',item:weapon}],defenses:[],jewelry:[],origins:[],lore:{deities:new Map(),regions:[]},magics:[
    {key:'fogo',name:'Bola de Fogo',uuid:'Compendium.test.fogo',levels:[1,3,5],origins:['Elemental'],realms:['reinos'],traditions:['mage'],repertoires:['core']},
    {key:'luz',name:'Manipulação de Luz',uuid:'Compendium.test.luz',levels:[1,2,4],origins:['Ilusões'],realms:['reinos'],traditions:['mage'],repertoires:['core']}
   ]};
   const compile=Handlebars.compile(template);
   window.drawApp=async app=>{
    const data=await app.getData();
    document.querySelector('#fixture').innerHTML='<section id="tesouros-tagmar"><header class="window-header"><h1 class="window-title">Tesouros em Tagmar</h1><a class="tesouro-properties-toggle" title="Propriedades" aria-label="Propriedades"><i class="fas fa-sliders"></i>Propriedades</a><a>× Fechar</a></header><section class="window-content">'+compile(data)+'</section></section>';
    app.element=jQuery('#tesouros-tagmar');
    const active=app._tabs[0].active;
    app.element.find('.tesouro-tabs [data-tab]').each((_i,a)=>{a.classList.toggle('active',a.dataset.tab===active);a.onclick=()=>{app._tabs[0].active=a.dataset.tab;app.element.find('.tesouro-tabs [data-tab],.tesouro-body>.tab').each((_n,e)=>{e.classList.toggle('active',e.dataset.tab===a.dataset.tab);});};});
    app.element.find('.tesouro-body>.tab').each((_i,t)=>{t.classList.toggle('active',t.dataset.tab===active);});
    document.querySelector('.tesouro-properties-toggle').onclick=app._getHeaderButtons()[0].onclick;
    app.activateListeners(app.element);
   };
   const {TesourosTagmarApp}=await import('/modules/tesourosTagmar.js');
   window.app=new TesourosTagmarApp();app._loadCatalog=async()=>catalog;app._ensureTreasureFolder=async()=>({id:'new-folder',name:'Cesta de teste'});
   await drawApp(app);
  },template);
  const settle=()=>page.evaluate(async()=>{await window.lastRender;});
  assert.deepEqual(await page.locator('.tesouro-tabs a').allTextContents(),[' Itens aleatórios',' Tesouros específicos']);
  assert.equal(await page.locator('[name="moneyMoBonus"]').count(),0);
  assert.equal(await page.locator('[name="treasureMode"] option[value="coins"]').count(),0);
  assert.equal(await page.locator('[name="itemSpecific"]').isVisible(),false);
  assert.equal(await page.locator('[name="specificMagic"]').isVisible(),false);
  const random=await page.evaluate(()=>app._formValues(app.element));assert.equal(random.includeMoney,false);assert.equal(random.generationMode,'quick');
  // The random tab uses an OR pool of filter rows and a local property recipe.
  await page.locator('[data-treasure-section="object"] > summary').click();
  await page.locator('[name="itemKind"]').selectOption('weapon');
  await page.locator('[data-action="add-random-object"]').click();
  await page.locator('[data-random-object-row] select').nth(1).selectOption('staff');
  await page.locator('[data-treasure-section="magic"] > summary').click();
  await page.locator('[name="magicTradition"]').selectOption('mage');
  await page.locator('[data-action="add-random-magic"]').click();
  await page.locator('[data-random-magic-row] [data-magic-filter="tradition"]').nth(1).selectOption('priest');
  await page.locator('[data-treasure-section="properties"] > summary').click();
  await page.locator('[name="randomPropertyMode"]').selectOption('chosen');
  await page.locator('[data-random-property][value="bonus"]').check();
  await page.locator('[data-random-property][value="focus"]').check();
  assert.equal(await page.locator('[data-action="add-random-magic"]').isDisabled(),true);
  await page.locator('[data-random-property][value="magia"]').check();
  assert.equal(await page.locator('[data-action="add-random-magic"]').isEnabled(),true);
  assert.equal(await page.locator('[name="magicMode"]').isDisabled(),true);
  await page.locator('[name="randomMagicMinimum"]').fill('2');
  await page.locator('[name="randomMagicMinimum"]').dispatchEvent('change');
  let selections=await page.evaluate(()=>app._formValues(app.element));
  assert.deepEqual(selections.randomObjectTypes,['weapon','staff']);
  assert.deepEqual(selections.randomMagicFilters.map(row=>row.tradition),['mage','priest']);
  assert.deepEqual(selections.randomProperties,['bonus','magia','focus']);
  await page.evaluate(async()=>{await drawApp(app);});
  assert.equal(await page.locator('[data-random-object-row]').count(),2);
  assert.equal(await page.locator('[data-random-magic-row]').count(),2);
  assert.equal(await page.locator('[data-random-property]:checked').count(),3);
  assert.equal(await page.locator('[name="randomMagicMinimum"]').inputValue(),'2');
  assert.deepEqual(await page.evaluate(()=>app._formValues(app.element).randomMagicFilters.map(r=>r.tradition)),['mage','priest']);
  assert.equal(await page.locator('.tesouro-callout[data-magic-option]').count(),0);
  assert.equal(await page.locator('.tesouro-edit-note').count(),0);
  await page.screenshot({path:path.join(out,'random-multiple-filters.png'),fullPage:true});
  await page.locator('[data-treasure-section="properties"]').evaluate(e=>e.scrollIntoView({block:'center'}));
  await page.screenshot({path:path.join(out,'random-properties.png')});
  await page.locator('[data-random-object-row] .tesouro-remove-filter').click();
  await page.locator('[data-random-magic-row] .tesouro-remove-filter').click();
  assert.equal(await page.locator('[data-random-object-row]').count(),1);
  assert.equal(await page.locator('[data-random-magic-row]').count(),1);
  // Generate a bonus-only item through the actual form and then restore defaults.
  await page.locator('[data-random-property][value="magia"]').uncheck();
  await page.locator('[data-random-property][value="focus"]').uncheck();
  assert.equal(await page.locator('[name="randomMagicMinimum"]').isDisabled(),true);
  await page.locator('[name="treasureMode"]').selectOption('magical');
  await page.evaluate(()=>{window.Roll=class{constructor(f){this.f=f;}async evaluate(){this.total=Number(this.f.split('d')[1]);return this;}};});
  await page.locator('[data-action="generate-preview"]').click();await settle();
  assert.equal(await page.evaluate(()=>app._preview.length>0&&app._preview.every(e=>e.bonus>0&&!e.focus&&!e.magics.length)),true);
  assert.equal(await page.locator('[data-random-property][value="bonus"]').isChecked(),true);
  await page.locator('[data-action="reset-defaults"]').click();await settle();
  assert.equal(await page.locator('[data-random-property]:checked').count(),0);
  assert.equal(await page.locator('[name="randomPropertyMode"]').inputValue(),'random');
  assert.equal(await page.locator('[name="randomMagicMinimum"]').inputValue(),'0');
  await page.locator('[data-treasure-section="object"] > summary').click();
  await page.locator('[data-treasure-section="magic"] > summary').click();
  await page.locator('[name="itemKind"]').selectOption('weapon');
  await page.locator('[name="randomMagicMinimum"]').fill('1');
  await page.locator('[data-action="generate-preview"]').click();await settle();
  assert.equal(await page.evaluate(()=>app._preview.length>0&&app._preview.every(e=>e.magics.length>=1)),true);
  assert.equal(await page.locator('[name="randomMagicMinimum"]').inputValue(),'1');
  await page.locator('[data-action="reset-defaults"]').click();await settle();
  assert.equal(await page.locator('[data-random-object-row]').count(),1);
  assert.equal(await page.locator('[data-random-magic-row]').count(),1);
  await page.locator('.tesouro-tabs [data-tab="especificos"]').click();
  await page.screenshot({path:path.join(out,'specific-initial.png')});
  await page.locator('[data-specific-object-search]').fill('ESPÁDA');
  assert.equal(await page.locator('[data-specific-field="object"] option').last().evaluate(e=>e.hidden),false);
  await page.locator('[data-specific-field="object"]').selectOption('reinos:Compendium.test.sword');await settle();
  await page.locator('[data-specific-field="name"]').fill('Espada do mestre');
  await page.locator('[data-specific-field="bonus"]').fill('2');
  await page.locator('[data-specific-field="focus"]').fill('17');
  await page.locator('[data-specific-field="quantity"]').fill('2');
  await page.locator('[data-specific-field="magicKey"]').selectOption('fogo');await settle();
  await page.locator('[data-specific-field="magicLevel"]').selectOption('3');
  await page.locator('[data-specific-field="magicUses"]').fill('4');
  await page.locator('[data-specific-action="add-power"]').click();await settle();
  assert.equal(await page.locator('.tesouro-specific-powers li').count(),1);
  await page.locator('[data-specific-field="magicKey"]').selectOption('luz');await settle();
  await page.locator('[data-specific-field="magicLevel"]').selectOption('4');
  await page.locator('[data-specific-field="magicMode"]').selectOption('unlimited');await settle();
  await page.locator('[data-specific-action="add-power"]').click();await settle();
  assert.equal(await page.locator('.tesouro-specific-powers li').count(),2);
  await page.locator('[data-specific-action="add-basket"]').click();await settle();
  assert.equal(await page.locator('.tesouro-specific-basket li').count(),1);
  assert.match(await page.locator('.tesouro-specific-basket li').innerText(),/2× Espada do mestre/);
  assert.equal((await page.evaluate(()=>app._specificBasket[0].focus)),17);
  await page.locator('[data-specific-field="kind"]').selectOption('money');await settle();
  await page.locator('[data-specific-field="mo"]').fill('12');await page.locator('[data-specific-field="mc"]').fill('9');
  await page.locator('[data-specific-action="add-basket"]').click();await settle();
  assert.equal(await page.locator('.tesouro-specific-basket li').count(),2);
  await page.locator('[data-specific-edit]').first().click();await settle();
  assert.equal(await page.locator('[data-specific-field="focus"]').inputValue?.()??await page.locator('[data-specific-field="focus"]').getAttribute('value'),'17');
  await page.locator('[data-specific-field="focus"]').fill('21');
  await page.locator('[data-specific-action="add-basket"]').click();await settle();
  assert.equal(await page.locator('.tesouro-specific-basket li').count(),2);
  assert.equal(await page.evaluate(()=>app._specificBasket[0].focus),21);
  // Inspect a completed sword draft alongside the existing basket.
  await page.locator('[data-specific-edit]').first().click();await settle();
  await page.screenshot({path:path.join(out,'specific-sword-and-basket.png')});
  await page.locator('.tesouro-properties-toggle').click();
  assert.equal(await page.locator('.dialog-shell input[data-property]').count(),5);
  await page.screenshot({path:path.join(out,'properties-header-icon.png')});
  await page.locator('.dialog-shell button').filter({hasText:'Cancelar'}).click();
  await page.locator('[data-specific-action="cancel-edit"]').click();await settle();
  await page.locator('[data-specific-action="create-basket"]').click();await settle();
  assert.equal(await page.evaluate(()=>created.length),3);assert.equal(await page.evaluate(()=>app._specificBasket.length),0);
  assert.equal(await page.evaluate(()=>created[0].flags.tagmarTreasure.focus),21);
  assert.equal(await page.evaluate(()=>created[2].flags.tagmarTreasure.money.mo),12);
  assert.equal(await page.evaluate(()=>created[0].flags.tagmarTreasure.magics.length),2);
  await page.setViewportSize({width:540,height:740});
  await page.addStyleTag({content:'#tesouros-tagmar{width:500px;height:690px;}body{padding:8px}'});
  await page.locator('[data-specific-field="kind"]').selectOption('staff');await settle();
  await page.locator('[data-specific-field="object"]').selectOption('Cajado comum');await settle();
  assert.equal(await page.locator('[data-specific-field="matrices"]').getAttribute('value'),'3');
  assert.equal(await page.locator('[data-specific-panel]').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  const inputTop=await page.locator('[data-specific-field=quantity]').evaluate(e=>e.getBoundingClientRect().top);
  assert.equal(await page.locator('[data-specific-field=bonus]').evaluate(e=>e.getBoundingClientRect().top),inputTop);
  await page.screenshot({path:path.join(out,'specific-compact-staff.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>notices),[]);
  console.log('PASS browser: two tabs, random items only, header properties, filtered object list, exact powers and usages, basket add/edit, native creation and compact layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
