// Integração de apresentação: não modifica documentos, flags, recursos ou o Bar Brawl.
export const BAR_SETTING = 'mapBarVisibility';
export const NAME_SETTING = 'mapNameBelowBars';
const MODES = new Set(['individual', 'hover', 'hoverControl']);

// Calcula em coordenadas do Token: getBounds é global e muda com zoom/pan.
// Nunca altera a visibilidade do nome ou consulta recursos que o cliente não vê.
export function positionNameBelowBars(token, enabled=true, {
  uiScale=globalThis.canvas?.dimensions?.uiScale??1,
  border=globalThis.CONFIG?.Canvas?.objectBorderThickness??4
}={}) {
  if(!token?.nameplate||token.destroyed)return;
  const size=token.document.getSize?.()??{width:token.w,height:token.h};
  if(!Number.isFinite(size.width)||!Number.isFinite(size.height))return;
  const nativeY=size.height+border*0.75*uiScale;
  let y=nativeY;
  if(enabled&&token.bars?.visible!==false&&token.bars?.renderable!==false&&typeof token.toLocal==='function'){
    const margin=4*uiScale;
    for(const child of token.bars.children){
      if(child.visible===false||child.renderable===false||child.alpha===0||child.destroyed||typeof child.getBounds!=='function')continue;
      const b=child.getBounds();
      if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)continue;
      const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>token.toLocal({x,y}));
      const bottom=Math.max(...points.map(p=>p.y));
      if(Number.isFinite(bottom))y=Math.max(y,bottom+margin);
    }
  }
  token.nameplate.position.set(size.width/2,y);
}

export function barVisible(token, bar, mode, api) {
  const copy = structuredClone(bar);
  if (!MODES.has(mode) || mode === 'individual') return api.isBarVisible(token, copy);
  if (!token.hover && !(mode === 'hoverControl' && token.controlled)) return false;
  // Consulta as permissões e restrições originais com os dois estados transitórios
  // habilitados. Diferente de ignoreTransient, isso preserva hideFull/Empty/Combat.
  // Getters privados continuam recebendo o Token original como receiver.
  const eligible = new Proxy(token, {get(target, key) {
    if (key === 'hover' || key === 'controlled') return true;
    return Reflect.get(target, key, target);
  }});
  return api.isBarVisible(eligible, copy);
}

export function installBarVisibility({game, canvas, Hooks, onError = console.error}) {
  const watched = new Map(), hooks = [];
  let reported = false;
  const mode = () => game.settings.get(game.system.id, BAR_SETTING);
  const api = () => {
    const module = game.modules.get('barbrawl');
    return module?.active && typeof module.api?.isBarVisible === 'function'
      && typeof module.api?.getBar === 'function' ? module.api : null;
  };
  function apply(token, child, preference = mode()) {
    const current = api();
    if (!current || !child || token.destroyed) return;
    try {
      // Evita o preenchimento de id que getBar faz diretamente nas flags atuais.
      const stored = token.document.getFlag('barbrawl', 'resourceBars')?.[child.name];
      const bar = stored ?? current.getBar(token.document, child.name);
      if (bar) child.visible = barVisible(token, bar, preference, current);
    } catch (error) {
      // Um recurso inesperado não pode tornar uma barra secreta visível.
      if (preference !== 'individual') child.visible = false;
      if (!reported) onError('Tagmar | Não foi possível ajustar a visibilidade de uma barra do Bar Brawl.', error);
      reported = true;
    }
  }
  function detach(token) {
    const previous = watched.get(token);
    previous?.container.off('childAdded', previous.listener);
    previous?.container.off('childRemoved', previous.removed);
    watched.delete(token);
  }
  function refresh(token) {
    if (!api() || !token?.bars || token.destroyed) return;
    const container = token.bars;
    if (watched.get(token)?.container !== container) {
      detach(token);
      const layout=()=>positionNameBelowBars(token,game.settings.get(game.system.id,NAME_SETTING)!==false);
      const listener = child => {apply(token, child);layout();};
      const removed=()=>queueMicrotask(()=>{if(watched.has(token)&&!token.destroyed)layout();});
      container.on('childAdded', listener);
      container.on('childRemoved', removed);
      watched.set(token, {container, listener, removed});
    }
    for (const child of container.children) apply(token, child);
    positionNameBelowBars(token,game.settings.get(game.system.id,NAME_SETTING)!==false);
  }
  function refreshAll() {
    if (!canvas.ready) return;
    for (const token of canvas.tokens?.placeables ?? []) refresh(token);
  }
  function clear() {for (const token of [...watched.keys()]) detach(token);}
  const on = (name, callback) => hooks.push([name, Hooks.on(name, callback)]);
  // Registrados em ready, após os hooks nativos de visibilidade do Bar Brawl.
  for (const name of ['drawToken','refreshToken','hoverToken','controlToken']) on(name, refresh);
  for (const name of ['createCombatant','deleteCombatant']) on(name, combatant => refresh(combatant.token?.object));
  on('canvasReady', refreshAll);
  on('canvasTearDown', clear);
  on('destroyToken', detach);
  on('updateUser', refreshAll);
  refreshAll();
  return {refreshAll,destroy() {
    for (const [token,{container}] of watched) {
      for (const child of container.children) apply(token,child,'individual');
      positionNameBelowBars(token,false);
    }
    clear();
    for (const [name,id] of hooks) Hooks.off(name,id);
  }};
}

let integration;
export function registerBarVisibility(game) {
  game.settings.register(game.system.id, NAME_SETTING, {
    name:'Mapa — nome abaixo das barras (Bar Brawl)',
    hint:'Afasta o nome da última barra visível, com uma pequena margem. Respeita as opções de exibição do nome e das barras de cada token. Desmarque para voltar à posição padrão do Foundry.',
    scope:'world',config:true,restricted:true,type:Boolean,default:true,
    onChange:()=>integration?.refreshAll()
  });
  game.settings.register(game.system.id, BAR_SETTING, {
    name:'Mapa — exibição das barras (Bar Brawl)',
    hint:'Aplica-se a todos os tokens do mundo. Preserva quem pode ver cada barra e condições como esconder cheia, vazia ou em combate. Não altera as configurações dos tokens. Nos modos com mouse, Alt sozinho não exibe todas as barras. Requer Bar Brawl ativo.',
    scope:'world', config:true, restricted:true, type:String, default:'individual',
    choices:{individual:'Respeitar configuração de cada token',hover:'Mostrar somente ao passar o mouse',hoverControl:'Mostrar ao passar o mouse ou selecionar'},
    onChange:()=>integration?.refreshAll()
  });
}
if (globalThis.Hooks) {
  Hooks.once('init',()=>registerBarVisibility(game));
  Hooks.once('ready',()=>{
    integration = installBarVisibility({game,canvas,Hooks});
    game.tagmar.barVisibility = integration;
  });
}
