const observedMaps = new WeakSet();

function element(documentObject, selector) {
  return documentObject?.querySelector?.(selector) || null;
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

  fallback.hidden = false;
  mapContainer.classList?.add?.('map--fallback');

  if (!state?.selectedVenueId) element(documentObject, '#browse-locations-button')?.click?.();
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
