import { gameRouteParam } from './core.mjs';

const observedMaps = new WeakSet();
const FALLBACK_STYLE_ID = 'cgb-map-fallback-style';
const FALLBACK_HEADING = 'Map temporarily unavailable';
const FALLBACK_COPY = 'Please use the location list while we work to get it back up and running.';
const LOADING_FADE_MS = 240;

function element(documentObject, selector) {
  return documentObject?.querySelector?.(selector) || null;
}

function ensureFallbackStyles(documentObject) {
  if (!documentObject?.createElement || !documentObject?.head) return;
  if (documentObject.getElementById?.(FALLBACK_STYLE_ID)) return;

  const style = documentObject.createElement('style');
  style.id = FALLBACK_STYLE_ID;
  style.textContent = `
    .map--fallback,
    .map--loading {
      background: #06152f;
    }

    .map-fallback {
      position: absolute;
      inset: 0;
      z-index: 50;
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

    .map-fallback--loading {
      opacity: 1;
      transition: opacity ${LOADING_FADE_MS}ms ease;
    }

    .map-fallback--loading.map-fallback--leaving {
      opacity: 0;
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

    .map-fallback--loading .map-fallback__card {
      max-height: 100%;
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

    @media (prefers-reduced-motion: reduce) {
      .map-fallback--loading,
      .map-fallback__card {
        transition: none;
      }
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

function setFallbackMode(fallback, mode) {
  fallback?.classList?.remove?.('map-fallback--loading', 'map-fallback--failure', 'map-fallback--leaving');
  if (mode) fallback?.classList?.add?.(`map-fallback--${mode}`);
}

function createFailureMessage(documentObject) {
  const message = documentObject.createElement('div');
  message.className = 'map-fallback__message';

  const heading = documentObject.createElement('strong');
  heading.textContent = FALLBACK_HEADING;

  const copy = documentObject.createElement('span');
  copy.textContent = FALLBACK_COPY;

  message.append(heading, copy);
  return message;
}

function ensureFallbackContent({ fallback, state, documentObject, includeMessage }) {
  if (!fallback || !documentObject?.createElement) return;
  ensureFallbackStyles(documentObject);

  let image = fallback.querySelector?.('#map-fallback-card') || null;
  if (!image) {
    image = documentObject.createElement('img');
    image.id = 'map-fallback-card';
    image.className = 'map-fallback__card';
    image.alt = '';
    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.width = 1200;
    image.height = 630;
    fallback.replaceChildren(image);
  }

  let message = fallback.querySelector?.('.map-fallback__message') || null;
  if (includeMessage && !message) {
    message = createFailureMessage(documentObject);
    fallback.append(message);
  } else if (!includeMessage && message) {
    if (typeof message.remove === 'function') message.remove();
    else fallback.replaceChildren(image);
  }

  const game = selectedGame(state);
  const slug = gameRouteParam(game);
  if (!slug) {
    if (image.complete && image.naturalWidth > 0) markCardLoaded(image, true);
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

function afterLoadingCardSettles(fallback, callback) {
  const image = fallback?.querySelector?.('#map-fallback-card') || null;
  if (!image || image.complete) {
    callback();
    return;
  }

  const previousLoad = image.onload;
  const previousError = image.onerror;
  let settled = false;
  const settle = (previous, event) => {
    if (typeof previous === 'function') previous.call(image, event);
    if (settled) return;
    settled = true;
    callback();
  };

  image.onload = (event) => settle(previousLoad, event);
  image.onerror = (event) => settle(previousError, event);
}

export function showMapLoading({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document
} = {}) {
  const mapContainer = element(documentObject, '#map');
  const fallback = element(documentObject, '#map-fallback');
  if (!mapContainer || !fallback) return false;

  const state = app?.getState?.();
  ensureFallbackContent({ fallback, state, documentObject, includeMessage: false });
  setFallbackMode(fallback, 'loading');
  fallback.hidden = false;
  mapContainer.classList?.remove?.('map--fallback');
  mapContainer.classList?.add?.('map--loading');
  return true;
}

export function hideMapLoading({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  const mapContainer = element(documentObject, '#map');
  const fallback = element(documentObject, '#map-fallback');
  if (!mapContainer || !fallback?.classList?.contains?.('map-fallback--loading')) return false;

  mapContainer.classList?.remove?.('map--loading');

  const finish = () => {
    if (fallback.classList?.contains?.('map-fallback--failure')) return;
    fallback.hidden = true;
    setFallbackMode(fallback, null);
  };

  const reveal = () => {
    if (windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      finish();
      return;
    }
    fallback.classList?.add?.('map-fallback--leaving');
    windowObject?.setTimeout?.(finish, LOADING_FADE_MS);
  };

  afterLoadingCardSettles(fallback, reveal);
  return true;
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

  ensureFallbackContent({ fallback, state, documentObject, includeMessage: true });
  setFallbackMode(fallback, 'failure');
  fallback.hidden = false;
  mapContainer.classList?.remove?.('map--loading');
  mapContainer.classList?.add?.('map--fallback');
  return true;
}

export function attachMapFailureFallback({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  consoleObject = globalThis.console,
  windowObject = globalThis.window
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
  if (loaded) hideMapLoading({ documentObject, windowObject });
  else showMapLoading({ app, documentObject });

  map.on('load', () => {
    loaded = true;
    hideMapLoading({ documentObject, windowObject });
  });
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
  consoleObject = globalThis.console,
  windowObject = globalThis.window
} = {}) {
  if (!app?.subscribe) return false;
  const attach = () => attachMapFailureFallback({ app, documentObject, consoleObject, windowObject });
  app.subscribe('rendered', attach);
  app.subscribe('ready', attach);
  attach();
  return true;
}

if (globalThis.window?.CGBApp) initializeMapFailureFallback();
