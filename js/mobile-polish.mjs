import { rankNearbyVenues } from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const VALID_VIEWS = new Set(['map', 'search', 'add', 'list', 'about']);
const SELECTED_CAMERA_RADIUS_MILES = 25;
const SELECTED_CAMERA_CITY_ZOOM = 11;
const SELECTED_CAMERA_REGIONAL_MAX_ZOOM = 9.75;
const SELECTED_CAMERA_PADDING = { top: 54, right: 42, bottom: 132, left: 42 };
const MAP_ACTION_GAP = 12;
let activeView = 'map';
let openingList = false;
let lastCameraVenueId = null;
let trayResizeObserver = null;
let geometryFrame = null;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function numericText(element) {
  const match = String(element?.textContent || '').match(/\d[\d,]*/);
  return match ? match[0] : '—';
}

function syncStatLayout(element, number, copy) {
  if (isMobile()) {
    element.style.removeProperty('align-items');
    element.style.removeProperty('gap');
    return;
  }

  element.style.alignItems = 'center';
  element.style.gap = '8px';
  number.style.minWidth = '2ch';
  number.style.textAlign = 'right';
  number.style.fontVariantNumeric = 'tabular-nums';
  copy.style.justifyItems = 'start';
  copy.style.textAlign = 'left';
}

function renderStat(element, label, detail) {
  if (!element) return;
  const value = numericText(element);
  const number = document.createElement('span');
  number.className = 'opening-stat__number';
  number.textContent = value;
  const copy = document.createElement('span');
  copy.className = 'opening-stat__copy';
  const main = document.createElement('span');
  main.textContent = label;
  const supporting = document.createElement('small');
  supporting.textContent = detail;
  copy.append(main, supporting);
  syncStatLayout(element, number, copy);
  element.replaceChildren(number, copy);
  element.setAttribute('aria-label', `${value} ${label.toLowerCase()} ${detail.toLowerCase()}`);
}

function updateStatistics() {
  renderStat(document.querySelector('#watch-party-stat'), 'Watch parties', 'for this game');
  renderStat(document.querySelector('#location-stat'), 'Locations', 'on the map');
}

function updateListHeading() {
  if (!isMobile()) return;
  const heading = document.querySelector('#list-heading');
  const eyebrow = document.querySelector('.tray-list__header .eyebrow');
  if (!heading || !eyebrow) return;
  heading.textContent = 'Find your Cal crowd';
  eyebrow.textContent = 'Browse';
}

function normalizeSearchLabels() {
  document.querySelectorAll('.search-result-group--existing .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'CGB locations'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'Places'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__note')
    .forEach((note) => { note.textContent = 'Not yet listed in Cal Golden Bars.'; });
}

function setActiveView(next) {
  if (!isMobile() || !VALID_VIEWS.has(next)) return;
  activeView = next;
  document.body.dataset.commandSurface = next;
}

function visibleSurface() {
  if (!document.querySelector('#search-surface')?.hidden) return 'search';
  if (!document.querySelector('#add-surface')?.hidden) return 'add';
  if (!document.querySelector('#about-surface')?.hidden) return 'about';
  return '';
}

function inferActiveView() {
  const surface = visibleSurface();
  if (surface) return surface;
  return document.querySelector('#venue-tray')?.dataset.state === 'full' ? 'list' : 'map';
}

function syncNavigation() {
  setActiveView(inferActiveView());
}

function selectedVenue(state = appState()) {
  if (!state?.selectedVenueId || !state?.snapshot?.venues) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function selectedVenueCameraPoints(state, venue) {
  const latitude = Number(venue?.latitude);
  const longitude = Number(venue?.longitude);
  if (![latitude, longitude].every(Number.isFinite)) return [];
  const origin = { lat: latitude, lon: longitude };
  const nearby = rankNearbyVenues(
    state.snapshot,
    state.gameId,
    origin,
    SELECTED_CAMERA_RADIUS_MILES
  ).filter(({ venue: candidate }) => candidate.venue_id !== venue.venue_id);

  return [
    [longitude, latitude],
    ...nearby.map(({ venue: candidate }) => [Number(candidate.longitude), Number(candidate.latitude)])
  ].filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
}

function focusSelectedVenue() {
  const state = appState();
  const venueId = state?.selectedVenueId || null;
  if (!venueId) {
    lastCameraVenueId = null;
    return;
  }
  if (!isMobile() || state.detailMode || state.trayState !== 'selected' || !state.map) return;
  if (venueId === lastCameraVenueId) return;

  const venue = selectedVenue(state);
  const points = selectedVenueCameraPoints(state, venue);
  if (!venue || points.length === 0) return;
  lastCameraVenueId = venueId;

  const duration = reducedMotion() ? 0 : 500;
  if (points.length === 1) {
    const currentZoom = Number(state.map.getZoom?.());
    state.map.easeTo({
      center: points[0],
      zoom: Math.max(Number.isFinite(currentZoom) ? currentZoom : 0, SELECTED_CAMERA_CITY_ZOOM),
      duration,
      essential: true
    });
    return;
  }

  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);
  state.map.fitBounds([
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)]
  ], {
    padding: SELECTED_CAMERA_PADDING,
    maxZoom: SELECTED_CAMERA_REGIONAL_MAX_ZOOM,
    duration,
    essential: true
  });
}

function syncMapActionPosition() {
  const actions = document.querySelector('.map-actions');
  if (!actions) return;
  const tray = document.querySelector('#venue-tray');
  const map = document.querySelector('#map');
  const nearMe = document.querySelector('#near-me-button');
  const state = appState();
  const selectedProfileVisible = isMobile() &&
    document.body.dataset.view === 'map' &&
    document.body.dataset.commandSurface === 'map' &&
    state?.trayState === 'selected' &&
    tray?.dataset.state === 'selected' &&
    map && nearMe;

  if (!selectedProfileVisible) {
    actions.style.removeProperty('top');
    return;
  }

  const trayRect = tray.getBoundingClientRect();
  const mapRect = map.getBoundingClientRect();
  const controlHeight = nearMe.getBoundingClientRect().height || 44;
  const toolbarRect = document.querySelector('.map-toolbar')?.getBoundingClientRect();
  const toolbarBottom = toolbarRect && toolbarRect.bottom > mapRect.top && toolbarRect.top < mapRect.bottom
    ? toolbarRect.bottom
    : mapRect.top;
  const minimumTop = Math.max(mapRect.top + MAP_ACTION_GAP, toolbarBottom + MAP_ACTION_GAP);
  const maximumTop = Math.max(minimumTop, mapRect.bottom - controlHeight - MAP_ACTION_GAP);
  const preferredTop = trayRect.top - controlHeight - MAP_ACTION_GAP;
  const top = Math.min(Math.max(preferredTop, minimumTop), maximumTop);
  actions.style.setProperty('top', `${Math.round(top)}px`, 'important');
}

function scheduleMapGeometry() {
  if (geometryFrame !== null) cancelAnimationFrame(geometryFrame);
  geometryFrame = requestAnimationFrame(() => {
    geometryFrame = requestAnimationFrame(() => {
      geometryFrame = null;
      syncMapActionPosition();
    });
  });
}

function observeTrayGeometry() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || typeof ResizeObserver !== 'function') return;
  trayResizeObserver?.disconnect();
  trayResizeObserver = new ResizeObserver(scheduleMapGeometry);
  trayResizeObserver.observe(tray);
}

function openListFromMap(event) {
  if (!isMobile() || activeView !== 'map' || openingList) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openingList = true;
  setActiveView('list');
  document.querySelector('#mobile-list-button')?.click();
  requestAnimationFrame(() => { openingList = false; });
}

function scheduleSync() {
  requestAnimationFrame(() => {
    sync();
    requestAnimationFrame(() => {
      syncNavigation();
      scheduleMapGeometry();
    });
  });
}

function sync() {
  updateStatistics();
  updateListHeading();
  normalizeSearchLabels();
  focusSelectedVenue();
  scheduleMapGeometry();
}

function initializeNavigation() {
  const mapButton = document.querySelector('#mobile-map-button');
  const searchButton = document.querySelector('#mobile-search-button');
  const addButton = document.querySelector('#mobile-add-button');
  const listButton = document.querySelector('#mobile-list-button');
  const aboutButton = document.querySelector('#mobile-about-button');

  mapButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('map')));
  searchButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('search')));
  addButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('add')));
  listButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('list')));
  aboutButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('about')));

  document.querySelector('#browse-locations-button')?.addEventListener('click', openListFromMap, { capture: true });
  const trayHandle = document.querySelector('#tray-handle');
  trayHandle?.addEventListener('pointerup', scheduleSync);
  document.querySelector('#close-list-button')?.addEventListener('click', scheduleSync);
  document.querySelectorAll('[data-command-close]').forEach((button) => {
    button.addEventListener('click', () => requestAnimationFrame(() => setActiveView('map')));
  });
}

function initialize() {
  initializeNavigation();
  observeTrayGeometry();
  document.querySelector('#location-query')?.addEventListener('input', () => requestAnimationFrame(normalizeSearchLabels));
  document.querySelector('#location-search')?.addEventListener('submit', () => requestAnimationFrame(normalizeSearchLabels));

  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', scheduleSync);
  window.addEventListener('resize', scheduleMapGeometry);
  window.visualViewport?.addEventListener?.('resize', scheduleMapGeometry);
  sync();
  syncNavigation();
  window.CGBApp?.subscribe?.('rendered', () => {
    sync();
    syncNavigation();
  });
  window.CGBApp?.subscribe?.('ready', () => {
    sync();
    syncNavigation();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
