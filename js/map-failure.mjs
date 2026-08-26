import { gameRouteParam } from './core.mjs';

const observedMaps = new WeakSet();
const FALLBACK_STYLE_ID = 'cgb-map-fallback-style';
const FALLBACK_HEADING = 'Map temporarily unavailable';
const FALLBACK_COPY = 'Please use the location list while we work to get it back up and running.';

function element(documentObject, selector) {
  return documentObject?.querySelector?.(selector) || null;
}

function ensureFallbackStyles(documentObject) {
  if (!documentObject?.createElement || !documentObject?.head) return;
  if (documentObject.getElementById?.(FALLBACK_STYLE_ID)) return;

  const style = documentObject.createElement('style');
  style.id = FALLBACK_STYLE_ID;
  style.textContent = `
    .map--fallback {
      background: #06152f;
    }

    .map-fallback {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: clamp(18px, 3vh, 30px);
      padding: clamp(18px, 4vw, 48px);
      overflow: hidden;
      background: #06152f;
      color: #ffffff;
      text-align: center;
    }

    .map-fallback__card {
      display: block;
      width: min(92%, 960px);
      height: auto;
      max-height: calc(100% - 128px);
      aspect-ratio: 1200 / 630;
      object-fit: contain;
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .map-fallback__card--loaded {
      opacity: 1;
    }

    .map-fallback__message {
      display: grid;
      gap: 6px;
      max-width: 640px;
    }

    .map-fallback__message strong {
      color: var(--cal-gold, #fdb515);
      font-size: clamp(1rem, 2vw, 1.35rem);
    }

    .map-fallback__message span {
      color: #ffffff;
      font-size: clamp(.85rem, 1.5vw, 1rem);
      line-height: 1.4;
    }
  `;
  documentObject.head.append(style);
}

function selectedGame(state) {
  return state?.snapshot?.games?.find?.((game) => game.game_id === state.gameId) || null;
}

function markCardLoaded(image, loaded) {
  image.className = loaded
    ? 'map-fallback__card map-fallback__card--loaded'
    : 'map-fallback__card';
}

function ensureFallbackContent({ fallback, state, documentObject }) {
  if (!fallback || !documentObject?.createElement) return;
  ensureFallbackStyles(documentObject);

  let image = fallback.querySelector?.('#map-fallback-card') || null;
  let message = fallback.querySelector?.('.map-fallback__message') || null;

  if (!image || !message) {
    image = documentObject.createElement('img');
    image.id = 'map-fallback-card';
    image.className = 'map-fallback__card';
    image.alt = '';
    image.decoding = 'async';
    image.width = 1200;
    image.height = 630;

    message = documentObject.createElement('div');
    message.className = 'map-fallback__message';

    const heading = documentObject.createElement('strong');
    heading.textContent = FALLBACK_HEADING;

    const copy = documentObject.createElement('span');
    copy.textContent = FALLBACK_COPY;

    message.append(heading, copy);
    fallback.replaceChildren(image, message);
  }

  const game = selectedGame(state);
  const slug = gameRouteParam(game);
  if (!slug) {
    markCardLoaded(image, false);
    image.removeAttribute?.('src');
    return;
  }

  const source = new URL(`../assets/social-cards/${slug}.png`, import.meta.url).href;
  image.onload = () => { markCardLoaded(image, true); };
  image.onerror = () => { markCardLoaded(image, false); };

  if (image.src !== source) {
    markCardLoaded(image, false);
    image.src = source;
  } else if (image.complete && image.naturalWidth > 0) {
    markCardLoaded(image, true);
  }
}

export function showMapUnavailable({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  consoleObject = globalThis.console,
  error = null
} = {}) {
  const mapContainer = element(documentObject, '#map');
  const fallback = element(documentObject, '#map-fallback');
  if (!mapContainer || !fallback) return false;

  if (error) consoleObject?.warn?.('Map unavailable; using list and search.', error);

  const state = app?.getState?.();
  const activeMap = state?.map || null;
  try { activeMap?.remove?.(); } catch (_) {}

  state?.markers?.forEach?.((marker) => marker?.remove?.());
  state?.markers?.clear?.();
  state?.userMarker?.remove?.();
  if (state) {
    state.map = null;
    state.userMarker = null;
  }

  ensureFallbackContent({ fallback, state, documentObject });
  fallback.hidden = false;
  mapContainer.classList?.add?.('map--fallback');
  return true;
}

export function attachMapFailureFallback({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  consoleObject = globalThis.console
} = {}) {
  const state = app?.getState?.();
  const map = state?.map;

  if (!map) {
    const container = element(documentObject, '#map');
    if (container?.classList?.contains?.('map--fallback')) {
      showMapUnavailable({ app, documentObject, consoleObject });
    }
    return false;
  }

  if (observedMaps.has(map) || typeof map.on !== 'function') return false;
  observedMaps.add(map);

  let loaded = Boolean(map.loaded?.());
  map.on('load', () => { loaded = true; });
  map.on('error', (event) => {
    const error = event?.error || event;
    if (loaded) {
      consoleObject?.warn?.('Map error', error);
      return;
    }
    showMapUnavailable({ app, documentObject, consoleObject, error });
  });
  return true;
}

export function initializeMapFailureFallback({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  consoleObject = globalThis.console
} = {}) {
  if (!app?.subscribe) return false;
  const attach = () => attachMapFailureFallback({ app, documentObject, consoleObject });
  app.subscribe('rendered', attach);
  app.subscribe('ready', attach);
  attach();
  return true;
}

if (globalThis.window?.CGBApp) initializeMapFailureFallback();
