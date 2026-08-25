import {
  bearCountCopy,
  buildVenueUrl,
  compactVenueLocation,
  markerKind,
  NEARBY_RADIUS_MILES,
  rankVenues,
  TRAY_GUIDANCE_COPY
} from './core.mjs';
import { clearSelectedMapVenue } from './app-state.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const FOCUS_ZOOM = 11;
const SELECTED_DETAIL_SWIPE_THRESHOLD = 48;
const STYLE_ID = 'cgb-map-mobile-refinement';
const MAP_CAMERA_STORAGE_KEY = 'cgb_v2_map_camera';
const VENUE_FOCUS_SUPPRESSION_MS = 900;

let lastAutoFocusedVenueId = '';
let selectedHandlePointer = null;
let suppressSelectedHandleClick = false;
let trayObserver = null;
let trackedMap = null;
let trackedMapMoveEnd = null;
let returnCameraPending = false;
let returnCameraFrame = 0;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sessionGet(key) {
  try { return window.sessionStorage.getItem(key); } catch (_) { return null; }
}

function sessionSet(key, value) {
  try { window.sessionStorage.setItem(key, value); } catch (_) {}
}

function normalizeMapCamera(camera) {
  const lng = Number(camera?.lng);
  const lat = Number(camera?.lat);
  const zoom = Number(camera?.zoom);
  const bearing = Number(camera?.bearing ?? 0);
  const pitch = Number(camera?.pitch ?? 0);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180 ||
      !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(zoom) || zoom < 0 || zoom > 24 ||
      !Number.isFinite(bearing) || !Number.isFinite(pitch)) return null;
  return { lng, lat, zoom, bearing, pitch };
}

function storedMapCamera() {
  const stored = sessionGet(MAP_CAMERA_STORAGE_KEY);
  if (!stored) return null;
  try { return normalizeMapCamera(JSON.parse(stored)); } catch (_) { return null; }
}

function currentMapCamera(map = appState()?.map) {
  if (!map) return null;
  const center = map.getCenter?.();
  return normalizeMapCamera({
    lng: center?.lng,
    lat: center?.lat,
    zoom: map.getZoom?.(),
    bearing: map.getBearing?.(),
    pitch: map.getPitch?.()
  });
}

function captureMapCamera(map = appState()?.map) {
  if (!isMobile()) return null;
  const camera = currentMapCamera(map);
  if (camera) sessionSet(MAP_CAMERA_STORAGE_KEY, JSON.stringify(camera));
  return camera;
}

function restoreStoredMapCamera(map = appState()?.map) {
  const camera = storedMapCamera();
  if (!map || !camera || typeof map.jumpTo !== 'function') return false;
  map.jumpTo({
    center: [camera.lng, camera.lat],
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch
  });
  return true;
}

function attachMapCameraTracking() {
  const map = appState()?.map;
  if (!isMobile() || !map || map === trackedMap) return false;
  try { trackedMap?.off?.('moveend', trackedMapMoveEnd); } catch (_) {}
  trackedMap = map;
  trackedMapMoveEnd = () => captureMapCamera(map);
  map.on?.('moveend', trackedMapMoveEnd);
  return restoreStoredMapCamera(map);
}

function centerCoordinates(center) {
  if (Array.isArray(center)) return [Number(center[0]), Number(center[1])];
  return [Number(center?.lng), Number(center?.lat)];
}

function suppressVenueRecentering(map, venueId) {
  const venue = selectedVenue(venueId);
  const longitude = Number(venue?.longitude);
  const latitude = Number(venue?.latitude);
  const originalEaseTo = map?.easeTo;
  if (!venue || ![longitude, latitude].every(Number.isFinite) || typeof originalEaseTo !== 'function') return false;

  const expiresAt = Date.now() + VENUE_FOCUS_SUPPRESSION_MS;
  const patchedEaseTo = function patchedEaseTo(options = {}, ...args) {
    const [lng, lat] = centerCoordinates(options?.center);
    const targetsSelectedVenue = Number.isFinite(lng) && Number.isFinite(lat) &&
      Math.abs(lng - longitude) < 1e-7 && Math.abs(lat - latitude) < 1e-7;
    const requestedZoom = Number(options?.zoom);
    if (Date.now() <= expiresAt && targetsSelectedVenue &&
        (!Number.isFinite(requestedZoom) || requestedZoom >= FOCUS_ZOOM)) return this;
    return originalEaseTo.call(this, options, ...args);
  };

  map.easeTo = patchedEaseTo;
  window.setTimeout(() => {
    if (map.easeTo === patchedEaseTo) map.easeTo = originalEaseTo;
  }, VENUE_FOCUS_SUPPRESSION_MS + 50);
  return true;
}

function restorePendingReturnCamera(attempt = 0) {
  if (!returnCameraPending) return false;
  const state = appState();
  if (state?.map && storedMapCamera()) {
    attachMapCameraTracking();
    suppressVenueRecentering(state.map, state.selectedVenueId);
    restoreStoredMapCamera(state.map);
    lastAutoFocusedVenueId = state.selectedVenueId || '';
    state.locationFocusVenueId = null;
    returnCameraPending = false;
    returnCameraFrame = 0;
    return true;
  }
  if (attempt >= 10) {
    returnCameraPending = false;
    returnCameraFrame = 0;
    return false;
  }
  returnCameraFrame = requestAnimationFrame(() => restorePendingReturnCamera(attempt + 1));
  return false;
}

function markDetailReturnForCamera(event) {
  const back = event.target.closest?.('#detail-back');
  const state = appState();
  if (!back || !isMobile() || !state?.detailMode || !state.selectedVenueId || !storedMapCamera()) return;
  returnCameraPending = true;
  if (returnCameraFrame) cancelAnimationFrame(returnCameraFrame);
  returnCameraFrame = requestAnimationFrame(() => restorePendingReturnCamera());
}

function captureCameraBeforeVenueNavigation(event) {
  if (!isMobile() || !appState()?.map) return;
  const link = event.target.closest?.('a[href]');
  if (!link) return;
  try {
    const url = new URL(link.href, window.location.href);
    if (!url.searchParams.get('venue')) return;
  } catch (_) {
    return;
  }
  captureMapCamera();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header > .icon-button {
        display: none !important;
      }

      .cgb-marker.is-nearby-preview .marker-pin,
      .cgb-marker.is-nearby-preview .marker-star {
        scale: 1.08;
        filter: drop-shadow(0 0 5px rgba(253,181,21,.78));
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

function nearestNearbyVenue(state) {
  if (!state?.snapshot || !state.gameId || !state.origin) return null;
  return rankVenues(state.snapshot, state.gameId, state.origin).reduce((nearest, candidate) => {
    const distance = Number(candidate.distance);
    if (!Number.isFinite(distance) || distance > NEARBY_RADIUS_MILES) return nearest;
    if (!nearest || distance < Number(nearest.distance)) return candidate;
    return nearest;
  }, null);
}

function previewCandidate(state = appState()) {
  const selected = rankedVenue(state, state?.selectedVenueId);
  if (selected) return { ...selected, mode: 'selected' };
  const nearby = nearestNearbyVenue(state);
  return nearby ? { ...nearby, mode: 'nearby' } : null;
}

function syncNearbyPreviewMarker(candidate) {
  const nearbyVenueId = candidate?.mode === 'nearby' ? candidate.venue?.venue_id : '';
  document.querySelectorAll('.cgb-marker[data-venue-id]').forEach((marker) => {
    marker.classList.toggle('is-nearby-preview', marker.dataset.venueId === nearbyVenueId);
  });
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
  const eyebrow = button?.querySelector('.eyebrow');
  const title = document.querySelector('#tray-summary-title');
  const copy = document.querySelector('#tray-summary-copy');
  const count = document.querySelector('#tray-summary-count');
  const marker = document.querySelector('#tray-summary-marker');
  if (!button || !eyebrow || !title || !copy || !count || !marker) return;

  const candidate = previewCandidate(state);
  syncNearbyPreviewMarker(candidate);
  if (!candidate) {
    const usingLocation = Boolean(state?.origin);
    eyebrow.textContent = usingLocation ? 'Near you' : 'Explore';
    title.textContent = usingLocation ? 'No nearby locations' : 'Find your Cal crowd';
    copy.textContent = usingLocation
      ? `No mapped locations within ${NEARBY_RADIUS_MILES} miles.`
      : TRAY_GUIDANCE_COPY;
    count.textContent = '';
    marker.dataset.kind = 'community-location';
    button.dataset.previewMode = usingLocation ? 'nearby-empty' : 'guidance';
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
  eyebrow.textContent = mode === 'selected' ? 'Selected' : 'Near you';
  title.textContent = venue.name;
  copy.textContent = [type, compactVenueLocation(venue), formatDistance(distance)].filter(Boolean).join(' · ');
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

  card.click();
}

function handleMapDeselect(event) {
  const map = event.target.closest?.('#map');
  if (!map || !isMobile() || document.body.dataset.commandSurface !== 'map') return;
  if (event.target.closest?.('.cgb-marker, .maplibregl-control-container, .maplibregl-ctrl')) return;
  if (!clearSelectedMapVenue()) return;

  lastAutoFocusedVenueId = '';
  window.CGBApp?.render?.();
}

function openSelectedVenueDetail(venueId) {
  const state = appState();
  const venue = selectedVenue(venueId, state);
  const game = state?.snapshot?.games?.find((item) => item.game_id === state?.gameId) || null;
  if (!venue || !game) return false;
  captureMapCamera(state.map);
  window.location.assign(buildVenueUrl(venue.slug, game, window.location.href));
  return true;
}

function trackSelectedHandleSwipe(event) {
  const handle = event.target.closest?.('#tray-handle');
  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!handle || !isMobile() || document.body.dataset.commandSurface !== 'map' ||
      tray?.dataset.state !== 'selected' || !state?.selectedVenueId) {
    selectedHandlePointer = null;
    return;
  }
  captureMapCamera(state.map);
  selectedHandlePointer = {
    pointerId: event.pointerId,
    startY: event.clientY,
    venueId: state.selectedVenueId
  };
}

function handleSelectedHandleSwipe(event) {
  const gesture = selectedHandlePointer;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  selectedHandlePointer = null;

  const delta = event.clientY - gesture.startY;
  if (delta >= -SELECTED_DETAIL_SWIPE_THRESHOLD) return;

  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || document.body.dataset.commandSurface !== 'map' || tray?.dataset.state !== 'selected') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  suppressSelectedHandleClick = true;
  window.setTimeout(() => { suppressSelectedHandleClick = false; }, 0);
  openSelectedVenueDetail(gesture.venueId);
}

function resetSelectedHandleSwipe(event) {
  if (event?.pointerId != null && selectedHandlePointer?.pointerId !== event.pointerId) return;
  selectedHandlePointer = null;
}

function handleTrayTopTap(event) {
  const handle = event.target.closest?.('#tray-handle');
  if (!handle || !isMobile() || document.body.dataset.commandSurface !== 'map') return;
  const tray = document.querySelector('#venue-tray');
  if (!tray || tray.dataset.state !== 'selected') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (suppressSelectedHandleClick) {
    suppressSelectedHandleClick = false;
    return;
  }
  document.querySelector('#tray-selected .selected-card__header > .icon-button')?.click();
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
  const restoredCamera = attachMapCameraTracking();
  updatePreviewIntent();
  requestAnimationFrame(updatePreviewIntent);
  positionAttribution();

  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (isMobile() && document.body.dataset.commandSurface === 'map' && tray?.dataset.state === 'selected') {
    const handle = document.querySelector('#tray-handle');
    handle?.setAttribute('aria-expanded', 'true');
    handle?.setAttribute('aria-label', 'Collapse selected location');
  }

  if (returnCameraPending) {
    restorePendingReturnCamera();
    return;
  }
  if (restoredCamera && state?.selectedVenueId && tray?.dataset.state === 'selected') {
    lastAutoFocusedVenueId = state.selectedVenueId;
    state.locationFocusVenueId = null;
    return;
  }
  if (state?.locationFocusVenueId === state.selectedVenueId) {
    state.locationFocusVenueId = null;
    return;
  }
  if (!isMobile() || document.body.dataset.commandSurface !== 'map' ||
      !state?.selectedVenueId || tray?.dataset.state !== 'selected') return;
  focusVenue(state.selectedVenueId);
}

function initialize() {
  installStyles();
  observeTray();

  document.addEventListener('click', markDetailReturnForCamera, { capture: true });
  document.addEventListener('click', captureCameraBeforeVenueNavigation, { capture: true });
  document.addEventListener('click', openPreviewVenue, { capture: true });
  document.addEventListener('pointerdown', trackSelectedHandleSwipe, { capture: true });
  document.addEventListener('pointerup', handleSelectedHandleSwipe, { capture: true });
  document.addEventListener('pointercancel', resetSelectedHandleSwipe, { capture: true });
  document.addEventListener('click', handleTrayTopTap, { capture: true });
  document.addEventListener('click', handleMapDeselect);

  document.addEventListener('click', (event) => {
    const marker = event.target.closest?.('.cgb-marker[data-venue-id]');
    if (!marker) return;
    lastAutoFocusedVenueId = '';
    requestAnimationFrame(() => focusVenue(marker.dataset.venueId, { force: true }));
  });

  window.addEventListener('pagehide', () => captureMapCamera());
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