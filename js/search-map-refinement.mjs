import { rankVenues } from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const PENDING_TIMEOUT_MS = 8000;

let searchResultPending = false;
let pendingTimer = null;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
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

function restoreMobileAddLocationCopy(button) {
  if (!button) return;
  button.replaceChildren(document.createTextNode('Not yet listed? '));
  const strong = document.createElement('strong');
  strong.textContent = 'Add a location.';
  button.append(strong);
}

function placeAddLocationAction() {
  const form = document.querySelector('#location-search');
  const dropdown = document.querySelector('#search-dropdown');
  const button = document.querySelector('#search-add-location-button');
  if (!form || !dropdown || !button) return null;

  if (isMobile()) {
    if (button.parentElement !== dropdown) dropdown.append(button);
    restoreMobileAddLocationCopy(button);
    return button;
  }

  if (button.parentElement !== form) form.append(button);
  return button;
}

function desktopMatchCount(query, state = appState()) {
  if (!query || !state?.snapshot) return 0;
  return rankVenues(state.snapshot, state.gameId, state.origin, query).length;
}

function syncDesktopSearchUi() {
  const button = placeAddLocationAction();
  if (isMobile()) return;

  const state = appState();
  const input = document.querySelector('#location-query');
  const dropdown = document.querySelector('#search-dropdown');
  const listToggle = document.querySelector('#list-location-toggle');
  const clearSearch = document.querySelector('#clear-search-button');
  const listEyebrow = document.querySelector('#tray-list .tray-list__header .eyebrow');
  if (!button || !input) return;

  const existingMode = (state?.searchMode || 'existing') === 'existing';
  const query = input.value.trim();
  const matchCount = desktopMatchCount(query, state);
  const listQuery = String(state?.listQuery || '').trim();

  button.hidden = !existingMode;
  if (existingMode) {
    button.textContent = !query
      ? 'Add a location.'
      : matchCount > 0
        ? 'Don’t see it? Add a location.'
        : 'No matching locations found. Add a location.';
  }

  /* The desktop CTA lives outside the dropdown, so an empty results shell is unnecessary. */
  if (dropdown && existingMode && (!query || matchCount === 0)) dropdown.hidden = true;

  if (listToggle) listToggle.hidden = Boolean(listQuery);
  if (clearSearch) clearSearch.textContent = listQuery ? 'Clear search' : 'All locations';
  if (listEyebrow) listEyebrow.textContent = listQuery ? 'Search results' : 'Browse';
}

function scheduleDesktopSearchUiSync() {
  requestAnimationFrame(syncDesktopSearchUi);
}

function initialize() {
  const searchInput = document.querySelector('#location-query');

  document.addEventListener('submit', handleSearchSubmit, { capture: true });
  document.addEventListener('click', handleSearchResultClick, { capture: true });
  searchInput?.addEventListener('input', () => {
    clearPending();
    syncDesktopSearchUi();
  });
  searchInput?.addEventListener('focus', syncDesktopSearchUi);
  document.addEventListener('click', scheduleDesktopSearchUiSync);
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', () => {
    clearPending();
    syncDesktopSearchUi();
  });
  window.CGBApp?.subscribe?.('rendered', () => {
    scheduleReturnToMap();
    syncDesktopSearchUi();
  });
  window.CGBApp?.subscribe?.('ready', () => {
    scheduleReturnToMap();
    syncDesktopSearchUi();
  });
  syncDesktopSearchUi();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
