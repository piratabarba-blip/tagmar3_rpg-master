/** Optional, runtime-only compatibility with the unmodified Theatre Inserts 3.4.2.
 * No module files, actor flags, global asset loaders or world documents are changed.
 */
import {isVideoPortrait, loadPortraitTexture, getCachedPortraitTexture,
  setPortraitThumbnail, updatePortraitVideos} from './theatre-media.js';

const FALLBACK = 'icons/svg/mystery-man.svg';
const installations = new WeakMap();
const frameStates = new WeakMap();
const observers = new WeakMap();
let warnedVersion = false;

function repairThumbnails(theatre) {
  const fix = (image, id) => {
    if (!image || !isVideoPortrait(image.getAttribute('src'))) return;
    const actor = game.actors.get(String(id ?? '').replace(/^theatre-/, ''));
    setPortraitThumbnail(image, actor, image.getAttribute('src'), FALLBACK);
  };
  for (const image of theatre.theatreNavBar?.querySelectorAll('img[imgId]') ?? []) {
    fix(image, image.getAttribute('imgId'));
  }
  fix(theatre.theatreChatCover?.querySelector('img'), theatre.speakingAs);
}

function observeThumbnails(theatre) {
  if (!theatre) return;
  const previous = observers.get(theatre);
  if (previous?.nav === theatre.theatreNavBar && previous?.cover === theatre.theatreChatCover) {
    repairThumbnails(theatre);
    return;
  }
  previous?.observer.disconnect();
  const observer = new MutationObserver(() => repairThumbnails(theatre));
  for (const root of [theatre.theatreNavBar, theatre.theatreChatCover]) {
    if (root) observer.observe(root, {childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  }
  observers.set(theatre, {observer,nav:theatre.theatreNavBar,cover:theatre.theatreChatCover});
  repairThumbnails(theatre);
}

// Delegate images/GIFs to Theatre. Video textures belong only to this adapter,
// so pausing a portrait never pauses a token which uses the same file.
async function loadSprites(wrapped, sources) {
  if (!sources.some(source => isVideoPortrait(source.imgpath))) return wrapped(sources);
  const stills = sources.filter(source => !isVideoPortrait(source.imgpath));
  const resources = stills.length ? await wrapped(stills) : {};
  await Promise.all(sources.filter(source => isVideoPortrait(source.imgpath)).map(async source => {
    resources[source.resname] = resources[source.imgpath] = await loadPortraitTexture(source.imgpath);
  }));
  return resources;
}

async function setupPortrait(wrapped, id, align, src, resources, ...rest) {
  if (isVideoPortrait(src)) {
    // Theatre's configuration dialog can supply a proxy to the global Assets
    // cache instead of the resources returned by _addSpritesToPixi.
    const texture = getCachedPortraitTexture(src) || await loadPortraitTexture(src);
    resources = new Proxy(resources ?? {}, {get: (target, key) => key === src ? texture : Reflect.get(target, key)});
  }
  return wrapped(id, align, src, resources, ...rest);
}

function renderPortraits(wrapped, time) {
  let state = frameStates.get(this);
  if (!state) frameStates.set(this, state = {frame:null});
  if (state.frame !== null) cancelAnimationFrame(state.frame);
  state.frame = null;
  const hasVideo = updatePortraitVideos(this);
  if (!hasVideo) return wrapped(time);
  // The original loop sleeps after the last tween, even with a video on stage.
  // Own just the video case; normal image-only rendering stays with Theatre.
  this.rendering = true;
  this.pixiCTX.ticker.update(time);
  this.pixiToolTipCTX?.ticker.update(time);
  for (const insert of this.portraitDocks) {
    if (insert.dockContainer) this.pixiCTX.renderer.render(insert.dockContainer, {clear:false});
  }
  state.frame = requestAnimationFrame(timestamp => {
    state.frame = null;
    this._renderTheatre(timestamp);
  });
}

async function activatePortrait(wrapped, id, ...args) {
  const insert = this.getInsertById(id);
  if (insert && (!insert.label || !insert.portrait)) return;
  try { return await wrapped(id, ...args); }
  finally { observeThumbnails(this); }
}

export function installTheatreCompatibility() {
  const module = globalThis.game?.modules?.get('theatre');
  if (!module?.active) return false;
  // Fail closed after upstream changes until that version has been tested.
  if (String(module.version).replace(/^v/, '') !== '3.4.2' || !/^7\./.test(globalThis.PIXI?.VERSION ?? '')) {
    if (!warnedVersion) {
      warnedVersion = true;
      console.warn('Tagmar: compatibilidade WebM do Theatre não aplicada nesta versão; funcionamento original preservado.', module.version);
    }
    return false;
  }
  const Theatre = globalThis.Theatre;
  const library = globalThis.libWrapper;
  if (!Theatre?.instance || !library?.register) return false;
  if (installations.has(Theatre)) {
    observeThumbnails(Theatre.instance);
    return true;
  }
  const definitions = [
    ['Theatre.prototype._addSpritesToPixi', loadSprites, 'MIXED'],
    ['Theatre.prototype._setupPortraitContainer', setupPortrait, 'WRAPPER'],
    ['Theatre.prototype._renderTheatre', renderPortraits, 'MIXED'],
    ['Theatre.prototype.activateInsertById', activatePortrait, 'MIXED'],
    ['Theatre.addToNavBar', function(wrapped, ...args) {
      const result = wrapped(...args);
      observeThumbnails(Theatre.instance);
      return result;
    }, 'WRAPPER']
  ];
  if (definitions.some(([target]) => {
    const name = target.split('.').at(-1);
    return typeof (target.includes('.prototype.') ? Theatre.prototype[name] : Theatre[name]) !== 'function';
  })) return false;
  const registered = [];
  try {
    for (const [target, callback, type] of definitions) {
      library.register(game.system.id, target, callback, type);
      registered.push(target);
    }
    observeThumbnails(Theatre.instance);
    installations.set(Theatre, registered);
    console.info('Tagmar: compatibilidade WebM ativada no Theatre original (3.4.2).');
    return true;
  } catch (error) {
    for (const target of registered.reverse()) library.unregister(game.system.id, target);
    console.error('Tagmar: não foi possível ativar a compatibilidade do Theatre.', error);
    return false;
  }
}

// Theatre exposes its class only after renderChatLog. Defer to the end of the
// hook so this works regardless of module/system registration order.
Hooks.on('renderChatLog', () => queueMicrotask(installTheatreCompatibility));
Hooks.once('ready', () => queueMicrotask(installTheatreCompatibility));
