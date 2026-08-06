import {
  bearCountCopy,
  markerKind,
  NEARBY_RADIUS_MILES,
  rankNearbyVenues,
  rankVenues
} from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const FOCUS_ZOOM = 11;
const STYLE_ID = 'cgb-map-mobile-refinement';
const TRAY_GESTURE_THRESHOLD = 48;

let lastAutoFocusedVenueId = '';
let lastSelectedVenueId = '';
let selectedTrayExpanded = false;
let trayObserver = null;
let statisticsHome = null;
let selectedTrayGesture = null;
let suppressSelectedTrayClick = false;

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
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
  }
  style.textContent = `
    @media (max-width: 899px) {
      body[data-command-surface="map"] #map-view {
        position: relative;
      }

      body[data-command-surface="map"] #map-view > .opening-stat {
        position: absolute;
        z-index: 44;
        top: 12px;
        right: max(var(--mobile-content-gutter), env(safe-area-inset-right, 0px));
        bottom: auto;
        left: max(var(--mobile-content-gutter), env(safe-area-inset-left, 0px));
        width: auto;
        height: 58px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow: hidden;
        background: rgba(255, 255, 255, .94);
        border: 1px solid rgba(1, 1, 51, .1);
        border-radius: 14px;
        box-shadow: 0 8px 22px rgba(1, 1, 51, .13);
        backdrop-filter: blur(10px);
        pointer-events: none;
      }

      body:not([data-command-surface="map"]) #map-view > .opening-stat,
      body[data-view="detail"] #map-view > .opening-stat {
        display: none;
      }

      #map-view > .opening-stat .opening-stat__item {
        min-width: 0;
        padding: 6px 10px;
      }

      #map-view > .opening-stat .opening-stat__item + .opening-stat__item {
        border-left: 1px solid rgba(1, 1, 51, .1);
      }

      #map-view > .opening-stat strong {
        height: 100%;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        text-align: left;
      }

      #map-view > .opening-stat .opening-stat__number {
        font-family: var(--font-condensed);
        font-size: clamp(2.25rem, 10vw, 2.75rem);
        font-weight: 800;
        letter-spacing: -.035em;
        line-height: .85;
      }

      #map-view > .opening-stat .opening-stat__copy {
        font-family: var(--font-condensed);
        font-size: .64rem;
        font-weight: 800;
        letter-spacing: .055em;
        line-height: 1.04;
        text-transform: uppercase;
      }

      #map-view > .opening-stat .opening-stat__copy small {
        font-size: .54rem;
        font-weight: 650;
        letter-spacing: .025em;
      }

      .map-actions {
        top: calc(50% - 22px);
        right: max(12px, env(safe-area-inset-right, 0px));
        gap: 8px;
      }

      .map-actions #near-me-button,
      .map-actions #fullscreen-button,
      .maplibregl-ctrl button {
        min-height: 44px;
        min-width: 44px;
        color: var(--cgb-navy-950);
        background: rgba(255, 255, 255, .96);
        border: 1px solid var(--cgb-neutral-300);
        border-radius: 12px;
        box-shadow: 0 6px 18px rgba(1, 1, 51, .14);
      }

      .map-actions #near-me-button,
      .map-actions #fullscreen-button {
        padding: 0 11px;
      }

      .maplibregl-ctrl-top-right {
        display: none;
      }

      .maplibregl-ctrl-bottom-right {
        right: auto;
        left: 12px;
        max-width: calc(100vw - 96px);
      }

      .maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib {
        max-width: calc(100vw - 96px);
        font-size: 10px;
      }

      #map-view > #venue-tray.venue-tray.tray--peek {
        position: absolute;
        z-index: 46;
        inset: auto 0 0 0;
        width: 100%;
        max-width: none;
        height: 88px;
        margin: 0;
        background: var(--cgb-white);
        border: 0;
        border-radius: 18px 18px 0 0;
        box-shadow: 0 -8px 24px rgba(1, 1, 51, .14);
        overflow: hidden;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle {
        height: 18px;
        display: grid;
        background: var(--cgb-white);
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span {
        width: 34px;
        height: 3px;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 0;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 70px;
        grid-template-columns: 24px minmax(0, 1fr) auto 16px;
        gap: 9px;
        padding: 2px var(--mobile-content-gutter) 8px;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy strong {
        font-size: 1rem;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy small {
        font-size: .68rem;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected {
        max-height: min(58dvh, 486px);
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle {
        height: 24px;
        cursor: ns-resize;
        touch-action: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle span {
        width: 40px;
        height: 4px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] {
        height: 148px;
        max-height: 148px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .tray-selected {
        max-height: 124px;
        overflow: hidden;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="expanded"] {
        height: auto;
        max-height: min(58dvh, 486px);
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="expanded"] .tray-selected {
        max-height: calc(min(58dvh, 486px) - 24px);
        overflow-y: auto;
        overscroll-behavior: contain;
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
  if (selected) return { ...selected, mode: 'selected' };
  if (!state?.origin || !state?.snapshot || !state.gameId) return null;
  const nearest = rankNearbyVenues(
    state.snapshot,
    state.gameId,
    state.origin,
    NEARBY_RADIUS_MILES
  )[0] || null;
  return nearest ? { ...nearest, mode: 'nearby' } : null;
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
    copy.textContent = 'Tap a map pin or use Locate Me to find the nearest Cal gathering.';
    count.textContent = '';
    marker.dataset.kind = 'community-location';
    button.dataset.previewMode = 'guidance';
    button.removeAttribute('data-direct-venue-id');
    button.setAttribute('aria-label', 'Tap a map pin or use Locate Me to find the nearest Cal gathering');
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

function schedulePreviewUpdate() {
  updatePreviewIntent();
  requestAnimationFrame(() => {
    updatePreviewIntent();
    requestAnimationFrame(updatePreviewIntent);
  });
}

function openPreviewVenue(event) {
  const button = event.target.closest?.('#browse-locations-button');
  if (!button || !isMobile()) return false;
  if (!button.dataset.directVenueId) return false;

  const card = previewVenueCard(button.dataset.directVenueId);
  if (!card) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  selectedTrayExpanded = false;
  lastSelectedVenueId = '';
  card.click();
  return true;
}

function setSelectedTrayDensity(expanded, { refocus = true } = {}) {
  const tray = document.querySelector('#venue-tray.tray--selected');
  if (!tray) return;
  selectedTrayExpanded = expanded;
  tray.dataset.selectedDensity = expanded ? 'expanded' : 'compact';
  const handle = document.querySelector('#tray-handle');
  handle?.setAttribute('aria-expanded', String(expanded));
  handle?.setAttribute('aria-label', expanded
    ? 'Collapse selected location'
    : 'Expand selected location');
  requestAnimationFrame(() => {
    positionAttribution();
    if (refocus) focusVenue(appState()?.selectedVenueId || '', { force: true });
  });
}

function syncSelectedTrayDensity() {
  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || tray?.dataset.state !== 'selected' || !state?.selectedVenueId) {
    tray?.removeAttribute('data-selected-density');
    return;
  }

  if (state.selectedVenueId !== lastSelectedVenueId) {
    lastSelectedVenueId = state.selectedVenueId;
    selectedTrayExpanded = false;
  }
  setSelectedTrayDensity(selectedTrayExpanded, { refocus: false });
}

function selectedTray() {
  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || document.body.dataset.commandSurface !== 'map' || tray?.dataset.state !== 'selected') {
    return null;
  }
  return tray;
}

function beginSelectedTrayGesture(event) {
  const handle = event.target.closest?.('#tray-handle');
  if (!handle || !selectedTray()) return;
  selectedTrayGesture = { pointerId: event.pointerId, startY: event.clientY, handle };
  handle.setPointerCapture?.(event.pointerId);
  event.stopImmediatePropagation();
}

function finishSelectedTrayGesture(event) {
  if (!selectedTrayGesture || event.pointerId !== selectedTrayGesture.pointerId) return;
  const { startY, handle } = selectedTrayGesture;
  selectedTrayGesture = null;
  handle.releasePointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopImmediatePropagation();

  const delta = event.clientY - startY;
  if (Math.abs(delta) < TRAY_GESTURE_THRESHOLD) return;
  suppressSelectedTrayClick = true;
  window.setTimeout(() => { suppressSelectedTrayClick = false; }, 0);
  if (delta < 0 && !selectedTrayExpanded) setSelectedTrayDensity(true);
  if (delta > 0 && selectedTrayExpanded) setSelectedTrayDensity(false);
}

function cancelSelectedTrayGesture(event) {
  if (!selectedTrayGesture || event.pointerId !== selectedTrayGesture.pointerId) return;
  selectedTrayGesture = null;
  event.stopImmediatePropagation();
}

function handleSelectedTrayClick(event) {
  const tray = selectedTray();
  if (!tray) return false;

  const handle = event.target.closest?.('#tray-handle');
  if (handle) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (suppressSelectedTrayClick) {
      suppressSelectedTrayClick = false;
      return true;
    }
    setSelectedTrayDensity(!selectedTrayExpanded);
    return true;
  }

  const card = event.target.closest?.('.selected-card');
  if (!card || selectedTrayExpanded) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  setSelectedTrayDensity(true);
  return true;
}

function syncStatisticsPlacement() {
  const statistics = document.querySelector('.opening-stat');
  const mapView = document.querySelector('#map-view');
  if (!statistics || !mapView) return;

  if (!statisticsHome) {
    statisticsHome = {
      parent: statistics.parentElement,
      nextSibling: statistics.nextSibling
    };
  }

  if (isMobile()) {
    if (statistics.parentElement !== mapView) mapView.prepend(statistics);
    statistics.hidden = document.body.dataset.commandSurface !== 'map' ||
      document.body.dataset.view === 'detail';
    return;
  }

  if (statisticsHome.parent && statistics.parentElement !== statisticsHome.parent) {
    statisticsHome.parent.insertBefore(statistics, statisticsHome.nextSibling);
  }
  statistics.hidden = false;
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
      const verticalOffset = -Math.min(208, Math.max(82, trayHeight * .46));
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
  attribution.style.left = '12px';
  attribution.style.right = 'auto';
}

function observeTray() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || typeof ResizeObserver !== 'function') return;
  trayObserver?.disconnect();
  trayObserver = new ResizeObserver(() => requestAnimationFrame(positionAttribution));
  trayObserver.observe(tray);
}

function handleDocumentClick(event) {
  if (handleSelectedTrayClick(event)) return;
  if (event.target.closest?.('#browse-locations-button') && openPreviewVenue(event)) return;

  const marker = event.target.closest?.('.cgb-marker[data-venue-id]');
  if (!marker) return;
  selectedTrayExpanded = false;
  lastSelectedVenueId = '';
  lastAutoFocusedVenueId = '';
  requestAnimationFrame(() => focusVenue(marker.dataset.venueId, { force: true }));
}

function sync() {
  installStyles();
  removeZoomControls();
  syncStatisticsPlacement();
  schedulePreviewUpdate();
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

  document.addEventListener('pointerdown', beginSelectedTrayGesture, { capture: true });
  document.addEventListener('pointerup', finishSelectedTrayGesture, { capture: true });
  document.addEventListener('pointercancel', cancelSelectedTrayGesture, { capture: true });
  document.addEventListener('click', handleDocumentClick, { capture: true });
  window.addEventListener('resize', () => requestAnimationFrame(sync));
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
