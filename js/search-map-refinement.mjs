import { rankVenues } from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
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

  if (listEyebrow) listEyebrow.textContent = listQuery ? 'Search results' : 'Browse';
}

function initialize() {
  const searchInput = document.querySelector('#location-query');

  searchInput?.addEventListener('input', syncDesktopSearchUi);
  searchInput?.addEventListener('focus', syncDesktopSearchUi);
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', syncDesktopSearchUi);
  window.CGBApp?.subscribe?.('rendered', syncDesktopSearchUi);
  window.CGBApp?.subscribe?.('ready', syncDesktopSearchUi);
  syncDesktopSearchUi();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
