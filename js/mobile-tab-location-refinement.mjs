import {
  NEARBY_RADIUS_MILES,
  rankNearbyVenues
} from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-tab-location-refinement';
let rememberedLocation = null;
let locationFilterSuppressed = false;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function userLocation(origin = appState()?.origin) {
  const lat = Number(origin?.lat);
  const lon = Number(origin?.lon);
  if (origin?.label !== 'your location' || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: 'your location' };
}

function rememberActiveLocation() {
  const location = userLocation();
  if (!location) return rememberedLocation;
  rememberedLocation = location;
  locationFilterSuppressed = false;
  return rememberedLocation;
}

function setNearMeLabel(label) {
  const button = document.querySelector('#near-me-button');
  if (!button) return;
  const textNode = Array.from(button.childNodes)
    .find((node) => node.nodeType === 3 && node.textContent.trim());
  if (textNode) textNode.textContent = ` ${label}`;
  else button.append(document.createTextNode(` ${label}`));
  button.setAttribute('aria-label', label === 'Show nearby'
    ? 'Show nearby locations using your saved location'
    : 'Use my location to show nearby locations');
}

function syncNearMeControl() {
  rememberActiveLocation();
  setNearMeLabel(locationFilterSuppressed && rememberedLocation ? 'Show nearby' : 'Near me');
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

      /* All destination headers use the same optional-action grid. Search/Add simply
         have no action in column two; List places its dedicated location action there. */
      .mobile-destination-header {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }

      body[data-command-surface="list"] .list-location-action {
        align-self: end;
        justify-self: end;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 0 0 -5px 12px;
        padding: 7px 0 7px 10px;
        color: var(--cgb-navy-900);
        background: transparent;
        border: 0;
        border-radius: 0;
        font-family: var(--font-condensed, sans-serif);
        font-size: .72rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
        box-shadow: none;
      }

      body[data-command-surface="list"] .list-location-action .ui-icon {
        width: 15px;
        height: 15px;
        flex: 0 0 auto;
      }

      body[data-command-surface="list"] .list-location-action:hover,
      body[data-command-surface="list"] .list-location-action:focus-visible {
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }

      body[data-command-surface="list"] .list-location-action:focus-visible {
        outline: 2px solid var(--cgb-gold-400);
        outline-offset: 2px;
      }

      /* Desktop retains the legacy tray controls; mobile List uses the dedicated
         header action and should not reserve a toolbar band below the title. */
      body[data-command-surface="list"] .tray-list__toolbar {
        display: none !important;
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

function ensureListLocationControl() {
  let button = document.querySelector('#list-location-button');
  if (button) return button;

  const header = document.querySelector('#tray-list .tray-list__header');
  if (!header) return null;

  button = document.createElement('button');
  button.id = 'list-location-button';
  button.className = 'list-location-action';
  button.type = 'button';
  button.hidden = true;

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'ui-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  icon.append(use);

  const label = document.createElement('span');
  label.className = 'list-location-action__label';
  button.append(icon, label);
  header.append(button);
  return button;
}

function syncListLocationControl() {
  const button = ensureListLocationControl();
  if (!button) return;

  const onList = isMobile() && document.body.dataset.commandSurface === 'list';
  button.hidden = !onList;
  if (!onList) return;

  const usingLocation = Boolean(appState()?.origin);
  const canRestoreNearby = !usingLocation && locationFilterSuppressed && Boolean(rememberedLocation);
  const label = button.querySelector('.list-location-action__label');
  const iconUse = button.querySelector('use');
  if (label) label.textContent = usingLocation ? 'All locations' : canRestoreNearby ? 'Show nearby' : 'Near me';
  if (iconUse) iconUse.setAttribute('href', usingLocation
    ? 'assets/icons.svg#icon-map'
    : 'assets/icons.svg#icon-near-me');
  button.setAttribute('aria-label', usingLocation
    ? 'Show all mapped locations'
    : canRestoreNearby
      ? 'Show nearby locations using your saved location'
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
  rememberedLocation = userLocation(state.origin);
  locationFilterSuppressed = false;
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
  syncNearMeControl();
  syncListLocationControl();
}

function requestLocation(target = 'map') {
  const trigger = target === 'list'
    ? document.querySelector('#list-location-button')
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
  const activeUserLocation = userLocation(state.origin);
  if (activeUserLocation) rememberedLocation = activeUserLocation;
  locationFilterSuppressed = Boolean(rememberedLocation && activeUserLocation);
  state.origin = null;
  state.listQuery = '';
  const input = document.querySelector('#location-query');
  if (input) input.value = '';
  if (isMobile()) {
    setTrayState('full');
    setCommandActive('list');
  } else {
    state.trayState = 'full';
  }
  window.CGBApp?.render?.();
  window.CGBApp?.showStatus?.(locationFilterSuppressed
    ? 'Showing all mapped locations. Your location is saved for Nearby.'
    : 'Showing all mapped locations');
  syncNearMeControl();
  syncListLocationControl();
}

function showNearbyLocations(target = 'list') {
  const state = appState();
  if (!state || !rememberedLocation) return false;
  state.origin = { ...rememberedLocation };
  state.listQuery = '';
  locationFilterSuppressed = false;
  const input = document.querySelector('#location-query');
  if (input) input.value = '';
  const nearby = rankNearbyVenues(state.snapshot, state.gameId, state.origin, NEARBY_RADIUS_MILES);
  if (isMobile()) {
    if (target === 'list') {
      setTrayState('full');
      setCommandActive('list');
    } else {
      setTrayState('peek');
      setCommandActive('map');
    }
  } else {
    state.trayState = 'full';
  }
  window.CGBApp?.render?.();
  if (!isMobile() || target === 'map') {
    requestAnimationFrame(() => window.CGBApp?.focusLocation?.(state.origin, nearby));
  }
  window.CGBApp?.showStatus?.(nearby.length
    ? `Showing ${nearby.length} ${nearby.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles using your saved location`
    : `No listed locations within ${NEARBY_RADIUS_MILES} miles of your saved location`);
  syncNearMeControl();
  syncListLocationControl();
  return true;
}

function handleLocateClick(event) {
  const locate = event.target.closest?.('#near-me-button');
  if (!locate) return;
  if (locationFilterSuppressed && rememberedLocation) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showNearbyLocations(isMobile() ? 'map' : 'list');
    return;
  }
  if (!isMobile()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  requestLocation('map');
}

function handleListLocationClick(event) {
  const button = event.target.closest?.('#list-location-button');
  if (!button || !isMobile() || document.body.dataset.commandSurface !== 'list') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (appState()?.origin) showAllLocations();
  else if (locationFilterSuppressed && rememberedLocation) showNearbyLocations('list');
  else requestLocation('list');
}

function handleDesktopClearSearchClick(event) {
  const button = event.target.closest?.('#clear-search-button');
  if (!button || isMobile() || !userLocation(appState()?.origin)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showAllLocations();
}

function sync() {
  installStyles();
  syncCalBarNominationAction();
  syncCorrectionLanguage();
  syncNearMeControl();
  syncListLocationControl();
}

function initialize() {
  installStyles();
  ensureListLocationControl();
  document.addEventListener('click', handleLocateClick, { capture: true });
  document.addEventListener('click', handleListLocationClick, { capture: true });
  document.addEventListener('click', handleDesktopClearSearchClick, { capture: true });
  document.querySelector('#mobile-list-button')?.addEventListener('click', () => requestAnimationFrame(syncListLocationControl));
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
