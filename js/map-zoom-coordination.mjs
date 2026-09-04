const INITIAL_SELECTED_ZOOM = 11;
const SELECTED_CAMERA_SETTLE_MS = 560;
const APP_CONNECT_MAX_ATTEMPTS = 1200;

let appConnected = false;
let appConnectAttempts = 0;
let initialSelectionCaptured = false;
let initialSelectedVenueId = '';
const initialSelectedCameraMaps = new WeakSet();
const coordinatedMaps = new WeakSet();

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function isDesktop() {
  return window.matchMedia('(min-width: 900px)').matches;
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

function centerCoordinates(center) {
  if (Array.isArray(center)) return [Number(center[0]), Number(center[1])];
  return [Number(center?.lng), Number(center?.lat)];
}

function captureInitialSelection(state = appState()) {
  if (initialSelectionCaptured || !state?.snapshot) return false;
  initialSelectionCaptured = true;
  initialSelectedVenueId = state.selectedVenueId || '';
  return true;
}

function applyInitialSelectedCamera() {
  const state = appState();
  captureInitialSelection(state);
  const map = state?.map;
  if (!map || initialSelectedCameraMaps.has(map) || !state.selectedVenueId) return false;

  // Seed only a venue that was already selected on the initial route. A user can
  // choose a list row before the map finishes loading; that interaction must stay
  // on the ordinary animated selected-camera path used after map load.
  if (!initialSelectedVenueId || state.selectedVenueId !== initialSelectedVenueId) {
    initialSelectedCameraMaps.add(map);
    return false;
  }

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

function cancelSelectedVisibilityFrame(state = appState()) {
  const frame = state?.venueVisibilityFrame;
  if (frame === null || frame === undefined) return false;
  cancelAnimationFrame(frame);
  state.venueVisibilityFrame = null;
  return true;
}

function isDesktopSelectedFocus(options = {}, state = appState()) {
  if (!isDesktop() || !state?.detailMode || !state.selectedVenueId) return false;
  const selected = selectedVenueCoordinates(state);
  if (!selected) return false;
  const [longitude, latitude] = centerCoordinates(options.center);
  const zoom = Number(options.zoom);
  return [longitude, latitude, zoom].every(Number.isFinite) &&
    Math.abs(longitude - selected[0]) < 1e-7 &&
    Math.abs(latitude - selected[1]) < 1e-7 &&
    zoom >= INITIAL_SELECTED_ZOOM;
}

function suppressRedundantSelectedVisibilityPan() {
  const startedAt = performance.now();

  const cancel = () => cancelSelectedVisibilityFrame();
  queueMicrotask(cancel);

  const cancelUntilSettled = () => {
    cancel();
    if (performance.now() - startedAt < SELECTED_CAMERA_SETTLE_MS) {
      requestAnimationFrame(cancelUntilSettled);
    }
  };
  requestAnimationFrame(cancelUntilSettled);
}

function coordinateSelectedCamera() {
  const map = appState()?.map;
  if (!map || coordinatedMaps.has(map) || typeof map.easeTo !== 'function') return false;

  const nativeEaseTo = map.easeTo;
  map.easeTo = function coordinatedSelectedEaseTo(options = {}, ...args) {
    const result = nativeEaseTo.call(this, options, ...args);
    if (isDesktopSelectedFocus(options)) suppressRedundantSelectedVisibilityPan();
    return result;
  };
  coordinatedMaps.add(map);
  return true;
}

function sync() {
  const state = appState();
  captureInitialSelection(state);
  coordinateSelectedCamera();
  applyInitialSelectedCamera();
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
  app.subscribe('rendered', sync);
  app.subscribe('ready', sync);
  sync();
}

function initialize() {
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
