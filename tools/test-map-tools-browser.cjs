// Duas páginas isoladas simulam mestre/jogador e retransmissão de atividade.
// Não abre nem modifica mundos do Foundry.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [packages,output]=process.argv.slice(2);
const {chromium}=require(path.join(packages,'playwright'));
const source=fs.readFileSync(path.join(__dirname,'../modules/map-tools.mjs'),'utf8');
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const gm=await browser.newPage({viewport:{width:1000,height:700}});
    const player=await browser.newPage({viewport:{width:1000,height:700}});
    const pages=[gm,player],errors=[];
    for (const [i,page] of pages.entries()) {
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',r=>new URL(r.request().url()).pathname.endsWith('pointer-gauntlet.png')
        ? r.fulfill({body:fs.readFileSync(path.join(__dirname,'../assets/ui/pointer-gauntlet.png')),contentType:'image/png'})
        : r.fulfill({body:source,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
      await page.exposeFunction('relayActivity',async(id,data)=>{
        const other=pages[1-i];if(!other.isClosed())await other.evaluate(({id,data})=>window.socketListeners.get('userActivity')?.(id,data),{id,data});
      });
      await page.setContent(`<html><head><base href="http://map-test.local/"><style>body{margin:0;background:#111827;color:#ddd;font:16px sans-serif}#board{position:absolute;inset:0;width:100%;height:100%;background-color:#263b43;background-image:linear-gradient(#ffffff12 1px,transparent 1px),linear-gradient(90deg,#ffffff12 1px,transparent 1px);background-size:50px 50px}.panel{position:absolute;right:20px;top:20px;padding:20px;background:#10151e;border:1px solid #c89d45;z-index:100}input{width:140px}</style></head><body><canvas id="board"></canvas><aside class="panel">${i?'Jogador':'Mestre'}<br><input placeholder="Campo de texto"></aside></body></html>`);
      await page.evaluate(async isGM=>{
        window.settings=new Map();window.keybindings=new Map();window.socketListeners=new Map();window.activity=[];
        const users=new Map([['gm',{id:'gm',name:'Mestre',isGM:true,active:true,color:'#efbb43',can:()=>true}],['player',{id:'player',name:'Jogador',isGM:false,active:true,color:'#55bfff',can:()=>true}]]);
        window.game={system:{id:'tagmar_rpg'},users,user:users.get(isGM?'gm':'player'),
          settings:{register:(_n,k,d)=>settings.set(k,d.default),get:(_n,k)=>settings.get(k)},
          keybindings:{register:(_n,k,d)=>keybindings.set(k,d)},
          socket:{on:(k,fn)=>socketListeners.set(k,fn),off:k=>socketListeners.delete(k)}};
        game.user.broadcastActivity=(data)=>{activity.push(data);void relayActivity(game.user.id,data);};
        const make=(id,x,y)=>({id,texture:{scaleX:x,scaleY:y},isOwner:true,flags:{},getFlag(_n,k){return this.flags[k];}});
        const docs=new Map([['a',make('a',1,1)],['b',make('b',-1,2)]]);
        window.writes=[];
        const scene={id:'scene',tokens:docs,async updateEmbeddedDocuments(type,patches){writes.push({type,patches});for(const p of patches){const d=docs.get(p._id);d.texture.scaleX=p['texture.scaleX'];d.texture.scaleY=p['texture.scaleY'];for(const [key,value]of Object.entries(p)){if(!key.startsWith('flags.tagmar_rpg.'))continue;const k=key.slice(17);if(k.startsWith('-='))delete d.flags[k.slice(2)];else d.flags[k]=value;}}}};
        const tokens={controlled:[...docs.values()].map(document=>({document}))};
        window.transform={scale:1,x:0,y:0};
        window.canvas={ready:true,scene,tokens,activeLayer:tokens,level:{id:'ground'},dimensions:{rect:{contains:(x,y)=>x>=0&&y>=0&&x<=2000&&y<=2000}},
          canvasCoordinatesFromClient:({x,y})=>({x:(x-transform.x)/transform.scale,y:(y-transform.y)/transform.scale}),
          clientCoordinatesFromCanvas:({x,y})=>({x:x*transform.scale+transform.x,y:y*transform.scale+transform.y})};
        const once=new Map();window.Hooks={once:(name,fn)=>once.set(name,fn),on:()=>1,off:()=>{}};
        window.ui={notifications:{warn:message=>{throw Error(message);}}};game.tagmar={};
        await import('/map-tools.mjs');
        once.get('init')();once.get('ready')();
        window.runtime=game.tagmar.mapTools;
        // Simula o despachante de atalhos do Foundry com eventos reais do navegador.
        for (const [eventName,callback] of [['keydown','onDown'],['keyup','onUp']]) {
          window.addEventListener(eventName,event=>{
            const binding=keybindings.get('mapScaleHold');
            if (event.code===binding.editable[0].key && (!binding.restricted || game.user.isGM)) binding[callback]();
          });
        }
      },i===0);
    }
    const wheel=(page,options={})=>page.evaluate(options=>{
      const event=new WheelEvent('wheel',{clientX:300,clientY:300,deltaY:-100,bubbles:true,cancelable:true,...options});
      document.getElementById('board').dispatchEvent(event);return event.defaultPrevented;
    },options);
    assert.equal(await wheel(gm),false,'Ordinary zoom untouched');
    assert.equal(await wheel(gm,{altKey:true}),false,'Alt no longer controls scaling');
    await gm.keyboard.down('g');
    assert.equal(await wheel(gm),true);
    await gm.waitForFunction(()=>canvas.scene.tokens.get('a').texture.scaleX>1);
    assert.deepEqual(await gm.evaluate(()=>[...canvas.scene.tokens.values()].map(d=>d.texture)),[{scaleX:1.05,scaleY:1.05},{scaleX:-1.05,scaleY:2.1}]);
    await gm.keyboard.up('g');
    assert.equal(await wheel(gm),false,'Releasing G restores normal wheel');
    await gm.keyboard.down('g');
    assert.equal(await wheel(gm,{clientX:900,clientY:60}),false,'Forms untouched');
    await player.keyboard.down('g');
    await player.evaluate(()=>settings.set('mapScalePlayers',true));
    assert.equal(await player.evaluate(()=>runtime.startScale()),false);
    assert.equal(await wheel(player),false,'Players cannot scale even with legacy setting enabled');
    await player.keyboard.up('g');
    await gm.evaluate(()=>{window.zeroEvents=0;window.addEventListener('keydown',e=>{if(['Digit0','Numpad0'].includes(e.code))zeroEvents++;});});
    await gm.keyboard.press('0');await gm.evaluate(()=>runtime.flush());
    assert.deepEqual(await gm.evaluate(()=>[...canvas.scene.tokens.values()].map(d=>d.texture)),[{scaleX:1,scaleY:1},{scaleX:-1,scaleY:2}]);
    assert.equal(await gm.evaluate(()=>zeroEvents),0,'G+0 must not trigger hotbar');
    await wheel(gm);await gm.evaluate(()=>runtime.flush());
    await gm.keyboard.press('Numpad0');await gm.evaluate(()=>runtime.flush());
    assert.equal(await gm.evaluate(()=>canvas.scene.tokens.get('a').texture.scaleX),1,'G+Numpad0 restores scale');
    assert.equal(await gm.evaluate(()=>zeroEvents),0);
    await gm.keyboard.up('g');
    await gm.keyboard.press('0');assert.equal(await gm.evaluate(()=>zeroEvents),1,'Zero alone remains available');
    await player.keyboard.down('g');await player.keyboard.press('0');await player.evaluate(()=>runtime.flush());
    assert.equal(await player.evaluate(()=>writes.length),0,'Player cannot restore');
    await player.keyboard.up('g');
    await gm.locator('input').focus();await gm.keyboard.down('g');
    assert.equal(await wheel(gm),false,'Typing G in a form does not activate scaling');
    await gm.keyboard.up('g');await gm.locator('input').blur();
    await gm.keyboard.down('g');
    assert.equal(await wheel(gm,{shiftKey:true}),false);
    await gm.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await wheel(gm),false,'Losing focus cancels scale mode');
    await gm.keyboard.up('g');
    await gm.evaluate(()=>keybindings.get('mapScaleHold').editable[0].key='KeyY');
    await gm.keyboard.down('g');assert.equal(await wheel(gm),false);await gm.keyboard.up('g');
    await gm.keyboard.down('y');assert.equal(await wheel(gm),true);
    await gm.evaluate(()=>runtime.flush());await gm.keyboard.press('0');await gm.evaluate(()=>runtime.flush());
    assert.equal(await gm.evaluate(()=>canvas.scene.tokens.get('a').texture.scaleX),1,'Remapped hold key + 0 restores');
    await gm.keyboard.up('y');
    await gm.evaluate(()=>runtime.flush());
    await gm.mouse.move(300,250);
    assert.equal(await gm.evaluate(()=>keybindings.get('mapPointer').onDown()),true);
    await player.waitForSelector('.tagmar-map-pointers > div');
    await player.waitForFunction(()=>document.querySelector('.tagmar-pointer-gauntlet')?.naturalWidth===1254);
    assert.equal(await player.locator('.tagmar-map-pointers > div').textContent(),'Mestre');
    await gm.mouse.move(500,350);
    await player.waitForFunction(()=>{const e=document.querySelector('.tagmar-pointer-gauntlet');return e&&Math.abs(e.getBoundingClientRect().x+166/1254*64-500)<2;});
    await player.evaluate(()=>{transform.scale=1.25;transform.x=-100;});
    await player.waitForFunction(()=>Math.abs(document.querySelector('.tagmar-pointer-gauntlet').getBoundingClientRect().x+166/1254*64-525)<2);
    assert.equal(await player.evaluate(()=>runtime.pointer.start()),false,'Players cannot point by default');
    await player.screenshot({path:path.join(output,'player-hand.png')});
    await gm.evaluate(()=>settings.set('mapPointerIcon','arrow'));
    await player.waitForFunction(()=>document.querySelector('.tagmar-map-pointers path')?.getAttribute('d').startsWith('M2 2'));
    await player.screenshot({path:path.join(output,'player-arrow.png')});
    await gm.evaluate(()=>keybindings.get('mapPointer').onUp());
    await player.waitForFunction(()=>!document.querySelector('.tagmar-map-pointers > div'));
    await gm.mouse.move(400,300);await gm.evaluate(()=>runtime.pointer.start());
    await player.waitForSelector('.tagmar-map-pointers > div');
    await gm.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await player.waitForFunction(()=>!document.querySelector('.tagmar-map-pointers > div'));
    // Outra cena/andar não recebe marcador nem sofre pan.
    await player.evaluate(()=>canvas.level.id='upper');
    await gm.mouse.move(420,310);await gm.evaluate(()=>runtime.pointer.start());
    await gm.waitForFunction(()=>activity.filter(a=>a.tagmarPointer?.active).length>5);
    assert.equal(await player.locator('.tagmar-map-pointers > div').count(),0);
    await gm.evaluate(()=>runtime.pointer.stop());await player.evaluate(()=>canvas.level.id='ground');
    await player.evaluate(()=>runtime.pointer.receive('gm',{tagmarPointer:{v:1,scene:'scene',level:'ground',active:true,x:100,y:100,icon:'hand'}}));
    await player.waitForSelector('.tagmar-map-pointers > div');
    await player.waitForFunction(()=>!document.querySelector('.tagmar-map-pointers > div'),{},{timeout:2500});
    await player.evaluate(()=>runtime.pointer.receive('player',{tagmarPointer:{v:1,scene:'scene',level:'ground',active:true,x:100,y:100,icon:'hand'}}));
    assert.equal(await player.locator('.tagmar-map-pointers > div').count(),0);
    for(const page of pages)await page.evaluate(()=>runtime.destroy());
    assert.deepEqual(errors,[]);
    console.log('PASS: two-client pointer relay, mouse tracking, hand/arrow, zoom, release/blur/TTL, scene-level separation, permissions, group scaling and form/zoom preservation. Simulated clients; live Foundry session still requires validation.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
