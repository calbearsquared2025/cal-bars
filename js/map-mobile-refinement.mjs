import {
  bearCountCopy,
  markerKind,
  rankVenues
} from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const FOCUS_ZOOM = 11;
const STYLE_ID = 'cgb-map-mobile-refinement';

let lastAutoFocusedVenueId = '';
let lastSelectedVenueId = '';
let selectedTrayExpanded = true;
let trayObserver = null;

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
      .maplibregl-ctrl-top-right {
        display: none !important;
      }

      .maplibregl-ctrl-bottom-right {
        right: auto !important;
        left: 8px !important;
        max-width: calc(100vw - 86px) !important;
      }

      .maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib {
        max-width: calc(100vw - 86px) !important;
        font-size: 10px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek {
        position: absolute !important;
        z-index: 46 !important;
        inset: auto 0 0 0 !important;
        width: 100% !important;
        max-width: none !important;
        height: 92px !important;
        margin: 0 !important;
        background: var(--cgb-white, #fff) !important;
        border: 0 !important;
        border-radius: 22px 22px 0 0 !important;
        box-shadow: 0 -12px 30px rgba(1, 1, 51, .2) !important;
        overflow: hidden !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle {
        height: 18px !important;
        background: var(--cgb-white, #fff) !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span {
        width: 34px !important;
        height: 4px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 0 10px 7px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 66px !important;
        grid-template-columns: 26px minmax(0, 1fr) auto 16px !important;
        gap: 9px !important;
        padding: 2px 12px 7px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__marker {
        width: 20px !important;
        height: 20px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy strong {
        font-size: .96rem !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy small {
        font-size: .64rem !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header > .icon-button {
        display: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] {
        height: 170px !important;
        max-height: 170px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .tray-selected {
        max-height: 146px !important;
        overflow: hidden !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card {
        gap: 7px !important;
        padding-bottom: 12px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .venue-description,
      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .party-module,
      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .action-row {
        display: none !important;
      }
    }
  `;
  document.head.append(style);
}

function removeZoomControls() {
  document.querySelectorAll('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out').forEach((button) => {
    const group = button.closest('.maplibregl-ctrl-group');
    button.remove();
    if (group && !group.querySelector('button')) group.remove();
  });
}

function selectedVenue(venueId, state = appState()) {
  return state?.snapshot?.venues?.find((venue) => venue.venue_id === venueId) || null;
}

function rankedVenue(state, venueId) {
  if (!state?.snapshot || !state.gameId || !venueId) return null;
  return rankVenues(state.snapshot, state.gameId, state.origin)
    .find(({ venue }) => venue.venue_id === venueId) || null;
}

function previewCandidate(state = appState()) {
  const selected = rankedVenue(state, state?.selectedVenueId);
  return selected ? { ...selected, mode: 'selected' } : null;
}

function previewVenueCard(venueId = '') {
  const cards = Array.from(document.querySelectorAll('#location-list .location-card[data-venue-id]'));
  return cards.find((card) => card.dataset.venueId === venueId) || null;
}

function formatDistance(distance) {
  const value = Number(distance);
  if (!Number.isFinite(value)) return '';
  if (value < 0.1) return '<0.1 mi';
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} mi`;
}

function updatePreviewIntent() {
  const state = appState();
  const button = document.querySelector('#browse-locations-button');
  const title = document.querySelector('#tray-summary-title');
  const copy = document.querySelector('#tray-summary-copy');
  const count = document.querySelector('#tray-summary-count');
  const marker = document.querySelector('#tray-summary-marker');
  if (!button || !title || !copy || !count || !marker) return;

  const candidate = previewCandidate(state);
  if (!candidate) {
    title.textContent = 'Find your Cal crowd';
    copy.textContent = 'Watch Parties first, then Cal Bars and Community Locations.';
    count.textContent = '';
    marker.dataset.kind = 'community-location';
    button.dataset.previewMode = 'guidance';
    button.removeAttribute('data-direct-venue-id');
    button.setAttribute('aria-label', 'Open the location list');
    return;
  }

  const { venue, party, fanCount, distance, mode } = candidate;
  const type = party
    ? 'Watch Party'
    : venue.venue_type === 'cal_bar'
      ? 'Cal Bar'
      : 'Community Location';
  const context = mode === 'selected' ? 'Selected' : 'Nearby';
  title.textContent = venue.name;
  copy.textContent = [context, type, formatDistance(distance)].filter(Boolean).join(' · ');
  count.textContent = Number(fanCount) > 0 ? bearCountCopy(fanCount) : '';
  marker.dataset.kind = markerKind(state.snapshot, state.gameId, venue);
  button.dataset.previewMode = mode;
  button.dataset.directVenueId = venue.venue_id;
  button.setAttribute('aria-label', `Open ${venue.name}`);
}

function openPreviewVenue(event) {
  const button = event.target.closest?.('#browse-locations-button');
  if (!button || !isMobile() || !button.dataset.directVenueId) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const card = previewVenueCard(button.dataset.directVenueId);
  if (!card) return;

  selectedTrayExpanded = true;
  lastSelectedVenueId = '';
  card.click();
}

function setSelectedTrayDensity(expanded) {
  const tray = document.querySelector('#venue-tray.tray--selected');
  if (!tray) return;
  selectedTrayExpanded = expanded;
  tray.dataset.selectedDensity = expanded ? 'expanded' : 'compact';
  const handle = document.querySelector('#tray-handle');
  handle?.setAttribute('aria-expanded', String(expanded));
  handle?.setAttribute('aria-label', expanded
    ? 'Collapse selected location'
    : 'Expand selected location');
  requestAnimationFrame(positionAttribution);
}

function syncSelectedTrayDensity() {
  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || tray?.dataset.state !== 'selected' || !state?.selectedVenueId) {
    tray?.removeAttribute('data-selected-density');
    return;
  }

  if (document.body.dataset.commandSurface === 'search') {
    setSelectedTrayDensity(false);
    return;
  }

  if (state.selectedVenueId !== lastSelectedVenueId) {
    lastSelectedVenueId = state.selectedVenueId;
    selectedTrayExpanded = true;
  }
  setSelectedTrayDensity(selectedTrayExpanded);
}

function handleTrayTopTap(event) {
  const handle = event.target.closest?.('#tray-handle');
  if (!handle || !isMobile() || document.body.dataset.commandSurface !== 'map') return;
  const tray = document.querySelector('#venue-tray');
  if (!tray || tray.dataset.state !== 'selected') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  setSelectedTrayDensity(!selectedTrayExpanded);
}

function focusVenue(venueId, { force = false } = {}) {
  if (!isMobile()) return;
  const state = appState();
  const venue = selectedVenue(venueId, state);
  if (!state?.map || !venue) return;
  if (!force && lastAutoFocusedVenueId === venueId) return;
  lastAutoFocusedVenueId = venueId;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const tray = document.querySelector('#venue-tray.tray--selected');
      const trayHeight = tray && getComputedStyle(tray).display !== 'none'
        ? tray.getBoundingClientRect().height
        : 0;
      const verticalOffset = -Math.min(170, Math.max(82, trayHeight * .34));
      const currentZoom = Number(state.map.getZoom?.()) || 0;
      state.map.easeTo({
        center: [Number(venue.longitude), Number(venue.latitude)],
        zoom: Math.max(currentZoom, FOCUS_ZOOM),
        offset: [0, verticalOffset],
        duration: reducedMotion() ? 0 : 420,
        essential: true
      });
    });
  });
}

function positionAttribution() {
  if (!isMobile()) return;
  const map = document.querySelector('#map');
  const tray = document.querySelector('#venue-tray');
  const attribution = document.querySelector('.maplibregl-ctrl-bottom-right');
  if (!map || !tray || !attribution) return;

  if (document.body.dataset.commandSurface !== 'map') {
    attribution.style.display = 'none';
    return;
  }
  attribution.style.display = '';

  const mapRect = map.getBoundingClientRect();
  const trayRect = tray.getBoundingClientRect();
  const trayVisible = getComputedStyle(tray).display !== 'none' && trayRect.top < mapRect.bottom;
  const overlap = trayVisible ? Math.max(0, mapRect.bottom - trayRect.top) : 0;
  attribution.style.bottom = `${Math.round(overlap + 6)}px`;
  attribution.style.left = '8px';
  attribution.style.right = 'auto';
}

function observeTray() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || typeof ResizeObserver !== 'function') return;
  trayObserver?.disconnect();
  trayObserver = new ResizeObserver(() => requestAnimationFrame(positionAttribution));
  trayObserver.observe(tray);
}

function sync() {
  installStyles();
  removeZoomControls();
  updatePreviewIntent();
  requestAnimationFrame(updatePreviewIntent);
  syncSelectedTrayDensity();
  positionAttribution();

  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || document.body.dataset.commandSurface !== 'map' ||
      !state?.selectedVenueId || tray?.dataset.state !== 'selected') return;
  focusVenue(state.selectedVenueId);
}

function initialize() {
  installStyles();
  observeTray();

  document.addEventListener('click', openPreviewVenue, { capture: true });
  document.addEventListener('click', handleTrayTopTap, { capture: true });

  document.addEventListener('click', (event) => {
    const marker = event.target.closest?.('.cgb-marker[data-venue-id]');
    if (!marker) return;
    selectedTrayExpanded = true;
    lastSelectedVenueId = '';
    lastAutoFocusedVenueId = '';
    requestAnimationFrame(() => focusVenue(marker.dataset.venueId, { force: true }));
  });

  window.addEventListener('resize', () => requestAnimationFrame(positionAttribution));
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
