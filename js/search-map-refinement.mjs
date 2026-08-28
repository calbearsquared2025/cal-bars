import { rankVenues } from './core.mjs';
import {
  applyDesktopReviewPreview,
  desktopReviewPreviewRequested,
  desktopReviewPreviewUrl
} from './desktop-review-preview.mjs';

const desktopReviewPreviewActive = applyDesktopReviewPreview();
const MOBILE_QUERY = '(max-width: 899px)';
let desktopSearchEngaged = false;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function preserveDesktopReviewPreviewUrl() {
  if (!desktopReviewPreviewActive || desktopReviewPreviewRequested(window.location.search)) return;
  window.history.replaceState(
    window.history.state,
    '',
    desktopReviewPreviewUrl(window.location.href)
  );
}

function setAddLocationCopy(button, prefix) {
  if (!button) return;
  button.replaceChildren(document.createTextNode(prefix));
  const strong = document.createElement('strong');
  strong.textContent = 'Search for another location.';
  button.append(strong);
}

function restoreMobileAddLocationCopy(button) {
  setAddLocationCopy(button, 'Watching somewhere else? ');
}

function placeAddLocationAction() {
  const form = document.querySelector('#location-search');
  const dropdown = document.querySelector('#search-dropdown');
  const button = document.querySelector('#search-add-location-button');
  if (!form || !dropdown || !button) return null;

  if (isMobile()) {
    button.classList.remove('search-add-location-action--browse');
    if (button.parentElement !== dropdown) dropdown.append(button);
    restoreMobileAddLocationCopy(button);
    return button;
  }

  button.classList.remove('search-add-location-action--browse');
  if (button.parentElement !== form) form.append(button);
  return button;
}

function desktopMatchCount(query, state = appState()) {
  if (!query || !state?.snapshot) return 0;
  return rankVenues(state.snapshot, state.gameId, state.origin, query).length;
}

function syncDesktopSearchUi() {
  preserveDesktopReviewPreviewUrl();
  if (isMobile()) {
    placeAddLocationAction();
    return;
  }

  const state = appState();
  const input = document.querySelector('#location-query');
  const dropdown = document.querySelector('#search-dropdown');
  const listEyebrow = document.querySelector('#tray-list .tray-list__header .eyebrow');
  if (!input) return;

  const existingMode = (state?.searchMode || 'existing') === 'existing';
  const query = input.value.trim();
  const button = placeAddLocationAction();
  if (!button) return;

  const matchCount = desktopMatchCount(query, state);
  const listQuery = String(state?.listQuery || '').trim();
  const showSearchHelper = existingMode && desktopSearchEngaged && Boolean(query);

  button.hidden = !showSearchHelper;
  if (showSearchHelper) {
    setAddLocationCopy(
      button,
      matchCount > 0 ? 'Don’t see it? ' : 'No matching locations found. '
    );
  }

  /* The desktop CTA lives outside the dropdown, so an empty results shell is unnecessary. */
  if (dropdown && existingMode && (!query || matchCount === 0)) dropdown.hidden = true;

  if (listEyebrow) listEyebrow.textContent = listQuery ? 'Search results' : 'Browse';
}

function initialize() {
  const form = document.querySelector('#location-search');
  const searchInput = document.querySelector('#location-query');

  searchInput?.addEventListener('input', () => {
    if (!isMobile()) desktopSearchEngaged = true;
    syncDesktopSearchUi();
  });
  searchInput?.addEventListener('focus', () => {
    if (!isMobile()) desktopSearchEngaged = true;
    syncDesktopSearchUi();
  });
  form?.addEventListener('focusout', () => {
    if (isMobile()) return;
    requestAnimationFrame(() => {
      if (form.contains(document.activeElement)) return;
      desktopSearchEngaged = false;
      syncDesktopSearchUi();
    });
  });
  document.querySelector('#add-new-location-button')?.addEventListener('click', () => {
    document.querySelector('#search-add-location-button')?.click();
  });
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', () => {
    desktopSearchEngaged = false;
    syncDesktopSearchUi();
  });
  window.CGBApp?.subscribe?.('rendered', syncDesktopSearchUi);
  window.CGBApp?.subscribe?.('ready', syncDesktopSearchUi);
  syncDesktopSearchUi();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
