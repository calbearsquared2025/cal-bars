import {
  NEARBY_RADIUS_MILES,
  rankNearbyVenues
} from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-tab-location-refinement';

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
      /* Add and List are opaque peer tab surfaces; Search first-paint rules are static CSS. */
      body[data-command-surface="add"] #map,
      body[data-command-surface="list"] #map {
        visibility: hidden !important;
      }

      body[data-command-surface="add"] #map-view,
      body[data-command-surface="list"] #map-view {
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="add"] .command-surface:not([hidden]) {
        z-index: 47 !important;
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="add"] #map-view > #venue-tray {
        display: none !important;
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full {
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
      }

      body[data-command-surface="list"] #close-list-button {
        display: none !important;
      }

      body[data-command-surface="list"] #clear-search-button {
        display: inline-flex !important;
        align-items: center;
        min-height: 36px;
        padding: 0 12px;
        white-space: nowrap;
        text-decoration: none !important;
        border: 1px solid var(--cgb-neutral-300);
        border-radius: 999px;
        background: var(--cgb-white);
      }
    }

  `;
  document.head.append(style);
}

function setCommandActive(command) {
  document.body.dataset.commandSurface = command;
  document.querySelectorAll('.mobile-command').forEach((button) => {
    const active = button.dataset.command === command || button.id === `mobile-${command}-button`;
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
  const handle = document.querySelector('#tray-handle');
  const peek = document.querySelector('#tray-peek');
  const selected = document.querySelector('#tray-selected');
  const list = document.querySelector('#tray-list');
  handle?.setAttribute('aria-expanded', String(next !== 'peek'));
  if (peek) peek.hidden = next !== 'peek';
  if (selected) selected.hidden = next !== 'selected';
  if (list) list.hidden = next !== 'full';
}

function selectedVenue(state = appState()) {
  if (!state?.snapshot?.venues || !state.selectedVenueId) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function syncCalBarNominationAction() {
  const button = document.querySelector('#add-cal-bar-button');
  if (!button) return;
  const label = button.querySelector('strong');
  const copy = button.querySelector('small');
  const iconUse = button.querySelector('.add-action__icon use');
  if (!label || !copy) return;

  if (iconUse) iconUse.setAttribute('href', 'assets/icons.svg#icon-cal-bar');

  const venue = selectedVenue();
  const canNominate = !venue || venue.venue_type === 'community_location';
  button.hidden = !canNominate;

  if (!venue) {
    label.textContent = 'Nominate a Cal Bar';
    copy.textContent = 'Find a Community Location that is a regular Cal gathering place.';
    return;
  }

  label.textContent = 'Nominate as a Cal Bar';
  copy.textContent = 'Think Cal fans gather here regularly? Tell us why it should be recognized.';
}

function syncCorrectionLanguage() {
  const listingUpdate = document.querySelector('#add-report-listing-button');
  if (listingUpdate) listingUpdate.textContent = 'Suggest an Update';
}

function syncListLocationControl() {
  const button = document.querySelector('#clear-search-button');
  if (!button || !isMobile()) return;
  const state = appState();
  const onList = document.body.dataset.commandSurface === 'list';
  button.hidden = !onList;
  if (!onList) return;

  const usingLocation = Boolean(state?.origin);
  button.textContent = usingLocation ? 'All locations' : 'Near me';
  button.setAttribute('aria-label', usingLocation
    ? 'Show all mapped locations'
    : 'Use my location to show nearby locations');
}

function locationSuccess(position, target) {
  const state = appState();
  if (!state) return;

  state.origin = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    label: 'your location'
  };
  state.listQuery = '';
  state.selectedVenueId = '';
  const input = document.querySelector('#location-query');
  if (input) input.value = '';

  const nearby = rankNearbyVenues(state.snapshot, state.gameId, state.origin, NEARBY_RADIUS_MILES);
  if (target === 'list') {
    document.querySelector('#search-surface')?.setAttribute('hidden', '');
    document.querySelector('#add-surface')?.setAttribute('hidden', '');
    setTrayState('full');
    setCommandActive('list');
  } else {
    document.querySelector('#search-surface')?.setAttribute('hidden', '');
    document.querySelector('#add-surface')?.setAttribute('hidden', '');
    setTrayState('peek');
    setCommandActive('map');
  }

  window.CGBApp?.render?.();
  if (target === 'map') requestAnimationFrame(() => window.CGBApp?.focusLocation?.(state.origin, nearby));
  window.CGBApp?.showStatus?.(nearby.length
    ? `Showing ${nearby.length} ${nearby.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles`
    : `No listed locations within ${NEARBY_RADIUS_MILES} miles of your location`);
  syncListLocationControl();
}

function requestLocation(target = 'map') {
  const trigger = target === 'list'
    ? document.querySelector('#clear-search-button')
    : document.querySelector('#near-me-button');
  if (!navigator.geolocation) {
    window.CGBApp?.showStatus?.('Location is not available in this browser');
    return;
  }

  if (trigger) trigger.disabled = true;
  window.CGBApp?.showStatus?.('Finding your location…', 5000);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (trigger) trigger.disabled = false;
      locationSuccess(position, target);
    },
    () => {
      if (trigger) trigger.disabled = false;
      window.CGBApp?.showStatus?.('Location permission was not available');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function showAllLocations() {
  const state = appState();
  if (!state) return;
  state.origin = null;
  state.listQuery = '';
  const input = document.querySelector('#location-query');
  if (input) input.value = '';
  setTrayState('full');
  setCommandActive('list');
  window.CGBApp?.render?.();
  window.CGBApp?.showStatus?.('Showing all mapped locations');
  syncListLocationControl();
}

function handleLocateClick(event) {
  const locate = event.target.closest?.('#near-me-button');
  if (!locate || !isMobile()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  requestLocation('map');
}

function handleListLocationClick(event) {
  const button = event.target.closest?.('#clear-search-button');
  if (!button || !isMobile() || document.body.dataset.commandSurface !== 'list') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (appState()?.origin) showAllLocations();
  else requestLocation('list');
}

function sync() {
  installStyles();
  syncCalBarNominationAction();
  syncCorrectionLanguage();
  syncListLocationControl();
}

function initialize() {
  installStyles();
  document.addEventListener('click', handleLocateClick, { capture: true });
  document.addEventListener('click', handleListLocationClick, { capture: true });
  document.querySelector('#mobile-add-button')?.addEventListener('click', () => requestAnimationFrame(syncCalBarNominationAction));
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', sync);
  window.CGBApp?.subscribe?.('rendered', sync);
  window.CGBApp?.subscribe?.('ready', sync);
  sync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
