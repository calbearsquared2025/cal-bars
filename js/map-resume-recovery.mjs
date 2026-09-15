const MAX_LAYOUT_RECOVERY_FRAMES = 8;
let resumeRecoveryQueued = false;

function element(documentObject, selector) {
  return documentObject?.querySelector?.(selector) || null;
}

function visibleMapSurface(documentObject) {
  const body = documentObject?.body;
  const mapView = element(documentObject, '#map-view');
  return body?.dataset?.view === 'map' && mapView?.hidden !== true;
}

function mapHasLayout(mapContainer) {
  if (!mapContainer) return false;
  const rect = mapContainer.getBoundingClientRect?.() || {};
  return [rect.width, rect.height, mapContainer.clientWidth, mapContainer.clientHeight]
    .every((dimension) => Number.isFinite(Number(dimension)) && Number(dimension) > 0);
}

function clearStaleMapFallback(documentObject) {
  const mapContainer = element(documentObject, '#map');
  const fallback = element(documentObject, '#map-fallback');
  if (!mapContainer || !fallback) return false;

  mapContainer.classList?.remove?.('map--fallback', 'map--loading');
  fallback.classList?.remove?.(
    'map-fallback--failure',
    'map-fallback--loading',
    'map-fallback--leaving',
    'map-fallback--local'
  );
  fallback.hidden = true;
  return true;
}

function refreshExistingMap(map, documentObject) {
  map?.resize?.();
  map?.triggerRepaint?.();
  if (map?.loaded?.()) clearStaleMapFallback(documentObject);
  return true;
}

export function recoverMapAfterResume({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  windowObject = globalThis.window,
  attempt = 0
} = {}) {
  const state = app?.getState?.();
  if (!state?.snapshot || !state.publicDataUsable || !visibleMapSurface(documentObject)) return false;

  if (state.map) return refreshExistingMap(state.map, documentObject);

  const mapContainer = element(documentObject, '#map');
  const fallback = element(documentObject, '#map-fallback');
  const fallbackActive = mapContainer?.classList?.contains?.('map--fallback') ||
    fallback?.classList?.contains?.('map-fallback--failure');
  if (!mapContainer || !fallback || !fallbackActive) return false;

  if (!windowObject?.maptilersdk?.Map) return false;

  if (!mapHasLayout(mapContainer)) {
    if (attempt >= MAX_LAYOUT_RECOVERY_FRAMES || typeof windowObject?.requestAnimationFrame !== 'function') {
      return false;
    }
    windowObject.requestAnimationFrame(() => recoverMapAfterResume({
      app,
      documentObject,
      windowObject,
      attempt: attempt + 1
    }));
    return true;
  }

  clearStaleMapFallback(documentObject);
  app?.render?.();

  const recoveredMap = app?.getState?.()?.map;
  if (!recoveredMap) return false;
  recoveredMap.resize?.();
  recoveredMap.triggerRepaint?.();
  return true;
}

export function scheduleMapResumeRecovery({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (resumeRecoveryQueued) return false;
  resumeRecoveryQueued = true;

  const run = () => {
    resumeRecoveryQueued = false;
    recoverMapAfterResume({ app, documentObject, windowObject });
  };

  if (typeof windowObject?.requestAnimationFrame !== 'function') {
    run();
    return true;
  }

  windowObject.requestAnimationFrame(() => windowObject.requestAnimationFrame(run));
  return true;
}

export function initializeMapResumeRecovery({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!app?.getState || !windowObject?.addEventListener || !documentObject?.addEventListener) return false;

  const schedule = () => scheduleMapResumeRecovery({ app, documentObject, windowObject });
  windowObject.addEventListener('pageshow', schedule);
  documentObject.addEventListener('visibilitychange', () => {
    if (documentObject.visibilityState === 'visible') schedule();
  });
  return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeMapResumeRecovery();
}
