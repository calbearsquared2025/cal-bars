import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';

const observedMaps = new WeakSet();
const FALLBACK_STYLE_ID = 'cgb-map-fallback-style';
const FALLBACK_HEADING = 'Map temporarily unavailable';
const FALLBACK_COPY = 'Please use the location list while we work to get it back up and running.';
const LOADING_FADE_MS = 240;
const MAP_SDK_SCRIPT_SELECTOR = '#cgb-maptiler-sdk';
let loadingCoverHiddenMarked = false;
let publicUsableMarked = false;
const FALLBACK_MODE_CLASSES = Object.freeze([
  'map-fallback--loading',
  'map-fallback--failure',
  'map-fallback--leaving'
]);

function markPublicUsable(windowObject = globalThis.window) {
  if (publicUsableMarked || !windowObject) return;
  publicUsableMarked = true;
  markCgbPerformance('cgb:public:usable');
  windowObject.CGBPublicLaunchUsable = true;
  windowObject.dispatchEvent?.(new CustomEvent('cgb:public-usable'));
}

function markCoverBoundary(windowObject = globalThis.window) {
  if (!loadingCoverHiddenMarked) {
    loadingCoverHiddenMarked = markCgbPerformance('cgb:cover:hidden');
    measureCgbPerformance('cgb:boot-to-cover-hidden', 'cgb:boot:start', 'cgb:cover:hidden');
  }
  markPublicUsable(windowObject);
}

function element(documentObject, selector) {
  return documentObject?.querySelector?.(selector) || null;
}

function mapSdkScript(documentObject) {
  return element(documentObject, MAP_SDK_SCRIPT_SELECTOR);
}

function mapSdkPending(documentObject, windowObject) {
  if (windowObject?.maptilersdk?.Map) return false;
  const script = mapSdkScript(documentObject);
  if (!script) return false;
  return script.dataset?.cgbState !== 'failed';
}

function loadingCoverSource(documentObject) {
  const preload = element(documentObject, '#cgb-loading-cover-preload');
  return preload?.href || preload?.getAttribute?.('href') || '';
}

function localizeFallback(fallback) {
  if (!fallback?.style) return;
  fallback.style.zIndex = '1';
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

    .map-view:has(#map-fallback:not([hidden])) > .map-actions {
      z-index: 49 !important;
    }

    .map-fallback {
      position: absolute;
      inset: 0;
      z-index: 1;
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

function markCardLoaded(image, loaded) {
  image.className = loaded
    ? 'map-fallback__card map-fallback__card--loaded'
    : 'map-fallback__card';
}

function setFallbackMode(fallback, mode) {
  if (!fallback?.classList) return false;
  const nextClass = mode ? `map-fallback--${mode}` : '';
  const alreadyStable = nextClass &&
    fallback.classList.contains(nextClass) &&
    FALLBACK_MODE_CLASSES.every((className) =>
      className === nextClass || !fallback.classList.contains(className));
  const alreadyClear = !nextClass &&
    FALLBACK_MODE_CLASSES.every((className) => !fallback.classList.contains(className));
  if (alreadyStable || alreadyClear) return false;

  fallback.classList.remove?.(...FALLBACK_MODE_CLASSES);
  if (nextClass) fallback.classList.add?.(nextClass);
  return true;
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

function ensureFallbackContent({ fallback, documentObject, includeMessage }) {
  if (!fallback || !documentObject?.createElement) return;
  ensureFallbackStyles(documentObject);

  let image = fallback.querySelector?.('#map-fallback-card') || null;
  if (!image) {
    image = documentObject.createElement('img');
    image.id = 'map-fallback-card';
    image.className = 'map-fallback__card';
    image.alt = '';
    const source = loadingCoverSource(documentObject);
    if (source) image.src = source;
    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.width = 1200;
    image.height = 630;
    fallback.replaceChildren(image);
  }

  if (!image.className) image.className = 'map-fallback__card';

  let message = fallback.querySelector?.('.map-fallback__message') || null;
  if (includeMessage && !message) {
    message = createFailureMessage(documentObject);
    fallback.append(message);
  } else if (!includeMessage && message) {
    if (typeof message.remove === 'function') message.remove();
    else fallback.replaceChildren(image);
  }

  image.onload = () => { markCardLoaded(image, true); };
  image.onerror = () => { markCardLoaded(image, false); };
  if (image.complete && image.naturalWidth > 0) {
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
  ensureFallbackContent({ fallback, documentObject, includeMessage: false });
  setFallbackMode(fallback, 'loading');
  if (fallback.hidden) fallback.hidden = false;
  mapContainer.classList?.remove?.('map--fallback');
  mapContainer.classList?.add?.('map--loading');
  if (state?.publicDataUsable) {
    fallback.classList?.add?.('map-fallback--local');
    localizeFallback(fallback);
  } else {
    fallback.classList?.remove?.('map-fallback--local');
  }
  return true;
}

export function localizeMapLoading({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  const state = app?.getState?.();
  const fallback = element(documentObject, '#map-fallback');
  if (!state?.publicDataUsable || !fallback ||
      !fallback.classList?.contains?.('map-fallback--loading')) return false;
  fallback.classList.add?.('map-fallback--local');
  localizeFallback(fallback);
  markCoverBoundary(windowObject);
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
    fallback.classList?.remove?.('map-fallback--local');
    setFallbackMode(fallback, null);
    markCoverBoundary(windowObject);
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
  windowObject = globalThis.window,
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

  ensureFallbackContent({ fallback, documentObject, includeMessage: true });
  setFallbackMode(fallback, 'failure');
  fallback.classList?.remove?.('map-fallback--local');
  fallback.hidden = false;
  mapContainer.classList?.remove?.('map--loading');
  mapContainer.classList?.add?.('map--fallback');
  markPublicUsable(windowObject);
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
      if (mapSdkPending(documentObject, windowObject)) {
        showMapLoading({ app, documentObject });
        localizeMapLoading({ app, documentObject, windowObject });
        return false;
      }
      showMapUnavailable({ app, documentObject, consoleObject, windowObject });
    }
    return false;
  }

  if (observedMaps.has(map) || typeof map.on !== 'function') return false;
  observedMaps.add(map);

  let loaded = Boolean(map.loaded?.());
  if (loaded) hideMapLoading({ documentObject, windowObject });
  else {
    showMapLoading({ app, documentObject });
    localizeMapLoading({ app, documentObject, windowObject });
  }

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
    showMapUnavailable({ app, documentObject, consoleObject, windowObject, error });
  });
  return true;
}

function observeMapSdk({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  consoleObject = globalThis.console,
  windowObject = globalThis.window
} = {}) {
  const script = mapSdkScript(documentObject);
  if (!script || script.dataset?.cgbObserved === 'true') return false;
  script.dataset.cgbObserved = 'true';

  const retry = () => {
    script.dataset.cgbState = 'ready';
    const container = element(documentObject, '#map');
    container?.classList?.remove?.('map--fallback');
    app?.render?.();
    attachMapFailureFallback({ app, documentObject, consoleObject, windowObject });
    localizeMapLoading({ app, documentObject, windowObject });
  };

  const fail = (event) => {
    script.dataset.cgbState = 'failed';
    showMapUnavailable({
      app,
      documentObject,
      consoleObject,
      windowObject,
      error: event?.error || new Error('MapTiler SDK failed to load')
    });
  };

  if (windowObject?.maptilersdk?.Map) {
    retry();
    return true;
  }

  script.addEventListener?.('load', retry, { once: true });
  script.addEventListener?.('error', fail, { once: true });
  return true;
}

export function initializeMapFailureFallback({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  consoleObject = globalThis.console,
  windowObject = globalThis.window
} = {}) {
  if (!app?.subscribe) return false;
  observeMapSdk({ app, documentObject, consoleObject, windowObject });
  const attach = () => {
    const attached = attachMapFailureFallback({ app, documentObject, consoleObject, windowObject });
    localizeMapLoading({ app, documentObject, windowObject });
    return attached;
  };
  app.subscribe('rendered', attach);
  app.subscribe('ready', attach);
  attach();
  return true;
}

if (globalThis.window?.CGBApp) initializeMapFailureFallback();


if (typeof window !== 'undefined') {
  window.CGBMapFailure = Object.freeze({
    localize: () => localizeMapLoading()
  });
}
