// Interface isolada: nenhum mundo ou dado real do Foundry é aberto.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [packages,output]=process.argv.slice(2);
const {chromium}=require(path.join(packages,'playwright'));
const source=fs.readFileSync(path.join(__dirname,'../modules/hotbar-position.mjs'),'utf8');
const coreCSS=fs.readFileSync('C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/public/css/foundry2.css','utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;--ui-scale:1}body{background:#26363c;color:#ddd;font:14px sans-serif}
#interface{display:flex;justify-content:center;position:relative;height:100%}
#ui-middle{display:flex;flex:none;width:60%;height:calc(100% / var(--ui-scale));flex-direction:column;justify-content:space-between;align-items:center;transform:scale(var(--ui-scale));transform-origin:top center;pointer-events:none}
#ui-bottom{display:flex;width:100%;height:50%;flex-direction:column;justify-content:flex-end;align-items:center}
.flexrow{display:flex;flex-direction:row}.flexcol{display:flex;flex-direction:column}
.panel{position:absolute;top:20px;left:20px;border:1px solid #c8a45e;padding:16px;background:#17151d}
#hotbar{display:flex}#action-bar{margin:0;padding:0;list-style:none}button{color:inherit;background:#16151d;border:1px solid #736252;border-radius:4px}
.fa-grip-vertical::before{content:'⠿';font:20px sans-serif}.fa-rotate-left::before{content:'↶';font:20px sans-serif}
</style></head><body style="--ui-scale:1"><div class="panel">Tagmar — barra de macros<br>Arraste pela alça • ↶ restaura</div><div id="interface"><div id="ui-middle"><div id="ui-top"></div><div id="ui-bottom"></div></div></div></body></html>`;
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://hotbar.test/**',r=>r.fulfill({body:r.request().url().endsWith('.mjs')?source:html,contentType:r.request().url().endsWith('.mjs')?'text/javascript':'text/html'}));
 async function init(user='gm',world='mesa',system='tagmar_rpg'){
  await page.goto('http://hotbar.test/');await page.addStyleTag({content:coreCSS});
  await page.evaluate(async({user,world,system})=>{
   window.hooks=new Map();window.executed=0;window.dropped=0;window.warningCount=0;
   window.Hooks={once(){},on(n,fn){hooks.set(n,fn);return fn},off(n,fn){if(hooks.get(n)===fn)hooks.delete(n)}};
   window.game={system:{id:system},world:{id:world},user:{id:user}};
   window.renderBar=()=>{
    const previous=document.getElementById('hotbar');previous?.remove();
    const bar=document.createElement('aside');bar.id='hotbar';bar.className='flexrow faded-ui lg';
    bar.innerHTML='<div id="hotbar-controls-left" class="hotbar-controls flexcol"><button>♫</button><button>☰</button></div><menu id="action-bar" class="flexrow">'+Array.from({length:10},(_,i)=>'<li class="slot full" draggable="true"><span class="key">'+(i+1)+'</span></li>').join('')+'</menu><div id="hotbar-controls-right" class="hotbar-controls flexrow"><div class="flexcol"><button class="page">▲</button><span>1</span><button>▼</button></div><div class="flexcol"><button class="lock">🔓</button><button>×</button></div></div>';
    document.getElementById('ui-bottom').append(bar);
    bar.querySelectorAll('.slot').forEach(el=>{el.addEventListener('click',()=>executed++);el.addEventListener('dragover',e=>e.preventDefault());el.addEventListener('drop',()=>dropped++)});
    bar.querySelector('.page').addEventListener('click',renderBar);
    hooks.get('renderHotbar')?.({element:bar},bar);
   };
   renderBar();window.hotbarModule=await import('/hotbar-position.mjs');
   window.runtime=hotbarModule.installHotbarPosition({game,Hooks,window,document,notifications:{warn(){warningCount++}}});
  },{user,world,system});
 }
 const rect=()=>page.locator('#hotbar').boundingBox();
 const near=(a,b)=>assert(Math.abs(a-b)<2,`${a} != ${b}`);
 async function move(dx,dy){const grip=await page.locator('.tagmar-hotbar-grip').boundingBox();await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2+dx,grip.y+grip.height/2+dy,{steps:5});await page.mouse.up();}
 try{
  await init();const initial=await rect();assert(initial.y>600);
  await page.locator('.slot').first().click();assert.equal(await page.evaluate(()=>executed),1);
  await move(80,-230);const moved=await rect();near(moved.x,initial.x+80);near(moved.y,initial.y-230);
  assert.equal(await page.evaluate(()=>executed),1);
  await page.locator('.slot').nth(2).dispatchEvent('drop');assert.equal(await page.evaluate(()=>dropped),1);
  const saved=await page.evaluate(()=>localStorage.getItem('tagmar.hotbar.position.v1:tagmar_rpg:mesa:gm'));assert(saved);
  await page.screenshot({path:path.join(output,'hotbar-moved.png')});
  for(let i=0;i<4;i++)await page.evaluate(()=>renderBar());
  assert.equal(await page.locator('.tagmar-hotbar-position-controls').count(),1);near((await rect()).x,moved.x);
  await page.locator('.slot').first().click();assert.equal(await page.evaluate(()=>executed),2);
  await init();near((await rect()).x,moved.x);near((await rect()).y,moved.y);
  // Mesmo navegador, outro usuário/mundo/sistema: posição independente.
  await init('player');assert(!await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  await move(-100,-100);const playerPosition=await rect();
  await init('gm','outra-mesa');assert(!await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  await init('gm','mesa','tagmar3er-oficial');assert(!await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  await move(-80,-180);assert(await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  await init('gm');near((await rect()).x,moved.x);
  // Escala da interface transformada no ancestral, inclusive mudanças ao vivo.
  await page.evaluate(()=>document.body.style.setProperty('--ui-scale','0.75'));await page.waitForTimeout(100);
  let before=await rect();await move(-50,-50);let after=await rect();near(after.x,before.x-50);near(after.y,before.y-50);
  await page.evaluate(()=>document.body.style.setProperty('--ui-scale','1.25'));await page.waitForTimeout(100);
  before=await rect();await move(0,-35);after=await rect();near(after.y,before.y-35);
  await page.screenshot({path:path.join(output,'hotbar-scaled.png')});
  // Escape e perda de foco cancelam o movimento sem salvar posição parcial.
  before=await rect();let grip=await page.locator('.tagmar-hotbar-grip').boundingBox();
  await page.mouse.move(grip.x+10,grip.y+10);await page.mouse.down();await page.mouse.move(grip.x+10,grip.y+70);await page.keyboard.press('Escape');await page.mouse.up();near((await rect()).y,before.y);
  grip=await page.locator('.tagmar-hotbar-grip').boundingBox();await page.mouse.move(grip.x+10,grip.y+10);await page.mouse.down();await page.mouse.move(grip.x+10,grip.y+70);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();near((await rect()).y,before.y);
  await page.evaluate(()=>{document.body.style.setProperty('--ui-scale','1');document.getElementById('hotbar').className+=' sm';});
  await page.setViewportSize({width:800,height:600});await page.waitForTimeout(120);after=await rect();assert(after.x>=7 && after.y>=7 && after.x+after.width<=801 && after.y+after.height<=601);
  await move(-3000,-3000);after=await rect();near(after.x,8);near(after.y,8);
  await page.locator('.tagmar-hotbar-grip').focus();await page.keyboard.press('ArrowRight');near((await rect()).x,13);
  await page.locator('.tagmar-hotbar-position-controls .fa-rotate-left').click();
  assert(!await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  assert.equal(await page.evaluate(()=>localStorage.getItem('tagmar.hotbar.position.v1:tagmar_rpg:mesa:gm')),null);
  await page.screenshot({path:path.join(output,'hotbar-reset.png')});
  await init('player');assert(await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  await page.evaluate(()=>{runtime.destroy();runtime=hotbarModule.installHotbarPosition({game,Hooks,window,document,storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}},notifications:{warn(){warningCount++}}});});
  await move(0,-90);assert.equal(await page.evaluate(()=>warningCount),1);
  await page.evaluate(()=>runtime.destroy());assert.equal(await page.locator('.tagmar-hotbar-position-controls').count(),0);
  assert(!await page.locator('#hotbar').evaluate(el=>el.classList.contains('tagmar-hotbar-floating')));
  assert.deepEqual(errors,[]);
  console.log('PASS: arrastar, escala 75/100/125%, recarregar, isolamento por usuário/mundo/sistema, rerender, macros, drop, limites, teclado, cancelar, restaurar e armazenamento indisponível. Interface simulada com CSS do Foundry 14.369.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
