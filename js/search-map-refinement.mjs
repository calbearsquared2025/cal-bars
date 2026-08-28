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

function syncContributionCopy() {
  const button = document.querySelector('#mobile-add-button');
  const label = button?.querySelector('span:last-child');
  const title = document.querySelector('#add-surface-title');
  const intro = document.querySelector('#add-surface > .command-surface__shell > .command-surface__intro');
  if (!button || !label || !title || !intro) return;

  if (isMobile()) {
    label.textContent = 'Add';
    button.setAttribute('aria-label', 'Add');
    title.textContent = 'Add to the map';
    intro.textContent = 'Choose what you would like to add or correct.';
    return;
  }

  label.textContent = 'Add to CGB';
  button.setAttribute('aria-label', 'Add to Cal Golden Bars');
  title.textContent = 'Add to Cal Golden Bars';
  intro.textContent = 'Add a Watch Party, contribute details, or add another location.';
}

function syncDesktopContributionEntry() {
  const bar = document.querySelector('.mobile-command-bar');
  const button = document.querySelector('#mobile-add-button');
  const mark = button?.querySelector('.mobile-command__add-mark');
  syncContributionCopy();
  if (!bar || !button || !mark) return;

  if (isMobile()) {
    bar.style.removeProperty('grid-template-columns');
    [
      'display', 'grid-row', 'grid-column', 'width', 'height', 'min-height', 'min-width',
      'align-items', 'justify-content', 'gap', 'margin', 'padding', 'color', 'background',
      'border', 'border-radius', 'box-shadow', 'font-size', 'font-weight', 'letter-spacing',
      'line-height', 'white-space'
    ].forEach((property) => button.style.removeProperty(property));
    [
      'width', 'height', 'display', 'place-items', 'margin', 'padding', 'color', 'background',
      'border', 'border-radius', 'box-shadow', 'font-size', 'font-weight', 'line-height'
    ].forEach((property) => mark.style.removeProperty(property));
    return;
  }

  bar.style.gridTemplateColumns = 'minmax(0, 1fr) minmax(0, 1fr) 10px auto';
  Object.assign(button.style, {
    display: 'flex',
    gridRow: '1',
    gridColumn: '4',
    width: 'auto',
    height: '34px',
    minHeight: '34px',
    minWidth: '0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    margin: '0',
    padding: '0 9px',
    color: 'var(--cgb-navy-950, #010133)',
    background: 'var(--cgb-gold-50, #fff7dc)',
    border: '1px solid var(--cgb-gold-500, #e6a411)',
    borderRadius: '8px',
    boxShadow: 'none',
    fontSize: '.66rem',
    fontWeight: '850',
    letterSpacing: '.01em',
    lineHeight: '1',
    whiteSpace: 'nowrap'
  });
  Object.assign(mark.style, {
    width: '14px',
    height: '14px',
    display: 'grid',
    placeItems: 'center',
    margin: '0',
    padding: '0',
    color: 'inherit',
    background: 'transparent',
    border: '0',
    borderRadius: '0',
    boxShadow: 'none',
    fontSize: '.9rem',
    fontWeight: '700',
    lineHeight: '1'
  });
}

function desktopMatchCount(query, state = appState()) {
  if (!query || !state?.snapshot) return 0;
  return rankVenues(state.snapshot, state.gameId, state.origin, query).length;
}

function syncDesktopSearchUi() {
  preserveDesktopReviewPreviewUrl();
  syncDesktopContributionEntry();
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
  document.querySelectorAll('.mobile-command').forEach((button) => {
    button.addEventListener('click', () => requestAnimationFrame(syncDesktopContributionEntry));
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
