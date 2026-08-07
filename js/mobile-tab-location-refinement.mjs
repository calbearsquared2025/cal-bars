import {
  formatKickoff,
  gameTitle,
  NEARBY_RADIUS_MILES,
  rankNearbyVenues
} from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-tab-location-refinement';
const MAP_MAX_ZOOM = 11;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      /* Search, Add, and List are opaque tab surfaces; the map never shows through. */
      body[data-command-surface="search"] #map,
      body[data-command-surface="add"] #map,
      body[data-command-surface="list"] #map {
        visibility: hidden !important;
      }

      body[data-command-surface="search"] #map-view,
      body[data-command-surface="add"] #map-view,
      body[data-command-surface="list"] #map-view {
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="search"] .command-surface:not([hidden]),
      body[data-command-surface="add"] .command-surface:not([hidden]) {
        z-index: 47 !important;
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="search"] .command-surface__shell,
      body[data-command-surface="add"] .command-surface__shell {
        padding-top: 48px !important;
      }

      body[data-command-surface="search"] #map-view > #venue-tray,
      body[data-command-surface="add"] #map-view > #venue-tray {
        display: none !important;
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full {
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
      }

      body[data-command-surface="list"] .tray-list__header {
        padding-top: 46px !important;
      }

      /* Restore the compact Nearby sheet language used by the earlier map pass. */
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek {
        height: 96px !important;
        border-radius: 22px 22px 0 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle {
        height: 18px !important;
        display: grid !important;
        background: var(--cgb-white) !important;
        pointer-events: auto !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span {
        width: 34px !important;
        height: 4px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 0 10px 7px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 70px !important;
        grid-template-columns: 26px minmax(0, 1fr) auto !important;
        gap: 9px !important;
        padding: 2px 12px 8px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__chevron {
        display: none !important;
      }

      .add-game-context {
        display: grid !important;
      }

      body[data-command-surface="list"] #clear-search-button {
        display: inline-flex !important;
        align-items: center;
        min-height: 36px;
        padding: 0 8px;
        white-space: nowrap;
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

function selectedGame(state = appState()) {
  return state?.snapshot?.games?.find((game) => game.game_id === state.gameId) || null;
}

function syncAddGameContext() {
  const addSurface = document.querySelector('#add-surface .command-surface__shell');
  const placeContext = document.querySelector('#add-surface .add-context:not(.add-game-context)');
  if (!addSurface || !placeContext) return;

  let context = document.querySelector('#add-game-context');
  if (!context) {
    context = document.createElement('section');
    context.id = 'add-game-context';
    context.className = 'add-context add-game-context';
    context.setAttribute('aria-live', 'polite');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Current game';
    const name = document.createElement('strong');
    name.id = 'add-game-context-name';
    const copy = document.createElement('p');
    copy.id = 'add-game-context-copy';
    context.append(eyebrow, name, copy);
    placeContext.before(context);
  }

  const game = selectedGame();
  const name = context.querySelector('#add-game-context-name');
  const copy = context.querySelector('#add-game-context-copy');
  if (name) name.textContent = gameTitle(game);
  if (copy) copy.textContent = formatKickoff(game);
}

function syncListLocationControl() {
  const button = document.querySelector('#clear-search-button');
  if (!button) return;
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

function fitMapToLocation(origin, nearby) {
  const state = appState();
  if (!state?.map || !origin) return;
  const points = [
    [Number(origin.lon), Number(origin.lat)],
    ...nearby.slice(0, 2).map(({ venue }) => [Number(venue.longitude), Number(venue.latitude)])
  ].filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

  if (points.length > 1) {
    const lons = points.map(([lon]) => lon);
    const lats = points.map(([, lat]) => lat);
    state.map.fitBounds([
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)]
    ], {
      padding: { top: 72, right: 54, bottom: 148, left: 54 },
      maxZoom: MAP_MAX_ZOOM,
      duration: reducedMotion() ? 0 : 520,
      essential: true
    });
    return;
  }

  state.map.easeTo({
    center: [Number(origin.lon), Number(origin.lat)],
    zoom: 10,
    duration: reducedMotion() ? 0 : 500,
    essential: true
  });
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
  if (target === 'map') requestAnimationFrame(() => fitMapToLocation(state.origin, nearby));
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

function disablePeekHandleNavigation(event) {
  const handle = event.target.closest?.('#tray-handle');
  const tray = document.querySelector('#venue-tray');
  if (!handle || !isMobile() || document.body.dataset.commandSurface !== 'map' || tray?.dataset.state !== 'peek') return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function sync() {
  installStyles();
  syncAddGameContext();
  syncListLocationControl();
}

function initialize() {
  installStyles();
  document.addEventListener('click', handleLocateClick, { capture: true });
  document.addEventListener('click', handleListLocationClick, { capture: true });
  document.addEventListener('click', disablePeekHandleNavigation, { capture: true });
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
