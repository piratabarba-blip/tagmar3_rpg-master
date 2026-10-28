// Posição pessoal da hotbar. Não reordena macros nem modifica dados do mundo.
const CLASS = 'tagmar-hotbar-floating';
const CONTROLS = 'tagmar-hotbar-position-controls';
const clamp = (n, min, max) => Math.min(Math.max(min, max), Math.max(min, n));

export function installHotbarPosition({game, Hooks, window, document, storage, notifications}) {
  const key = `tagmar.hotbar.position.v1:${game.system.id}:${game.world.id}:${game.user.id}`;
  let position = null, bar, controller, observer, drag, frame, warned = false;
  const lifetime = new window.AbortController();
  try {
    storage ??= window.localStorage;
    const saved = JSON.parse(storage.getItem(key));
    if (saved?.v === 1 && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      position = {v:1, x:clamp(saved.x,0,1), y:clamp(saved.y,0,1)};
    }
  } catch { /* Preferência inválida ou armazenamento indisponível: posição nativa. */ }

  const style = document.createElement('style');
  style.dataset.tagmarHotbarPosition = '';
  style.textContent = `
    #hotbar > .${CONTROLS} {align-items:center; width:24px; pointer-events:auto;}
    #hotbar .tagmar-hotbar-grip {cursor:grab; touch-action:none;}
    #hotbar .${CONTROLS} button:focus-visible {outline:2px solid var(--color-warm-1,#d5ae65); outline-offset:2px;}
    #hotbar.${CLASS} {position:fixed !important; margin:0 !important;
      left:var(--tagmar-hotbar-x) !important; top:var(--tagmar-hotbar-y) !important;
      right:auto !important; bottom:auto !important; transform:none !important;
      transition:opacity var(--ui-fade-duration,250ms);}
    #hotbar.tagmar-hotbar-dragging {opacity:1 !important; user-select:none;}
    #hotbar.tagmar-hotbar-dragging .tagmar-hotbar-grip {cursor:grabbing;}
  `;
  document.head.append(style);

  function store() {
    try { if (position) storage.setItem(key,JSON.stringify(position)); else storage.removeItem(key); }
    catch {
      if (!warned) notifications?.warn('A posição da barra funciona nesta sessão, mas o navegador não permitiu salvá-la.');
      warned = true;
    }
  }
  function nativePosition() {
    bar?.classList.remove(CLASS);
    bar?.style.removeProperty('--tagmar-hotbar-x');
    bar?.style.removeProperty('--tagmar-hotbar-y');
  }
  function bounds(rect) {
    return {x:Math.max(0,window.innerWidth-rect.width), y:Math.max(0,window.innerHeight-rect.height)};
  }
  function place(x,y) {
    if (!bar?.isConnected || !bar.getClientRects().length) return;
    bar.classList.add(CLASS);
    // Foundry aplica --ui-scale no ancestral #ui-middle. Não mover a barra
    // para outro pai: seus eventos, renderizações e seletores nativos continuam válidos.
    bar.style.setProperty('--tagmar-hotbar-x','0px');
    bar.style.setProperty('--tagmar-hotbar-y','0px');
    const origin = bar.getBoundingClientRect();
    const scaleX = origin.width / bar.offsetWidth || 1;
    const scaleY = origin.height / bar.offsetHeight || 1;
    const limit = bounds(origin);
    x = clamp(x,8,limit.x-8); y = clamp(y,8,limit.y-8);
    bar.style.setProperty('--tagmar-hotbar-x',`${(x-origin.left)/scaleX}px`);
    bar.style.setProperty('--tagmar-hotbar-y',`${(y-origin.top)/scaleY}px`);
  }
  function restore() {
    if (!bar?.isConnected || drag) return;
    if (!position) return nativePosition();
    const limit = bounds(bar.getBoundingClientRect());
    place(position.x*limit.x,position.y*limit.y);
  }
  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(()=>{ frame=null; restore(); });
  }
  function savePosition() {
    const rect = bar.getBoundingClientRect(), limit = bounds(rect);
    position = {v:1,x:limit.x ? clamp(rect.left/limit.x,0,1) : 0,y:limit.y ? clamp(rect.top/limit.y,0,1) : 0};
    store();
  }
  function finish(cancel=false) {
    if (!drag) return;
    const {handle,id,moved} = drag;
    drag=null;
    bar?.classList.remove('tagmar-hotbar-dragging');
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    if (cancel || !moved) restore(); else savePosition();
  }
  function reset(event) {
    event?.preventDefault(); event?.stopPropagation();
    finish(true); position=null; store(); nativePosition();
  }
  function mount(app,html) {
    const candidate = html instanceof window.HTMLElement ? html : html?.[0] ?? app?.element;
    const next = candidate?.id === 'hotbar' ? candidate : document.getElementById('hotbar');
    if (!next || next.ownerDocument !== document) return;
    finish(true); controller?.abort(); observer?.disconnect();
    if (bar && bar !== next) { nativePosition(); bar.querySelector(`.${CONTROLS}`)?.remove(); }
    bar=next;
    controller = new window.AbortController();
    bar.querySelector(`.${CONTROLS}`)?.remove();
    const controls = document.createElement('div');
    controls.className=`${CONTROLS} hotbar-controls flexcol`;
    function button(icon,label,extra='') {
      const element=document.createElement('button');
      element.type='button'; element.className=`ui-control icon fa-solid ${icon} ${extra}`;
      element.title=label; element.setAttribute('aria-label',label);
      controls.append(element); return element;
    }
    const handle=button('fa-grip-vertical','Mover barra de macros: arraste. Setas também movem; Shift move mais. Esc cancela.','tagmar-hotbar-grip');
    const home=button('fa-rotate-left','Restaurar posição original da barra de macros');
    bar.prepend(controls);
    const options={signal:controller.signal};
    handle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();},options);
    handle.addEventListener('pointerdown',event=>{
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault(); event.stopPropagation(); handle.focus({preventScroll:true});
      finish(true);
      drag={id:event.pointerId,handle,startX:event.clientX,startY:event.clientY,rect:bar.getBoundingClientRect(),moved:false};
      handle.setPointerCapture(event.pointerId);
    },options);
    handle.addEventListener('pointermove',event=>{
      if (!drag || drag.id !== event.pointerId) return;
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      if (!drag.moved && Math.hypot(dx,dy)<4) return;
      event.preventDefault(); event.stopPropagation(); drag.moved=true;
      bar.classList.add('tagmar-hotbar-dragging');
      place(drag.rect.left+dx,drag.rect.top+dy);
    },options);
    handle.addEventListener('pointerup',event=>{
      if (drag?.id !== event.pointerId) return;
      event.preventDefault(); event.stopPropagation(); finish();
    },options);
    handle.addEventListener('pointercancel',()=>finish(true),options);
    handle.addEventListener('lostpointercapture',()=>finish(true),options);
    handle.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape','Home'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if(event.key==='Escape') return finish(true);
      if(event.key==='Home') return reset();
      const rect=bar.getBoundingClientRect(),step=event.shiftKey?20:5;
      place(rect.left+({ArrowLeft:-step,ArrowRight:step}[event.key]||0),rect.top+({ArrowUp:-step,ArrowDown:step}[event.key]||0));
      savePosition();
    },options);
    home.addEventListener('click',reset,options);
    observer=new window.ResizeObserver(schedule); observer.observe(bar);
    restore(); schedule();
  }
  const hook=Hooks.on('renderHotbar',mount);
  window.addEventListener('resize',schedule,{signal:lifetime.signal});
  window.addEventListener('blur',()=>finish(true),{signal:lifetime.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(true);},{signal:lifetime.signal});
  const uiObserver=new window.MutationObserver(schedule);
  uiObserver.observe(document.body,{attributes:true,attributeFilter:['style','class']});
  mount();
  return {reset,destroy() {
    finish(true); lifetime.abort(); controller?.abort(); observer?.disconnect(); uiObserver.disconnect();
    Hooks.off('renderHotbar',hook);
    if(frame) window.cancelAnimationFrame(frame);
    nativePosition(); bar?.querySelector(`.${CONTROLS}`)?.remove(); style.remove();
  }};
}

if (globalThis.Hooks) Hooks.once('ready',()=>{
  game.tagmar ??= {};
  game.tagmar.hotbarPosition?.destroy();
  game.tagmar.hotbarPosition=installHotbarPosition({game,Hooks,window,document,notifications:ui.notifications});
});
