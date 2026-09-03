import { buildGameUrl } from './core.mjs';
// Mobile selected-profile interaction refinements share this existing profile bootstrap.
import './mobile-selected-profile-expansion.mjs';
import './mobile-profile-hero-cap.mjs';
import './mobile-profile-pinch-guard.mjs';

const MOBILE_QUERY = '(max-width: 899px)';

let appConnected = false;
let bridging = false;

function clean(value) {
  return String(value ?? '').trim();
}

export function directVenueRoute(snapshot, search = '') {
  const venueSlug = new URLSearchParams(search).get('venue');
  if (!clean(venueSlug)) return null;
  return snapshot?.venues?.find((venue) => clean(venue?.slug) === clean(venueSlug)) || null;
}

export function shouldBridgeMobileDirectVenueProfile({
  mobile = false,
  detailMode = false,
  selectedVenueId = '',
  routeVenueId = '',
  bodyView = ''
} = {}) {
  return Boolean(
    mobile &&
    detailMode &&
    clean(selectedVenueId) &&
    clean(selectedVenueId) === clean(routeVenueId) &&
    bodyView === 'detail'
  );
}

function selectedGame(state) {
  return state?.snapshot?.games?.find((game) => game.game_id === state.gameId) || null;
}

function replaceWithGameRoute(state, windowObject) {
  const game = selectedGame(state);
  const nextUrl = new URL(buildGameUrl(game, windowObject.location.href));
  windowObject.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

export function bridgeMobileDirectVenueProfile({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (bridging || !app || !documentObject || !windowObject) return false;
  const state = app.getState?.();
  const mobile = windowObject.matchMedia?.(MOBILE_QUERY)?.matches === true;
  if (!mobile || !state?.snapshot) return false;

  const routeVenue = directVenueRoute(state.snapshot, windowObject.location?.search || '');
  if (!routeVenue) return false;

  if (state.detailMode && clean(state.selectedVenueId) && clean(state.selectedVenueId) !== clean(routeVenue.venue_id)) {
    bridging = true;
    try {
      state.detailMode = false;
      replaceWithGameRoute(state, windowObject);
      app.render?.();
    } finally {
      bridging = false;
    }
    return true;
  }

  const shouldBridge = shouldBridgeMobileDirectVenueProfile({
    mobile,
    detailMode: state.detailMode,
    selectedVenueId: state.selectedVenueId,
    routeVenueId: routeVenue.venue_id,
    bodyView: documentObject.body?.dataset.view || ''
  });
  if (!shouldBridge) return false;

  bridging = true;
  try {
    state.detailMode = false;
    app.showSelectedVenue?.();
    app.render?.();
  } finally {
    state.detailMode = true;
    bridging = false;
  }
  return true;
}

function connect() {
  if (appConnected || typeof window === 'undefined' || typeof document === 'undefined') return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connect, 25);
    return;
  }
  appConnected = true;
  const bridge = () => bridgeMobileDirectVenueProfile({ app, documentObject: document, windowObject: window });
  app.subscribe('rendered', bridge);
  app.subscribe('ready', bridge);
  bridge();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.setTimeout(connect, 0);
}
