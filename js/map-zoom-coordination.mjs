const ZOOM_CONTROL_DURATION_MS = 220;
const ZOOM_VISIBILITY_SETTLE_MS = 180;
const ZOOM_MATCH_EPSILON = 0.05;
const INITIAL_SELECTED_ZOOM = 11;
const APP_CONNECT_MAX_ATTEMPTS = 1200;

let pendingTargetMap = null;
let pendingTargetZoom = null;
let pendingTargetResetTimer = 0;
let suppressedMap = null;
let originalEaseTo = null;
let patchedEaseTo = null;
let suppressionVenueId = '';
let suppressionExpiresAt = 0;
let suppressionRestoreTimer = 0;
let appConnected = false;
let appConnectAttempts = 0;
const initialSelectedCameraMaps = new WeakSet();

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function selectedVenue(state = appState()) {
  if (!state?.selectedVenueId || !state?.snapshot?.venues) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function selectedVenueCoordinates(state = appState()) {
  const venue = selectedVenue(state);
  const longitude = Number(venue?.longitude);
  const latitude = Number(venue?.latitude);
  if (![longitude, latitude].every(Number.isFinite)) return null;
  return [longitude, latitude];
}

function applyInitialSelectedCamera() {
  const state = appState();
  const map = state?.map;
  if (!map || initialSelectedCameraMaps.has(map) || !state.selectedVenueId) return false;

  // This jump exists only to seed a direct-selected route before the map's first
  // visible load. Once the map is already interactive, the normal selection
  // camera owns the move; jumping here would create a second visible motion.
  if (typeof map.loaded === 'function' && map.loaded()) {
    initialSelectedCameraMaps.add(map);
    return false;
  }

  const center = selectedVenueCoordinates(state);
  if (!center || typeof map.jumpTo !== 'function') return false;

  const currentZoom = Number(map.getZoom?.());
  map.jumpTo({
    center,
    zoom: Math.max(Number.isFinite(currentZoom) ? currentZoom : 0, INITIAL_SELECTED_ZOOM)
  });
  initialSelectedCameraMaps.add(map);
  return true;
}

function centerCoordinates(center) {
  if (Array.isArray(center)) return [Number(center[0]), Number(center[1])];
  return [Number(center?.lng), Number(center?.lat)];
}

function clampZoom(map, zoom) {
  const minZoom = Number(map?.getMinZoom?.());
  const maxZoom = Number(map?.getMaxZoom?.());
  const minimum = Number.isFinite(minZoom) ? minZoom : 0;
  const maximum = Number.isFinite(maxZoom) ? maxZoom : 24;
  return Math.min(maximum, Math.max(minimum, zoom));
}

function restoreEaseToPatch() {
  window.clearTimeout(suppressionRestoreTimer);
  suppressionRestoreTimer = 0;
  if (suppressedMap && patchedEaseTo && suppressedMap.easeTo === patchedEaseTo && originalEaseTo) {
    suppressedMap.easeTo = originalEaseTo;
  }
  suppressedMap = null;
  originalEaseTo = null;
  patchedEaseTo = null;
  suppressionVenueId = '';
  suppressionExpiresAt = 0;
}

function isRedundantSelectedVisibilityPan(map, options = {}) {
  const state = appState();
  if (!suppressionVenueId || state?.selectedVenueId !== suppressionVenueId) return false;
  if (options.offset != null || options.around != null || options.padding != null) return false;

  const [lng, lat] = centerCoordinates(options.center);
  const requestedZoom = Number(options.zoom);
  const currentZoom = Number(map?.getZoom?.());
  if (![lng, lat, requestedZoom, currentZoom].every(Number.isFinite)) return false;
  if (Math.abs(requestedZoom - currentZoom) > ZOOM_MATCH_EPSILON) return false;

  const center = map?.getCenter?.();
  const currentLng = Number(center?.lng);
  const currentLat = Number(center?.lat);
  if (![currentLng, currentLat].every(Number.isFinite)) return false;

  return Math.abs(lng - currentLng) > 1e-8 || Math.abs(lat - currentLat) > 1e-8;
}

function suppressRedundantVisibilityPan(map, venueId, durationMs) {
  if (!map || !venueId || typeof map.easeTo !== 'function') return;

  if (suppressedMap && suppressedMap !== map) restoreEaseToPatch();

  suppressionVenueId = venueId;
  suppressionExpiresAt = Date.now() + durationMs + ZOOM_VISIBILITY_SETTLE_MS;

  if (suppressedMap === map && patchedEaseTo && map.easeTo === patchedEaseTo) {
    window.clearTimeout(suppressionRestoreTimer);
    suppressionRestoreTimer = window.setTimeout(restoreEaseToPatch, durationMs + ZOOM_VISIBILITY_SETTLE_MS + 20);
    return;
  }

  suppressedMap = map;
  originalEaseTo = map.easeTo;
  patchedEaseTo = function coordinatedEaseTo(options = {}, ...args) {
    if (Date.now() <= suppressionExpiresAt && isRedundantSelectedVisibilityPan(this, options)) return this;
    return originalEaseTo.call(this, options, ...args);
  };
  map.easeTo = patchedEaseTo;
  suppressionRestoreTimer = window.setTimeout(restoreEaseToPatch, durationMs + ZOOM_VISIBILITY_SETTLE_MS + 20);
}

function baseEaseTo(map) {
  if (map === suppressedMap && originalEaseTo) return originalEaseTo;
  return map?.easeTo;
}

function resetPendingZoomTarget(delayMs) {
  window.clearTimeout(pendingTargetResetTimer);
  pendingTargetResetTimer = window.setTimeout(() => {
    pendingTargetMap = null;
    pendingTargetZoom = null;
    pendingTargetResetTimer = 0;
  }, delayMs);
}

function coordinatedZoom(map, state, delta) {
  const currentZoom = Number(map?.getZoom?.());
  if (!Number.isFinite(currentZoom) || typeof map?.easeTo !== 'function') return false;

  const duration = reducedMotion() ? 0 : ZOOM_CONTROL_DURATION_MS;
  const baseZoom = pendingTargetMap === map && Number.isFinite(pendingTargetZoom)
    ? pendingTargetZoom
    : currentZoom;
  const targetZoom = clampZoom(map, baseZoom + delta);
  if (Math.abs(targetZoom - baseZoom) < 1e-8) return false;

  pendingTargetMap = map;
  pendingTargetZoom = targetZoom;
  resetPendingZoomTarget(duration + ZOOM_VISIBILITY_SETTLE_MS + 40);

  const venueId = state?.selectedVenueId || '';
  const around = venueId ? selectedVenueCoordinates(state) : null;
  if (around) suppressRedundantVisibilityPan(map, venueId, duration);

  const options = {
    zoom: targetZoom,
    duration,
    essential: true
  };
  if (around) options.around = around;

  const easeTo = baseEaseTo(map);
  easeTo.call(map, options);
  return true;
}

function handleZoomControlClick(event) {
  const button = event.target.closest?.('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out');
  if (!button || button.disabled || !button.closest?.('#map')) return;

  const state = appState();
  const map = state?.map;
  if (!map) return;

  const delta = button.classList.contains('maplibregl-ctrl-zoom-in') ? 1 : -1;
  event.preventDefault();
  event.stopImmediatePropagation();
  coordinatedZoom(map, state, delta);
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) window.setTimeout(connectApp, 25);
    return;
  }

  appConnected = true;
  app.subscribe('rendered', applyInitialSelectedCamera);
  app.subscribe('ready', applyInitialSelectedCamera);
  applyInitialSelectedCamera();
}

function initialize() {
  document.addEventListener('click', handleZoomControlClick, { capture: true });
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
