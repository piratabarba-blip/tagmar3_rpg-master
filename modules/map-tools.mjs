// Ferramentas do mapa compartilhadas por Tagmar XXX e Tagmar 3ER Oficial.
// Escala escreve apenas Tokens da cena; apontador usa atividade efêmera.
const BASELINE = 'mapToolsScaleBaseline';
const MIN = 0.2, MAX = 5;
const GAUNTLET_URL = new URL('../assets/ui/pointer-gauntlet.png', import.meta.url).href;
const GAUNTLET_SIZE = 64;
const GAUNTLET_TIP = {x:166 / 1254 * GAUNTLET_SIZE,y:48 / 1254 * GAUNTLET_SIZE};
const validScale = value => Number.isFinite(value) && Math.abs(value) > 0;

export function scalePatch(doc, namespace, {steps = 0, reset = false, percent = 5} = {}) {
  let x = doc.texture?.scaleX, y = doc.texture?.scaleY;
  if (!validScale(x) || !validScale(y)) return null;
  const saved = doc.getFlag(namespace, BASELINE);
  const baseline = saved && validScale(saved.x) && validScale(saved.y) ? saved : null;
  if (reset && !steps) return baseline ? {
    _id: doc.id, 'texture.scaleX': baseline.x, 'texture.scaleY': baseline.y,
    [`flags.${namespace}.-=${BASELINE}`]: null
  } : null;
  if (reset && baseline) {x = baseline.x;y = baseline.y;}
  if (!Number.isFinite(steps) || !steps || !Number.isFinite(percent) || percent <= 0) return null;
  // Um único fator preserva proporções diferentes nos dois eixos e espelhamento.
  const low = Math.max(MIN / Math.abs(x), MIN / Math.abs(y));
  const high = Math.min(MAX / Math.abs(x), MAX / Math.abs(y));
  if (low > high) return null;
  const factor = Math.min(high, Math.max(low, (1 + Math.min(percent, 50) / 100) ** steps));
  if (Math.abs(x * factor - doc.texture.scaleX) < 1e-10 && Math.abs(y * factor - doc.texture.scaleY) < 1e-10) return null;
  return {_id: doc.id, 'texture.scaleX': x * factor, 'texture.scaleY': y * factor,
    ...(!baseline ? {[`flags.${namespace}.${BASELINE}`]: {x, y}} : {})};
}

export function canScale(game, namespace, doc) {
  return !!(game.user.isGM && game.settings.get(namespace, 'mapScaleEnabled') && doc);
}

export function scaleTargets(canvas) {
  if (!canvas.ready || canvas.activeLayer !== canvas.tokens) return [];
  const selected = canvas.tokens.controlled ?? [];
  const hovered = canvas.tokens.hover;
  return selected.length ? selected : hovered ? [hovered] : [];
}

// Serializa atualizações e agrupa a roda rápida, sem perder incrementos.
export function createScaleQueue({game, namespace, onError = console.error}) {
  const pending = new Map();
  let running;
  const keyFor = (scene, doc) => `${scene.id}:${doc.id}`;
  return {
    enqueue(scene, documents, options) {
      for (const doc of documents) {
        if (!canScale(game, namespace, doc)) continue;
        const key = keyFor(scene, doc), previous = pending.get(key);
        // Uma restauração substitui incrementos ainda não gravados.
        pending.set(key, {scene, doc, options: options.reset ? options : {
          reset:previous?.options.reset ?? false,steps:(previous?.options.steps ?? 0) + options.steps
        }});
      }
    },
    flush() {
      if (running) return running;
      running = Promise.resolve().then(async () => {
        while (pending.size) {
          const batch = [...pending.values()];pending.clear();
          const scenes = new Map();
          for (const {scene, doc, options} of batch) {
            const live = scene.tokens.get(doc.id);
            if (!canScale(game, namespace, live)) continue;
            const patch = scalePatch(live, namespace, {...options, percent:game.settings.get(namespace, 'mapScaleStep')});
            if (!patch) continue;
            if (!scenes.has(scene)) scenes.set(scene, []);
            scenes.get(scene).push(patch);
          }
          for (const [scene, patches] of scenes) {
            try {await scene.updateEmbeddedDocuments('Token', patches);}
            catch (error) {onError(error);}
          }
        }
      }).finally(() => {running = undefined;});
      return running;
    }
  };
}

export function pointerAllowed(game, namespace, user = game.user) {
  return !!(user?.active && game.settings.get(namespace, 'mapPointerEnabled')
    && (user.isGM || (game.settings.get(namespace, 'mapPointerPlayers') && user.can('PING_CANVAS'))));
}

export function validPointer(data, canvas) {
  return data?.v === 1 && data.scene === canvas.scene?.id && data.level === (canvas.level?.id ?? null)
    && typeof data.active === 'boolean' && (!data.active || (
      Number.isFinite(data.x) && Number.isFinite(data.y)
      && canvas.dimensions?.rect?.contains(data.x, data.y)
      && ['hand', 'arrow'].includes(data.icon)));
}

export function createPointer({game, canvas, namespace, document, window, now = () => performance.now()}) {
  const pointers = new Map();
  let held = false, location, timer, frame, root;
  const setting = key => game.settings.get(namespace, key);
  const clear = id => {pointers.get(id)?.element.remove();pointers.delete(id);};
  function receive(userId, activity) {
    const data = activity?.tagmarPointer;
    if (!data) return;
    const user = game.users.get(userId);
    if (!pointerAllowed(game, namespace, user) || !canvas.ready || !validPointer(data, canvas)) return;
    if (!data.active) {clear(userId);return;}
    let item = pointers.get(userId);
    if (!item) {
      if (!root) {
        root = document.createElement('div');root.className = 'tagmar-map-pointers';
        root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden;';
        document.body.append(root);
      }
      const element = document.createElement('div');
      element.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;filter:drop-shadow(0 2px 3px #000);';
      element.setAttribute('aria-hidden', 'true');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 40 48');svg.setAttribute('width', '38');svg.setAttribute('height', '46');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const color = String(user.color?.css ?? user.color ?? '#ffcc55');
      path.setAttribute('fill', /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffcc55');
      path.setAttribute('stroke', '#fff');path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linejoin', 'round');svg.append(path);element.append(svg);
      const image = document.createElement('img');image.alt = '';
      image.width = GAUNTLET_SIZE;image.height = GAUNTLET_SIZE;
      image.draggable = false;image.className = 'tagmar-pointer-gauntlet';
      image.style.cssText = 'display:none;object-fit:contain;pointer-events:none;border:0;';
      element.append(image);
      const label = document.createElement('div');label.textContent = user.name;
      label.style.cssText = 'color:white;background:#161821d9;border-radius:4px;padding:2px 5px;font:12px sans-serif;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;';
      label.style.borderBottom = `2px solid ${path.getAttribute('fill')}`;
      element.append(label);root.append(element);
      item = {element, path, svg, image, imageLoaded:false};pointers.set(userId, item);
      image.onload = () => {item.imageLoaded = true;};
      image.onerror = () => {item.imageLoaded = false;};
      image.src = GAUNTLET_URL;
    }
    item.path.setAttribute('d', data.icon === 'arrow'
      ? 'M2 2 L35 24 L22 26 L29 42 L21 46 L14 29 L4 39 Z'
      : 'M14 26 V6 C14 0 22 0 22 6 V20 C22 15 29 15 29 21 V23 C29 18 35 20 35 25 V29 C39 25 40 30 38 36 L33 45 H14 L5 31 C1 25 6 22 10 27 L14 31 Z');
    Object.assign(item, {data, expires:now() + 1600});
    if (!frame) frame = window.requestAnimationFrame(render);
  }
  function render() {
    frame = undefined;
    for (const [id, item] of pointers) {
      if (!canvas.ready || item.expires < now() || !validPointer(item.data, canvas)
        || !pointerAllowed(game, namespace, game.users.get(id))) {clear(id);continue;}
      const point = canvas.clientCoordinatesFromCanvas(item.data);
      // O próprio apontador acompanha imediatamente; os remotos interpolam.
      const blend = id === game.user.id ? 1 : 0.45;
      item.x = item.x === undefined ? point.x : item.x + (point.x - item.x) * blend;
      item.y = item.y === undefined ? point.y : item.y + (point.y - item.y) * blend;
      const gauntlet = item.data.icon === 'hand' && item.imageLoaded;
      item.image.style.display = gauntlet ? 'block' : 'none';
      item.svg.style.display = gauntlet ? 'none' : 'block';
      const tip = gauntlet ? GAUNTLET_TIP : {x:item.data.icon === 'hand' ? 17 : 2,y:2};
      item.element.style.transform = `translate(${item.x - tip.x}px,${item.y - tip.y}px)`;
    }
    if (pointers.size) frame = window.requestAnimationFrame(render);
  }
  function send(active) {
    if (!canvas.scene) return;
    const data = {v:1,scene:canvas.scene.id,level:canvas.level?.id ?? null,active,
      x:location?.x,y:location?.y,icon:setting('mapPointerIcon')};
    receive(game.user.id, {tagmarPointer:data});
    // Mesmo canal transitório dos cursores nativos; não executa comandos remotos.
    game.user.broadcastActivity({tagmarPointer:data}, {volatile:active});
  }
  function tick() {
    if (!held) return;
    if (!pointerAllowed(game, namespace) || !canvas.ready || document.hidden) {stop();return;}
    if (location) send(true);
  }
  function start() {
    if (held) return true;
    if (!pointerAllowed(game, namespace) || !canvas.ready || document.hidden || !location) return false;
    held = true;tick();timer = window.setInterval(tick, 100);return true;
  }
  function stop() {
    const wasHeld = held;held = false;window.clearInterval(timer);timer = undefined;
    if (wasHeld) send(false);
    clear(game.user.id);
    return wasHeld;
  }
  function move(event) {
    const overBoard = document.elementFromPoint(event.clientX, event.clientY)?.id === 'board';
    if (!overBoard || !canvas.ready) {if (held) stop();location = undefined;return;}
    location = canvas.canvasCoordinatesFromClient({x:event.clientX,y:event.clientY});
    if (held) {
      // Atualização local imediata, transmissão limitada a 10 por segundo.
      receive(game.user.id, {tagmarPointer:{v:1,scene:canvas.scene.id,level:canvas.level?.id??null,
        active:true,...location,icon:setting('mapPointerIcon')}});
    }
  }
  function reset() {
    stop();location = undefined;
    for (const id of [...pointers.keys()]) clear(id);
    if (frame) window.cancelAnimationFrame(frame);frame = undefined;
  }
  return {start,stop,move,receive,reset,destroy() {reset();root?.remove();root = undefined;}};
}

let runtime;
export function registerMapTools(game) {
  const namespace = game.system.id;
  function register(key, name, hint, type, value, options = {}) {
    game.settings.register(namespace, key, {name,hint,type,default:value,scope:'world',config:true,restricted:true,...options});
  }
  register('mapScaleEnabled','Mapa — escala dos tokens com a roda',
    'Exclusivo do mestre. Selecione tokens, deixe o mouse sobre o mapa e segure G enquanto gira a roda. Altera apenas a imagem, mantendo grade, proporções e espelhamento. Sem seleção, usa o token sob o mouse. Troque G em Configuração de controles.',Boolean,true);
  register('mapScaleStep','Mapa — variação da escala (%)',
    'Variação proporcional por passo da roda. Limites de 20% a 500%. Segure G e pressione 0 (superior ou numérico) para restaurar a escala anterior ao primeiro ajuste. Se remapear G, use a nova tecla + 0.',Number,5,{range:{min:1,max:25,step:1}});
  register('mapPointerEnabled','Mapa — apontador compartilhado',
    'Segure P sobre o mapa para apontar aos participantes da mesma cena e andar. Solte para esconder. Não move câmeras nem revela o mapa. Troque a tecla em Configuração de controles.',Boolean,true,
    {onChange:()=>runtime?.pointer.reset()});
  register('mapPointerPlayers','Mapa — jogadores podem usar o apontador',
    'Também exige a permissão nativa de fazer pings. Desligado: somente mestres podem apontar; todos podem ver.',Boolean,false,
    {onChange:()=>runtime?.pointer.reset()});
  register('mapPointerIcon','Mapa — formato do meu apontador',
    'Os outros participantes veem o formato escolhido e a sua cor de usuário.',String,'hand',
    {scope:'client',restricted:false,choices:{hand:'Manopla dourada',arrow:'Seta'}});
  game.keybindings.register(namespace,'mapPointer',{
    name:'Mapa — segurar para apontar',hint:'Segure a tecla com o mouse sobre o mapa. Solte para esconder.',
    editable:[{key:'KeyP'}],onDown:()=>runtime?.pointer.start()??false,
    onUp:()=>runtime?.pointer.stop()??false,repeat:false
  });
  game.keybindings.register(namespace,'mapScaleHold',{
    name:'Mapa — segurar para ajustar escala',
    hint:'Exclusivo do mestre. Segure esta tecla e gire a roda sobre o mapa.',
    editable:[{key:'KeyG'}],onDown:()=>runtime?.startScale()??false,
    onUp:()=>runtime?.stopScale()??false,repeat:false,restricted:true
  });
  game.keybindings.register(namespace,'mapScaleReset',{
    name:'Mapa — restaurar escala dos tokens',hint:'Restaura a imagem dos tokens selecionados ao tamanho salvo antes do primeiro ajuste com a roda.',
    editable:[],onDown:()=>runtime?.resize({reset:true})??false,repeat:false,restricted:true
  });
}

export function installMapTools({game,canvas,Hooks,window,document,notifications}) {
  const namespace = game.system.id;
  const pointer = createPointer({game,canvas,namespace,document,window});
  const queue = createScaleQueue({game,namespace,onError:error=>{
    console.error('Tagmar | Escala de tokens',error);notifications.warn('Não foi possível ajustar a escala. Confira as permissões dos tokens.');
  }});
  let debounce, scaleHeld = false;
  const editing = () => {
    const element = document.activeElement;
    return !!(element?.isContentEditable || element?.closest?.('input,textarea,select,[contenteditable="true"]'));
  };
  function startScale() {
    if (!game.user.isGM || !game.settings.get(namespace,'mapScaleEnabled') || editing()
      || !scaleTargets(canvas).length) return false;
    scaleHeld = true;return true;
  }
  function stopScale() {const wasHeld = scaleHeld;scaleHeld = false;return wasHeld;}
  function resize(options) {
    const documents = scaleTargets(canvas).map(token=>token.document).filter(doc=>canScale(game,namespace,doc));
    if (!documents.length) return false;
    queue.enqueue(canvas.scene, documents, options);
    window.clearTimeout(debounce);
    debounce = window.setTimeout(()=>void queue.flush(),60);
    return true;
  }
  function wheel(event) {
    if (!scaleHeld || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY || editing()) return;
    if (document.elementFromPoint(event.clientX,event.clientY)?.id !== 'board') return;
    if (!resize({steps:event.deltaY < 0 ? 1 : -1})) return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function resetKey(event) {
    if (!scaleHeld || !['Digit0','Numpad0'].includes(event.code) || editing()
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!resize({reset:true})) return;
    // Impede que o zero também execute o décimo espaço da barra de macros.
    event.preventDefault();event.stopImmediatePropagation();
  }
  const resetInteraction = () => {stopScale();pointer.reset();};
  const visibility = () => {if(document.hidden)resetInteraction();};
  const escape = event => {if(event.code==='Escape'){stopScale();pointer.stop();}};
  window.addEventListener('wheel',wheel,{capture:true,passive:false});
  window.addEventListener('pointermove',pointer.move);
  window.addEventListener('blur',resetInteraction);
  window.addEventListener('focusin',stopScale);
  window.addEventListener('keydown',escape);
  window.addEventListener('keydown',resetKey,true);
  document.addEventListener('visibilitychange',visibility);
  game.socket.on('userActivity',pointer.receive);
  game.socket.on('disconnect',pointer.reset);
  const hooks = [Hooks.on('canvasTearDown',resetInteraction),Hooks.on('canvasReady',resetInteraction)];
  return {pointer,resize,startScale,stopScale,flush:()=>queue.flush(),destroy() {
    stopScale();pointer.destroy();window.clearTimeout(debounce);
    window.removeEventListener('wheel',wheel,true);window.removeEventListener('pointermove',pointer.move);
    window.removeEventListener('blur',resetInteraction);window.removeEventListener('focusin',stopScale);window.removeEventListener('keydown',escape);
    window.removeEventListener('keydown',resetKey,true);
    document.removeEventListener('visibilitychange',visibility);
    game.socket.off('userActivity',pointer.receive);game.socket.off('disconnect',pointer.reset);
    Hooks.off('canvasTearDown',hooks[0]);Hooks.off('canvasReady',hooks[1]);
  }};
}

if (globalThis.Hooks) {
  Hooks.once('init',()=>registerMapTools(game));
  Hooks.once('ready',()=>{
    runtime = installMapTools({game,canvas,Hooks,window,document,notifications:ui.notifications});
    game.tagmar.mapTools = runtime;
  });
}
