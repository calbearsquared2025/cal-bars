import { clearSelectedMapVenue } from './app-state.mjs';
import { getFanCount, getWatchParty, rankVenues } from './core.mjs';
import { compactListFanCountCopy } from './fan-intent-core.mjs';
import {
  applyDesktopReviewPreview,
  desktopReviewPreviewRequested,
  desktopReviewPreviewUrl
} from './desktop-review-preview.mjs';

const desktopReviewPreviewActive = applyDesktopReviewPreview();
const MOBILE_QUERY = '(max-width: 899px)';
const DESKTOP_ADD_SEARCH_STYLE_ID = 'cgb-desktop-add-inline-search-style';
let desktopSearchEngaged = false;
let preserveQueryForNextDesktopAdd = false;
let desktopAddObserver = null;

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

function syncDesktopContributionEntry() {
  const bar = document.querySelector('.mobile-command-bar');
  const locations = document.querySelector('#mobile-list-button');
  const selected = document.querySelector('#mobile-map-button');
  const button = document.querySelector('#mobile-add-button');
  const mark = button?.querySelector('.mobile-command__add-mark');
  if (!bar || !locations || !selected || !button || !mark) return;

  if (isMobile()) {
    bar.style.removeProperty('grid-template-columns');
    [locations, selected].forEach((item) => {
      ['grid-row', 'grid-column', 'width', 'justify-content'].forEach((property) => item.style.removeProperty(property));
    });
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

  bar.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  Object.assign(locations.style, {
    gridRow: '1',
    gridColumn: '1',
    width: '100%',
    justifyContent: 'center'
  });
  Object.assign(selected.style, {
    gridRow: '1',
    gridColumn: '2',
    width: '100%',
    justifyContent: 'center'
  });
  Object.assign(button.style, {
    display: 'flex',
    gridRow: '1',
    gridColumn: '3',
    width: '100%',
    height: '40px',
    minHeight: '40px',
    minWidth: '0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    margin: '0',
    padding: '0',
    color: 'var(--cgb-navy-800, #0b2856)',
    background: 'transparent',
    border: '0',
    borderRadius: '0',
    boxShadow: 'none',
    fontSize: '.7rem',
    fontWeight: '800',
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
    color: 'var(--cgb-gold-500, #e6a411)',
    background: 'transparent',
    border: '0',
    borderRadius: '0',
    boxShadow: 'none',
    fontSize: '.92rem',
    fontWeight: '800',
    lineHeight: '1'
  });
}

function ensureDesktopAddSearchStyle() {
  if (document.getElementById(DESKTOP_ADD_SEARCH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DESKTOP_ADD_SEARCH_STYLE_ID;
  style.textContent = `
    @media (min-width: 900px) {
      .mobile-command-bar {
        padding-inline: 10px;
      }

      #mobile-list-button,
      #mobile-map-button {
        position: relative;
        min-height: 40px;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: var(--cgb-ink-500, #657083);
        font-size: .7rem;
        font-weight: 780;
      }

      #mobile-list-button > .ui-icon,
      #mobile-map-button > .ui-icon {
        display: none;
      }

      #mobile-list-button:hover:not(:disabled),
      #mobile-map-button:hover:not(:disabled),
      #mobile-list-button:focus-visible,
      #mobile-map-button:focus-visible {
        background: transparent !important;
        color: var(--cgb-navy-950, #010133);
      }

      #mobile-list-button[aria-current="page"],
      #mobile-map-button[aria-current="page"] {
        background: transparent !important;
        color: var(--cgb-navy-950, #010133);
        font-weight: 850;
      }

      #mobile-list-button[aria-current="page"]::after,
      #mobile-map-button[aria-current="page"]::after {
        content: "";
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 1px;
        height: 2px;
        background: var(--cgb-gold-400, #fdb515);
        border-radius: 999px;
      }

      #mobile-map-button:disabled {
        opacity: .38;
      }

      #mobile-add-button:hover,
      #mobile-add-button:focus-visible {
        color: var(--cgb-navy-950, #010133) !important;
        background: transparent !important;
        text-decoration: underline;
        text-decoration-color: var(--cgb-gold-400, #fdb515);
        text-underline-offset: .22em;
      }

      #tray-list .tray-list__header {
        padding-bottom: 14px !important;
      }

      #tray-list .tray-list__toolbar {
        display: none;
      }

      #tray-list .location-card__top {
        align-items: flex-start;
      }

      #tray-list .location-card__top > div {
        width: 100%;
      }

      #tray-list .location-card__meta-line {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0;
        margin-top: 1px;
        color: var(--cgb-ink-500, #657083);
        font-family: var(--font-ui);
        font-size: var(--text-xs);
        font-weight: 500;
        line-height: 1.35;
      }

      #tray-list .location-card__meta-line > span {
        font: inherit;
      }

      #tray-list .location-card__count {
        flex: 0 0 auto;
        margin: 0 !important;
        color: var(--cgb-navy-800, #0b2856) !important;
        font-family: var(--font-ui) !important;
        font-size: inherit !important;
        font-weight: 650 !important;
        letter-spacing: 0;
        line-height: inherit;
        text-align: left;
        text-transform: none;
      }

      #tray-list .location-card__count:not([hidden])::before {
        content: "·";
        display: inline-block;
        margin: 0 6px;
        color: var(--cgb-ink-500, #657083);
        font-weight: 500;
      }

      #tray-list .location-card__party {
        color: var(--cgb-ink-500, #657083) !important;
        font-family: var(--font-ui);
        font-size: var(--text-xs);
        font-weight: 500;
        line-height: 1.35;
      }

      #tray-list .location-card__party-host {
        color: var(--cgb-gold-600, #b77900);
        font-family: var(--font-ui) !important;
        font-size: inherit !important;
        font-weight: 700;
        letter-spacing: inherit;
        line-height: inherit;
      }

      #tray-list .location-card .badge--party {
        color: var(--cgb-navy-950, #010133);
        background: #ffd35a;
        border-color: var(--cgb-gold-500, #e6a411);
      }

      #tray-list .location-card .badge--cal {
        color: var(--cgb-white, #fff);
        background: var(--cgb-navy-700, #153f75);
        border-color: var(--cgb-navy-900, #071e41);
      }

      #add-surface .add-somewhere-else {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid var(--cgb-neutral-200, #dfe3e8);
      }

      #add-surface .add-somewhere-else > .command-surface__intro {
        margin: 4px 0 10px;
        max-width: none;
        font-size: .82rem;
        line-height: 1.4;
      }

      #add-surface .desktop-add-search-slot,
      #add-surface .desktop-add-search-slot .location-search,
      #add-surface .desktop-add-search-slot .search-field {
        width: 100%;
      }

      #add-surface .desktop-add-search-slot .search-field {
        min-height: 48px;
        grid-template-columns: 18px minmax(0, 1fr) auto;
        gap: 8px;
        padding: 4px 4px 4px 12px;
        background: var(--cgb-navy-50, #eef3f8);
        border: 1px solid var(--cgb-neutral-300, #cdd4dc);
        border-radius: 12px;
        box-shadow: none;
        clip-path: none;
      }

      #add-surface .desktop-add-search-slot .search-field:focus-within {
        border-color: var(--cgb-gold-500, #e6a411);
        box-shadow: 0 0 0 2px rgba(230, 164, 17, .16);
      }

      #add-surface .desktop-add-search-slot .search-field input {
        min-width: 0;
        padding: 8px 0;
        color: var(--cgb-navy-950, #010133);
        font-size: .9rem;
        font-weight: 600;
      }

      #add-surface .desktop-add-search-slot .search-submit {
        min-height: 38px;
        padding: 6px 14px;
        background: var(--cgb-navy-800, #0b2856);
        border-radius: 8px;
        clip-path: none;
      }

      #add-surface .desktop-add-search-slot .search-add-location-action,
      #add-surface #add-new-location-button,
      #add-surface .add-somewhere-else > .add-actions {
        display: none !important;
      }
    }
  `;
  document.head.append(style);
}

function ensureDesktopAddSearchSlot() {
  const section = document.querySelector('#add-surface .add-somewhere-else');
  if (!section) return null;
  let slot = section.querySelector('.desktop-add-search-slot');
  if (slot) return slot;
  slot = document.createElement('div');
  slot.className = 'desktop-add-search-slot';
  slot.dataset.desktopAddSearchSlot = 'true';
  const actions = section.querySelector(':scope > .add-actions');
  if (actions) section.insertBefore(slot, actions);
  else section.append(slot);
  return slot;
}

function selectedVenue(state = appState()) {
  if (!state?.selectedVenueId || !state?.snapshot?.venues) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function desktopAddSurfaceVisible() {
  const surface = document.querySelector('#add-surface');
  return !isMobile() && Boolean(surface && !surface.hidden);
}

function syncDesktopAddCopy() {
  if (!desktopAddSurfaceVisible()) return;
  const venue = selectedVenue();
  const intro = document.querySelector('#add-surface > .command-surface__shell > .command-surface__intro');
  const sectionTitle = document.querySelector('#add-somewhere-else-title');
  const sectionIntro = document.querySelector('#add-surface .add-somewhere-else > .command-surface__intro');
  if (intro) {
    intro.textContent = venue
      ? 'Choose an action for this location. To add a different place, search below.'
      : 'To add a Watch Party, contribute details, or report a problem for a location already in CGB, select it on the map or in Locations first. If the place isn’t listed yet, search below to add it.';
  }
  if (sectionTitle) sectionTitle.textContent = venue ? 'Different location?' : 'Place not listed yet?';
  if (sectionIntro) {
    sectionIntro.hidden = false;
    sectionIntro.textContent = venue
      ? 'Search for a venue or address that isn’t listed in CGB yet.'
      : 'Search for the venue or address below.';
  }
}

function syncDesktopLocationListPresentation() {
  if (isMobile()) return;
  const state = appState();
  if (!state?.snapshot) return;

  document.querySelectorAll('#location-list .location-card[data-venue-id]').forEach((card) => {
    const info = card.querySelector('.location-card__top > div');
    const count = card.querySelector('.location-card__count');
    if (info && count) {
      let metaLine = info.querySelector(':scope > .location-card__meta-line');
      if (!metaLine) {
        const locationMeta = Array.from(info.children).find((child) =>
          child.tagName === 'SPAN' &&
          !child.classList.contains('venue-badge') &&
          !child.classList.contains('location-card__count'));
        if (locationMeta) {
          metaLine = document.createElement('div');
          metaLine.className = 'location-card__meta-line';
          locationMeta.insertAdjacentElement('beforebegin', metaLine);
          metaLine.append(locationMeta, count);
        }
      } else if (count.parentElement !== metaLine) {
        metaLine.append(count);
      }
    }

    const venueId = card.dataset.venueId;
    if (count) {
      const fanCount = getFanCount(state.snapshot, state.gameId, venueId);
      count.textContent = compactListFanCountCopy(fanCount);
      count.hidden = fanCount <= 0;
    }

    const party = getWatchParty(state.snapshot, state.gameId, venueId);
    const host = card.querySelector('.location-card__party');
    if (party?.organizer_name && host) {
      host.replaceChildren(document.createTextNode('Watch Party hosted by '));
      const organizer = document.createElement('strong');
      organizer.className = 'location-card__party-host';
      organizer.textContent = party.organizer_name;
      host.append(organizer);
    }
  });
}

function activateDesktopAddSearch({ preserveQuery = true, refresh = true } = {}) {
  if (!desktopAddSurfaceVisible()) return false;
  ensureDesktopAddSearchStyle();
  const slot = ensureDesktopAddSearchSlot();
  const form = document.querySelector('#location-search');
  const input = document.querySelector('#location-query');
  const helper = document.querySelector('#search-add-location-button');
  const state = appState();
  const venue = selectedVenue(state);
  if (!slot || !form || !input || !state) return false;

  if (!preserveQuery && venue && input.value.trim() === venue.name) input.value = '';
  state.searchMode = 'add-location';
  document.body.dataset.searchMode = 'add-location';
  input.placeholder = 'Venue or address';
  if (helper) helper.hidden = true;
  if (form.parentElement !== slot) slot.append(form);
  syncDesktopAddCopy();

  if (refresh) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (input.value.trim()) window.CGBExternalVenueSearch?.searchCurrentQuery?.({ immediate: true });
  }
  return true;
}

function reopenDesktopAddAfterResult(event) {
  if (!desktopAddSurfaceVisible()) return;
  const existing = event.target.closest?.('button[data-venue-id]');
  const external = event.target.closest?.('button[data-external-place-id]');
  if (!existing && !external) return;
  requestAnimationFrame(() => {
    preserveQueryForNextDesktopAdd = Boolean(external);
    document.querySelector('#mobile-add-button')?.click();
  });
}

function handleDesktopContributionClicks(event) {
  if (isMobile()) return;
  if (event.target.closest?.('#search-add-location-button')) {
    preserveQueryForNextDesktopAdd = true;
    document.querySelector('#mobile-add-button')?.click();
    return;
  }
  if (event.target.closest?.('#mobile-add-button')) {
    const preserveQuery = preserveQueryForNextDesktopAdd;
    preserveQueryForNextDesktopAdd = false;
    activateDesktopAddSearch({ preserveQuery });
    return;
  }
  reopenDesktopAddAfterResult(event);
}

function observeDesktopAddSearch() {
  if (desktopAddObserver) return;
  const addSurface = document.querySelector('#add-surface');
  const suggestions = document.querySelector('#search-suggestions');
  if (!addSurface || !suggestions || typeof MutationObserver !== 'function') return;
  desktopAddObserver = new MutationObserver(() => {
    if (desktopAddSurfaceVisible()) {
      requestAnimationFrame(() => activateDesktopAddSearch({ preserveQuery: true, refresh: false }));
    }
  });
  desktopAddObserver.observe(addSurface, { attributes: true, attributeFilter: ['hidden'] });
  desktopAddObserver.observe(suggestions, { childList: true, subtree: true });
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

  syncDesktopLocationListPresentation();

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
  if (desktopAddSurfaceVisible()) {
    requestAnimationFrame(() => activateDesktopAddSearch({ preserveQuery: true, refresh: false }));
  }
}

function handleDesktopMapDeselect(event) {
  if (isMobile() || document.body.dataset.commandSurface !== 'map') return;
  const map = event.target.closest?.('#map');
  if (!map) return;
  if (event.target.closest?.('.cgb-marker, .maplibregl-control-container, .maplibregl-ctrl')) return;
  if (!clearSelectedMapVenue({ allowDetailMode: true })) return;
  window.CGBApp?.showLocations?.();
}

function initialize() {
  const form = document.querySelector('#location-search');
  const searchInput = document.querySelector('#location-query');

  ensureDesktopAddSearchStyle();
  observeDesktopAddSearch();
  document.addEventListener('click', handleDesktopContributionClicks);

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
  document.addEventListener('click', handleDesktopMapDeselect);
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
