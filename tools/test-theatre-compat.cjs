// Isolated browser test: original Theatre bundle, real PIXI, no worlds or actors.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(path.join(process.env.TAGMAR_TEST_NODE_MODULES, 'playwright'));

async function main() {
  const root = path.resolve(process.argv[2] || '.');
  const original = await fs.readFile(process.argv[3], 'utf8');
  assert(!original.includes('theatre-video-local'), 'Use the ORIGINAL unmodified Theatre bundle');
  const files = {};
  for (const name of ['theatre.js','theatre-media.js']) files['/compat/' + name] = await fs.readFile(path.join(root,'modules/compat',name));
  const response = await fetch(process.env.TAGMAR_TEST_PIXI_URL || 'http://localhost:30000/scripts/pixi.min.js');
  assert(response.ok);
  const pixi = await response.text();
  let png, clip;
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    const routes = {
      '/':['text/html','<!doctype html><body><script src="/pixi.js"></script>'],
      '/pixi.js':['text/javascript',pixi],
      '/original.mjs':['text/javascript',original + '\nexport {Theatre, TheatreHelpers};'],
      '/still.png':['image/png',png],
      '/icons/svg/mystery-man.svg':['image/png',png],
      '/portrait.webm':['video/webm',clip]
    };
    const route = files[url] ? ['text/javascript', files[url]] : routes[url];
    if (!route) return res.writeHead(404).end();
    res.setHeader('Content-Type',route[0]); res.end(route[1]);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true,channel:'msedge'});
    const page = await browser.newPage();
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const fixtures = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width=120; canvas.height=140;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle='#e9a343'; ctx.fillRect(0,0,120,140);
      const png=canvas.toDataURL().split(',')[1];
      const stream=canvas.captureStream(20);
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
      const chunks=[]; recorder.ondataavailable=e=>chunks.push(e.data);
      const done=new Promise(resolve=>recorder.onstop=resolve);
      recorder.start();
      for(let i=0;i<12;i++) {
        ctx.fillStyle='#22182a';ctx.fillRect(0,0,120,140);
        ctx.fillStyle='#e9a343';ctx.fillRect(i*7,40,25,70);
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      recorder.stop();await done;stream.getTracks().forEach(track=>track.stop());
      return {png,clip:Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))};
    });
    png=Buffer.from(fixtures.png,'base64');clip=Buffer.from(fixtures.clip);
    const result=await page.evaluate(async () => {
      const check=(value,label)=>{if(!value)throw Error(label);};
      const hooks=new Map();
      window.Hooks={on(name,fn){const list=hooks.get(name)||[];list.push(fn);hooks.set(name,list);},once(name,fn){this.on(name,fn);}};
      window.foundry={applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:base=>base}}};
      window.Handlebars={registerHelper(){}};
      const theatreModule={active:false,version:'v3.4.2'};
      const actor={id:'test',_id:'test',name:'Tester',img:'/still.png',flags:{theatre:{baseinsert:'/portrait.webm'}}};
      const actorBefore=JSON.stringify(actor);
      window.game={system:{id:'test-system'},modules:new Map([['theatre',theatreModule]]),user:{id:'gm',isGM:true},
        actors:new Map([['test',actor]]),i18n:{localize:key=>key},
        settings:{get:(_,key)=>({theatreImageSize:200,nameFont:'Arial'}[key] ?? false)}};
      window.ui={notifications:{error:message=>{throw Error(message);},info(){}}};
      const registrations=[];
      window.libWrapper={register(id,target,fn,type){
        const parts=target.split('.');const name=parts.pop();let owner=window;
        for(const part of parts)owner=owner[part];
        const original=owner[name];
        owner[name]=function(...args){return fn.call(this,original.bind(this),...args);};
        registrations.push({id,target,type,owner,name,original});
      },unregister(id,target){const item=registrations.find(item=>item.target===target);item.owner[item.name]=item.original;}};
      const compat=await import('/compat/theatre.js');
      check(!compat.installTheatreCompatibility() && !registrations.length,'disabled Theatre untouched');
      theatreModule.active=true;theatreModule.version='v3.5.0';
      check(!compat.installTheatreCompatibility() && !registrations.length,'untested version untouched');
      theatreModule.version='v3.4.2';
      check(!compat.installTheatreCompatibility(),'defer until Theatre exposes class');
      const {Theatre,TheatreHelpers}=await import('/original.mjs');
      window.Theatre=Theatre;
      const instance=Object.create(Theatre.prototype); Theatre.instance=instance;
      Object.assign(instance,{portraitDocks:[],renderAnims:0,rendering:false,stage:{},settings:{theatreStyle:'textbox'},fontWeight:'bold',
        theatreNavBar:document.createElement('div'),theatreChatCover:document.createElement('div'),
        theatreDock:{offsetHeight:160},theatreBar:{offsetHeight:0},speakingAs:'theatre-test'});
      instance.theatreChatCover.appendChild(document.createElement('img'));
      document.body.append(instance.theatreNavBar,instance.theatreChatCover);
      instance.isActorOwner=()=>true; instance.stageInsertById=()=>{};
      TheatreHelpers.relocateStage=()=>{}; // Only layout/sockets are outside this isolated test.
      const app=new PIXI.Application({width:180,height:180,autoStart:false,preserveDrawingBuffer:true});app.ticker.stop();
      instance.pixiCTX=app;instance.pixiToolTipCTX={ticker:{update(){}}};document.body.append(app.view);
      check(compat.installTheatreCompatibility(),'install on original Theatre');
      check(compat.installTheatreCompatibility() && registrations.length===5,'install idempotent');
      const media=await import('/compat/theatre-media.js');
      Theatre.addToNavBar(actor);
      const thumb=instance.getNavItemById('theatre-test'); await thumb.decode();
      check(thumb.getAttribute('src')==='/still.png','original addToNavBar uses static thumbnail');
      const cover=instance.getTheatreCoverPortrait();cover.src='/portrait.webm';
      await new Promise(resolve=>setTimeout(resolve,30));await cover.decode();
      check(cover.getAttribute('src')==='/still.png','cover corrected after original source mutation');
      thumb.src='/portrait.webm';await new Promise(resolve=>setTimeout(resolve,30));
      check(thumb.getAttribute('src')==='/still.png','config change corrected by observer');
      const resources=await instance._addSpritesToPixi([{imgpath:'/portrait.webm',resname:'video'},{imgpath:'/still.png',resname:'still'}]);
      const texture=resources.video;const video=texture.baseTexture.resource.source;
      check(video instanceof HTMLVideoElement && video.paused && video.muted && video.loop,'isolated silent video preload');
      check(!PIXI.Assets.cache.has('/portrait.webm'),'global cache unmodified');
      check(resources.still===await PIXI.Assets.load('/still.png'),'static loader unchanged');
      const dock=new PIXI.Container(), portraitContainer=new PIXI.Container();dock.addChild(portraitContainer);
      const insert={imgId:'theatre-test',name:'Tester',dockContainer:dock,portraitContainer,label:new PIXI.Text('Tester'),typingBubble:new PIXI.Sprite(resources.still),optAlign:'top'};
      instance.portraitDocks=[insert];
      // Real unmodified _setupPortraitContainer, using configuration's empty cache proxy.
      await instance._setupPortraitContainer('theatre-test','top','/portrait.webm',new Proxy({}, {get:()=>undefined}),false);
      check(insert.portrait.texture===texture,'configuration setup resolves private video cache');
      const samples=new Set(), times=[];
      for(let i=0;i<14;i++) {await new Promise(resolve=>setTimeout(resolve,100));samples.add(app.view.toDataURL());times.push(video.currentTime);}
      check(samples.size>=3,'original Theatre shows moving video without tweens');
      check(times.some((time,index)=>index && time<times[index-1]),'video loops');
      for(let i=0;i<10;i++)instance._renderTheatre(performance.now());
      instance.portraitDocks=[];instance._renderTheatre(performance.now());
      check(video.paused && !instance.rendering,'remove stops video and returns to original idle loop');
      instance.portraitDocks=[insert];instance._renderTheatre(performance.now());
      await new Promise(resolve=>setTimeout(resolve,100));check(!video.paused,'restage resumes');
      insert.portrait=new PIXI.Sprite(resources.still);instance._renderTheatre(performance.now());
      check(video.paused && !instance.rendering,'switch to PNG stops video');
      instance.portraitDocks=[{imgId:'theatre-test',dockContainer:new PIXI.Container(),label:null,portrait:null}];instance.getTextBoxById=()=>null;
      await instance.activateInsertById('theatre-test'); // Must not access null label.
      instance.portraitDocks=[];
      check(JSON.stringify(actor)===actorBefore,'actor data unchanged');
      let failed=false;try{await media.loadPortraitTexture('/missing.webm');}catch{failed=true;}check(failed,'missing video fails cleanly');
      check(hooks.has('renderChatLog') && hooks.has('ready'),'late initialization hooks registered');
      app.destroy(true);
      return {originalTheatre:true,pixi:PIXI.VERSION,distinctFrames:samples.size,disabledSafe:true,versionGuard:true,thumbnails:true,configProxy:true,playPauseLoop:true,worldUnchanged:true};
    });
    assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
