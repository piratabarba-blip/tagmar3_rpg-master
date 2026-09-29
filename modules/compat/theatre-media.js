// Tagmar-owned video textures for the optional Theatre adapter. No actor data is changed.
const videoLoads = new Map();
const loadedVideos = new Map();
const videoTextures = new WeakMap();
const playingByTheatre = new WeakMap();

export function isVideoPortrait(src) {
  return typeof src === "string" && /\.(webm|mp4|m4v|ogv)(?:[?#]|$)/i.test(src);
}

export function getCachedPortraitTexture(src) {
  return loadedVideos.get(src);
}

export function setPortraitThumbnail(element, actor, portrait, fallback) {
  if (!element) return;
  const still = actor?.img && !isVideoPortrait(actor.img) ? actor.img : fallback;
  const source = isVideoPortrait(portrait) ? still : (portrait || still);
  // An old/missing image path must not leave a broken icon or an error loop.
  element.onerror = () => {
    element.onerror = null;
    if (element.getAttribute("src") !== fallback) element.src = fallback;
  };
  element.src = source;
}

export async function loadPortraitTexture(src) {
  if (!isVideoPortrait(src)) return PIXI.Assets.load(src);
  if (videoLoads.has(src)) return videoLoads.get(src);
  const load = (async () => {
    // Own this video instead of changing an Assets texture shared with tokens.
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener("loadeddata", ready);
        video.removeEventListener("error", failed);
      };
      const ready = () => { cleanup(); resolve(); };
      const failed = () => {
        cleanup();
        video.pause();
        video.removeAttribute("src");
        video.load();
        reject(new Error(`Theatre: não foi possível carregar o vídeo ${src}`));
      };
      const timeout = setTimeout(failed, 20000);
      video.addEventListener("loadeddata", ready);
      video.addEventListener("error", failed);
      video.src = src;
      video.load();
    });
    const texture = PIXI.Texture.from(video, {resourceOptions: {autoPlay: false, autoUpdate: false}});
    const resource = texture.baseTexture.resource;
    resource.autoUpdate = false;
    videoTextures.set(texture, {video, resource});
    loadedVideos.set(src, texture);
    return texture;
  })();
  videoLoads.set(src, load);
  try { return await load; }
  catch (error) { videoLoads.delete(src); throw error; }
}

export function updatePortraitVideos(theatre) {
  const previous = playingByTheatre.get(theatre) || new Set();
  const current = new Set();
  for (const insert of theatre.portraitDocks) {
    const media = videoTextures.get(insert.portrait?.texture);
    if (!media || !insert.dockContainer) continue;
    current.add(media);
    if (!previous.has(media) && !media.starting) {
      media.starting = true;
      media.video.play().catch(error => {
        if (error.name !== "AbortError") console.warn("Tagmar/Theatre: reprodução do retrato bloqueada; retire e adicione ao palco para tentar novamente.", error);
      }).finally(() => { media.starting = false; });
    }
    if (media.video.readyState >= 2 && media.lastTime !== media.video.currentTime) {
      media.resource.update();
      media.lastTime = media.video.currentTime;
    }
  }
  for (const media of previous) {
    if (!current.has(media)) media.video.pause();
  }
  playingByTheatre.set(theatre, current);
  return current.size > 0;
}
