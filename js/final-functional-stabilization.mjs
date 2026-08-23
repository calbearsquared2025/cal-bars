const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-final-functional-stabilization';
const CONTEXTUAL_ADD_SELECTOR = [
  '#add-watch-party-button',
  '#add-cal-bar-button',
  '#add-report-button',
  '#add-report-listing-button',
  '#add-report-party-button'
].join(',');

let listSurfaceLocked = false;
let addContextVenueId = '';
let postRenderFrame = 0;
let appConnected = false;
let appConnectAttempts = 0;
const APP_CONNECT_MAX_ATTEMPTS = 1200;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function venueById(venueId, state = appState()) {
  if (!venueId || !state?.snapshot?.venues) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === venueId) || null;
}

function installStyles() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .selected-card__directions-inline::before {
        content: none !important;
      }

      .selected-card__location-separator {
        flex: 0 0 auto;
        margin: 0 6px 0 2px;
        color: var(--cgb-ink-500, #657083);
        text-decoration: none;
        pointer-events: none;
      }

      .selected-card__directions-inline {
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .cgb-safe-area-fill {
        position: fixed;
        z-index: 1000;
        left: 0;
        right: 0;
        display: block;
        pointer-events: none;
      }

      .cgb-safe-area-fill--top {
        top: 0;
        height: env(safe-area-inset-top, 0px);
        background: var(--cgb-navy-950, #010133);
      }

      .cgb-safe-area-fill--bottom {
        bottom: 0;
        height: env(safe-area-inset-bottom, 0px);
        background: var(--cgb-white, #fff);
      }

      @media (min-width: 900px) {
        .cgb-safe-area-fill {
          display: none;
        }
      }
    `;
  }
  document.head.append(style);
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

function setCommandActive(command) {
  document.body.dataset.commandSurface = command;
  document.querySelectorAll('.mobile-command').forEach((button) => {
    const buttonCommand = button.dataset.command || ({
      'mobile-map-button': 'map',
      'mobile-search-button': 'search',
      'mobile-add-button': 'add',
      'mobile-list-button': 'list'
    })[button.id];
    const active = buttonCommand === command;
    button.classList.toggle('mobile-command--active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function setTrayState(next) {
  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!state || !tray) return;
  state.trayState = next;
  tray.dataset.state = next;
  tray.className = `venue-tray tray--${next}`;
  document.querySelector('#tray-handle')?.setAttribute('aria-expanded', String(next !== 'peek'));
  const peek = document.querySelector('#tray-peek');
  const selected = document.querySelector('#tray-selected');
  const list = document.querySelector('#tray-list');
  if (peek) peek.hidden = next !== 'peek';
  if (selected) selected.hidden = next !== 'selected';
  if (list) list.hidden = next !== 'full';
}

function restoreListSurface() {
  if (!isMobile() || !listSurfaceLocked || document.body.dataset.view === 'detail') return;
  const searchSurface = document.querySelector('#search-surface');
  const addSurface = document.querySelector('#add-surface');
  if (searchSurface) searchSurface.hidden = true;
  if (addSurface) addSurface.hidden = true;
  setTrayState('full');
  setCommandActive('list');
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

function fixDirectionsSeparator() {
  document.querySelectorAll('.selected-card__directions-inline').forEach((link) => {
    link.querySelectorAll('.ui-icon').forEach((icon) => icon.remove());
    link.textContent = 'Directions';
    const previous = link.previousElementSibling;
    if (previous?.classList.contains('selected-card__location-separator')) return;
    const separator = document.createElement('span');
    separator.className = 'selected-card__location-separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '·';
    link.before(separator);
  });
}

function schedulePostRender() {
  window.cancelAnimationFrame(postRenderFrame);
  postRenderFrame = window.requestAnimationFrame(() => {
    installStyles();
    ensureSafeAreaFills();
    fixDirectionsSeparator();

    if (document.body.dataset.commandSurface === 'list') listSurfaceLocked = true;
    if (listSurfaceLocked) restoreListSurface();
    syncAddContext();
  });
}

function setListLockFromEvent(event) {
  if (event.target.closest?.('#mobile-list-button, #list-location-toggle')) {
    listSurfaceLocked = true;
    return;
  }
  if (event.target.closest?.('#mobile-map-button, #mobile-search-button, #mobile-add-button, [data-command-close]')) {
    listSurfaceLocked = false;
  }
  if (event.target.closest?.('#location-list .location-card')) listSurfaceLocked = false;
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
    installStyles();
    ensureSafeAreaFills();
    fixDirectionsSeparator();
  });

  document.addEventListener('pointerdown', setListLockFromEvent, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') setListLockFromEvent(event);
  }, { capture: true });
  document.addEventListener('click', setListLockFromEvent, { capture: true });
  document.addEventListener('pointerdown', handleNavigationContext, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') handleNavigationContext(event);
  }, { capture: true });
  document.addEventListener('click', handleNavigationContext, { capture: true });
  document.addEventListener('click', restoreContextForAddAction, { capture: true });

  if (document.body.dataset.commandSurface === 'list') listSurfaceLocked = true;
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', schedulePostRender);
  connectApp();
  schedulePostRender();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
