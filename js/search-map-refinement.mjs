const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-search-map-refinement';
const PENDING_TIMEOUT_MS = 8000;

let searchResultPending = false;
let pendingTimer = null;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      /* Search is a clean command surface; selected and Nearby trays remain Map-only. */
      body[data-command-surface="search"] #map-view > #venue-tray.venue-tray {
        display: none !important;
      }

      body[data-command-surface="search"].has-selected-venue .command-surface:not([hidden]) {
        bottom: var(--footer-height) !important;
      }
    }
  `;
  document.head.append(style);
}

function clearPending() {
  searchResultPending = false;
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function markPending() {
  searchResultPending = true;
  if (pendingTimer !== null) window.clearTimeout(pendingTimer);
  pendingTimer = window.setTimeout(clearPending, PENDING_TIMEOUT_MS);
}

function handleSearchSubmit(event) {
  if (!isMobile() || !event.target.closest?.('#location-search')) return;
  const query = document.querySelector('#location-query')?.value?.trim() || '';
  if (query) markPending();
}

function handleSearchResultClick(event) {
  if (!isMobile()) return;
  const existing = event.target.closest?.('#search-suggestions button[data-venue-id]');
  if (existing) markPending();
}

function returnSearchResultToMap() {
  if (!searchResultPending || !isMobile()) return;
  if (document.body.dataset.commandSurface !== 'search') return;

  const tray = document.querySelector('#venue-tray');
  const trayState = tray?.dataset.state || '';
  if (trayState !== 'selected' && trayState !== 'full') return;

  clearPending();
  const state = appState();

  /* Area and multi-match searches should show filtered pins, not inherit an old selection. */
  if (trayState === 'full' && state) state.selectedVenueId = '';

  document.querySelector('#mobile-map-button')?.click();

  if (trayState === 'full') {
    requestAnimationFrame(() => window.CGBApp?.render?.());
  }
}

function scheduleReturnToMap() {
  requestAnimationFrame(returnSearchResultToMap);
}

function initialize() {
  installStyles();
  document.addEventListener('submit', handleSearchSubmit, { capture: true });
  document.addEventListener('click', handleSearchResultClick, { capture: true });
  document.querySelector('#location-query')?.addEventListener('input', clearPending);
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', clearPending);
  window.CGBApp?.subscribe?.('rendered', scheduleReturnToMap);
  window.CGBApp?.subscribe?.('ready', scheduleReturnToMap);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
