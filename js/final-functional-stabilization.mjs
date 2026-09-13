import './map-zoom-coordination.mjs';

const CONTEXTUAL_ADD_SELECTOR = [
  '#add-watch-party-button',
  '#add-cal-bar-button',
  '#add-report-button',
  '#add-report-listing-button',
  '#add-report-party-button'
].join(',');

let addContextVenueId = '';
let postRenderFrame = 0;
let appConnected = false;
let appConnectAttempts = 0;
const APP_CONNECT_MAX_ATTEMPTS = 1200;

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function venueById(venueId, state = appState()) {
  if (!venueId || !state?.snapshot?.venues) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === venueId) || null;
}

function ensureSafeAreaFills() {
  if (!document.querySelector('.cgb-safe-area-fill--top')) {
    const top = document.createElement('div');
    top.className = 'cgb-safe-area-fill cgb-safe-area-fill--top';
    top.setAttribute('aria-hidden', 'true');
    document.body.append(top);
  }
  if (!document.querySelector('.cgb-safe-area-fill--bottom')) {
    const bottom = document.createElement('div');
    bottom.className = 'cgb-safe-area-fill cgb-safe-area-fill--bottom';
    bottom.setAttribute('aria-hidden', 'true');
    document.body.append(bottom);
  }
}

function captureAddContext() {
  addContextVenueId = appState()?.selectedVenueId || '';
}

function clearAddContext() {
  addContextVenueId = '';
}

function syncAddContext() {
  if (document.body.dataset.commandSurface !== 'add' || !addContextVenueId) return;
  const state = appState();
  const venue = venueById(addContextVenueId, state);
  if (!state || !venue) {
    clearAddContext();
    return;
  }

  state.selectedVenueId = venue.venue_id;
  const context = document.querySelector('#add-surface .add-context:not(.add-game-context)');
  const name = document.querySelector('#add-context-name');
  const copy = document.querySelector('#add-context-copy');
  if (context) context.hidden = false;
  if (name) name.textContent = venue.name;
  if (copy) {
    const place = [venue.city, venue.region].filter(Boolean).join(', ');
    copy.textContent = place ? `${place} is selected.` : 'This place is selected.';
  }
}

function restoreContextForAddAction(event) {
  if (!event.target.closest?.(CONTEXTUAL_ADD_SELECTOR) || !addContextVenueId) return;
  const state = appState();
  if (state && venueById(addContextVenueId, state)) state.selectedVenueId = addContextVenueId;
}

function schedulePostRender() {
  window.cancelAnimationFrame(postRenderFrame);
  postRenderFrame = window.requestAnimationFrame(() => {
    ensureSafeAreaFills();
    syncAddContext();
  });
}

function handleNavigationContext(event) {
  if (event.target.closest?.('#mobile-add-button')) captureAddContext();
  if (event.target.closest?.('#mobile-map-button, #mobile-list-button, [data-command-close]')) clearAddContext();
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) {
      window.setTimeout(connectApp, 25);
    }
    return;
  }

  appConnected = true;
  app.subscribe('rendered', schedulePostRender);
  app.subscribe('ready', schedulePostRender);
  schedulePostRender();
}

function initialize() {
  queueMicrotask(() => {
    ensureSafeAreaFills();
  });

  document.addEventListener('pointerdown', handleNavigationContext, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') handleNavigationContext(event);
  }, { capture: true });
  document.addEventListener('click', handleNavigationContext, { capture: true });
  document.addEventListener('click', restoreContextForAddAction, { capture: true });

  connectApp();
  schedulePostRender();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
