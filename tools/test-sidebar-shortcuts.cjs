const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require(path.join(process.env.TAGMAR_TEST_NODE_MODULES,'playwright'));

(async () => {
  const source = await fs.readFile(path.resolve(__dirname,'../modules/sidebar-shortcuts.mjs'),'utf8');
  const publicRoot = 'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/public';
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page = await browser.newPage({viewport:{width:1000,height:900}});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://shortcuts.test/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/shortcuts.mjs')return route.fulfill({body:source,contentType:'text/javascript'});
      const file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(path.resolve(publicRoot)+path.sep))return route.abort();
      try{return await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':undefined});}catch{return route.abort();}
    });
    await page.goto('http://shortcuts.test/css/foundry2.css');
    await page.setContent('<html><head><style>@layer reset, variables; @import url("http://shortcuts.test/fonts/fontawesome/css/all.min.css") layer(variables);</style><link rel="stylesheet" href="http://shortcuts.test/css/foundry2.css"></head><body class="theme-dark"><div id="scene-controls" style="--control-size:32px;position:absolute;top:12px;left:12px;width:120px;height:calc(100vh - 24px)"><menu id="scene-controls-layers" data-application-part="layers" class="flexcol"></menu><menu id="scene-controls-tools" class="flexcol"></menu></div></body></html>');
    await page.addScriptTag({path:path.join(publicRoot,'../node_modules/handlebars/dist/handlebars.min.js')});
    const nativeTemplate=await fs.readFile(path.join(publicRoot,'../templates/ui/scene-controls-layers.hbs'),'utf8');
    await page.evaluate(async(nativeTemplate)=>{
      const api=await import('http://shortcuts.test/shortcuts.mjs'); window.api=api;
      window.calls=[];window.nativeClicks=0;window.messages=[];
      const titles=['Rolagem na Tabela','Tabela de Resolução de Ações','Tabela de Resistências','Grande Calendário de Tagmar','Votação','Tesouros em Tagmar'];
      const icons=['fas fa-dice-d20','fas fa-border-all','fas fa-table','fas fa-calendar-days','fas fa-vote-yea','fas fa-gem'];
      window.app={controls:{tokens:{name:'tokens',tools:Object.fromEntries(api.SHORTCUTS.map((id,i)=>[id,{name:id,title:titles[i],icon:icons[i],button:true,onChange:async(event,active)=>{calls.push({id,active,type:event.type});}}]))}},activeControl:'walls',activeTool:'drawWall'};
      app.controls['tagmar-viagens']={visible:true,tools:{planner:{...app.controls.tokens.tools['tagmar-viagens'],title:'Viagens e Expedições',icon:'fa-solid fa-route'}}};
      delete app.controls.tokens.tools['tagmar-viagens'];
      const root=document.getElementById('scene-controls');
      root.addEventListener('click',()=>nativeClicks++);
      const nativeIcons=['fa-user','fa-cubes','fa-pencil','fa-block-brick','fa-location-dot','fa-music','fa-dice','fa-bookmark','fa-compass','fa-route','fa-list-ol'];
      Handlebars.registerHelper('localize',text=>text);
      const nativeHTML=Handlebars.compile(nativeTemplate)({controls:nativeIcons.map((icon,i)=>({name:icon==='fa-route'?'tagmar-viagens':`native${i}`,title:`Camada ${i}`,icon:`fas ${icon}`}))});
      const holder=document.createElement('div');holder.innerHTML=nativeHTML;
      const menu=holder.firstElementChild;menu.id='scene-controls-layers';menu.dataset.applicationPart='layers';
      document.getElementById('scene-controls-layers').replaceWith(menu);
      window.draw=()=>api.renderSidebarShortcuts(app,root,{notify:message=>messages.push(message),log:()=>{}});
      window.renderTools=()=>{document.getElementById('scene-controls-tools').innerHTML=api.SHORTCUTS.map(id=>`<li><button data-tool="${id}" class="control ui-control">T</button></li>`).join('');};
      renderTools();draw();
    },nativeTemplate);
    assert.equal(await page.locator('[data-tagmar-shortcut]').count(),7);
    assert.equal(await page.locator('.tagmar-shortcut-original:visible').count(),0);
    for(const id of await page.evaluate(()=>api.SHORTCUTS))await page.locator(`[data-tagmar-shortcut="${id}"]`).click();
    assert.equal(await page.evaluate(()=>calls.length),7);
    assert.equal(await page.evaluate(()=>nativeClicks),0);
    assert.deepEqual(await page.evaluate(()=>[app.activeControl,app.activeTool]),['walls','drawWall']);
    await page.evaluate(()=>{for(let i=0;i<10;i++){renderTools();draw();}});
    assert.equal(await page.locator('[data-tagmar-shortcut]').count(),7);
    assert.equal(await page.locator('#scene-controls-layers > li:visible').last().locator('[data-tagmar-shortcut]').getAttribute('data-tagmar-shortcut'),'tagmar-viagens');
    assert.equal(await page.locator('[data-control="tagmar-viagens"]:visible').count(),0);
    // Compara o estado normal, depois de terminar a transição de hover.
    await page.mouse.move(900,800);
    await page.locator('#scene-controls').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
    assert.equal(await page.locator('[data-tagmar-shortcut="tagmar-viagens"]').evaluate(e=>getComputedStyle(e).borderColor),await page.locator('[data-tagmar-shortcut="tesourosTagmar"]').evaluate(e=>getComputedStyle(e).borderColor));
    assert.equal(await page.locator('#tagmar-sidebar-shortcuts-style').count(),1);
    // Disponibilidade dos módulos e permissões nativas continuam sendo a fonte.
    await page.evaluate(()=>{delete app.controls.tokens.tools['tagmar-calendario'];app.controls.tokens.tools.tesourosTagmar.visible=false;draw();});
    assert.equal(await page.locator('[data-tagmar-shortcut]').count(),5);
    await page.evaluate(()=>{app.controls.tokens.tools.tagmarVotacao.visible=false;});
    await page.locator('[data-tagmar-shortcut="tagmarVotacao"]').click();
    assert.equal(await page.evaluate(()=>calls.length),7);
    await page.evaluate(()=>{api.renderSidebarShortcuts(app,document.getElementById('scene-controls'),{enabled:false});});
    assert.equal(await page.locator('[data-tagmar-shortcut]').count(),0);
    assert.equal(await page.locator('#scene-controls-tools li:visible').count(),7);
    assert.equal(await page.locator('[data-control="tagmar-viagens"]:visible').count(),1);
    await page.evaluate(()=>{app.controls.tokens.tools.tagmarVotacao.visible=true;app.controls.tokens.tools.tesourosTagmar.visible=true;draw();});
    const roll=page.locator('[data-tagmar-shortcut="tagmarRolagem"]');
    await roll.focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>calls.length),8);
    await page.evaluate(()=>{app.controls.tokens.tools.tagmarRolagem.onChange=async()=>{throw new Error('test');};});
    await roll.click();assert.equal(await page.evaluate(()=>messages.length),1);assert.equal(await roll.isDisabled(),false);
    await page.setViewportSize({width:640,height:360});
    const last=page.locator('[data-tagmar-shortcut="tagmar-viagens"]');await last.focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>calls.at(-1).id),'tagmar-viagens');
    const box=await last.boundingBox();assert(box.y>=0&&box.y+box.height<=360);
    assert(await page.evaluate(()=>{const m=document.getElementById('scene-controls-layers');return m.scrollHeight>m.clientHeight&&m.scrollTop>0;}));
    await page.setViewportSize({width:1000,height:900});
    await page.evaluate(()=>{app.controls.tokens.tools['tagmar-calendario']={name:'tagmar-calendario',title:'Grande Calendário de Tagmar',icon:'fas fa-calendar-days',button:true,onChange(){}};document.getElementById('scene-controls-layers').scrollTop=0;draw();});
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:process.env.TAGMAR_SHORTCUT_SCREENSHOT || 'sidebar-shortcuts-preview.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS: sete atalhos, viagens por último com borda padrão, callbacks únicos, camada preservada, módulos ausentes, permissões, re-render sem duplicação, opção desligada, teclado, erro isolado e rolagem em tela pequena.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
