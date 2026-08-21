import './issue-121-controller.mjs';
import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import { markerKind } from './core.mjs';
import { createIcon, inlineSpriteIcons } from './icons.mjs';
import { renderPhotoFormEntry } from './photo-form.js';
import { enhanceVenueProfile } from './venue-profile-enhancement.mjs';

let appConnected = false;
let appConnectAttempts = 0;
let detailLocalMap = null;
let detailLocalMapContainer = null;
let detailLocalMapVenueId = '';
const APP_CONNECT_MAX_ATTEMPTS = 1200;
const DETAIL_MAP_STYLE_ID = 'dataviz-v4';
const DETAIL_MAP_ZOOM = 16.0;

function replaceTextWithIcon(element, iconName, className = 'ui-icon') {
  if (!element || element.querySelector('.ui-icon')) return;
  element.replaceChildren(createIcon(iconName, { className }));
}

function prependIcon(element, iconName) {
  if (!element || element.querySelector('.ui-icon')) return;
  element.prepend(createIcon(iconName));
}

function actionIconName(element) {
  const label = element.textContent.trim().toLowerCase();
  if (label === 'directions') return 'directions';
  if (label === 'view details' || label === 'details') return 'details';
  return null;
}

function clarifyShareLabels(root = document) {
  root.querySelectorAll('.action-row').forEach((row) => {
    const share = Array.from(row.querySelectorAll(':scope > button'))
      .find((button) => /^Share(?: Watch Party)?$/i.test(button.textContent.trim()));
    if (!share) return;
    const container = row.parentElement;
    const detail = Boolean(row.closest('#venue-detail'));
    const hasWatchParty = Boolean(container?.querySelector(':scope > .party-module'));
    share.replaceChildren(document.createTextNode(detail ? 'Share' : hasWatchParty ? 'Share Watch Party' : 'Share'));
  });
}

function destroyDetailLocalMap() {
  try { detailLocalMap?.remove?.(); } catch (_) {}
  detailLocalMap = null;
  detailLocalMapContainer = null;
  detailLocalMapVenueId = '';
}

function detailVenue(state) {
  return state?.snapshot?.venues?.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function createDetailLocalMarker(venue, state) {
  const kind = markerKind(state.snapshot, state.gameId, venue);
  const marker = document.createElement('div');
  marker.className = `cgb-marker marker--${kind} is-selected detail-local-map__marker`;
  marker.dataset.kind = kind;
  marker.setAttribute('aria-hidden', 'true');
  const symbol = document.createElement('span');
  symbol.className = kind === 'watch-party' ? 'marker-star' : 'marker-pin';
  symbol.setAttribute('aria-hidden', 'true');
  if (kind === 'watch-party') symbol.textContent = '★';
  marker.append(symbol);
  return marker;
}

function revealDetailLocalMap(container) {
  container?.classList.add('is-ready');
  container?.setAttribute('aria-busy', 'false');
}

function revealPendingDetailViewWhenSettled() {
  const state = window.CGBApp?.getState?.();
  const hero = document.querySelector('#venue-detail > .detail-hero');
  if (!state?.detailMode || !detailVenue(state) || !hero) return;

  const localMap = hero.querySelector(':scope > .detail-local-map');
  if (localMap && !localMap.classList.contains('is-ready')) return;

  const photo = hero.querySelector(':scope > .detail-photo .detail-photo__image');
  if (photo && (!photo.complete || photo.naturalWidth === 0)) {
    if (!photo.dataset.detailReadyListener) {
      photo.dataset.detailReadyListener = 'true';
      photo.addEventListener('load', scheduleUpgrade, { once: true });
    }
    return;
  }

  if (document.body.dataset.detailState === 'pending') {
    document.body.dataset.detailState = 'ready';
  }
  document.querySelector('#detail-view')?.setAttribute('aria-busy', 'false');
}

function syncDetailLocalMap(hero, venue, state) {
  const container = hero?.querySelector('.detail-local-map');
  if (!container) {
    destroyDetailLocalMap();
    return;
  }

  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  if (![latitude, longitude].every(Number.isFinite)) {
    destroyDetailLocalMap();
    return;
  }

  if (detailLocalMap && detailLocalMapContainer === container && detailLocalMapVenueId === venue.venue_id) {
    return;
  }

  destroyDetailLocalMap();
  detailLocalMapContainer = container;
  detailLocalMapVenueId = venue.venue_id;

  if (!window.maplibregl?.Map || !window.maplibregl?.Marker) {
    const fallback = document.createElement('span');
    fallback.className = 'detail-local-map__fallback';
    fallback.textContent = 'Map unavailable';
    container.append(fallback);
    revealDetailLocalMap(container);
    return;
  }

  const key = String(window.CGBApp?.mapTilerKey || '').trim();
  if (!key) {
    revealDetailLocalMap(container);
    return;
  }
  const style = `https://api.maptiler.com/maps/${DETAIL_MAP_STYLE_ID}/style.json?key=${encodeURIComponent(key)}`;
  const map = new window.maplibregl.Map({
    container,
    style,
    center: [longitude, latitude],
    zoom: DETAIL_MAP_ZOOM,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0
  });
  detailLocalMap = map;
  map.on('load', () => {
    if (detailLocalMap !== map || detailLocalMapContainer !== container || detailLocalMapVenueId !== venue.venue_id) return;
    revealDetailLocalMap(container);
    revealPendingDetailViewWhenSettled();
  });
  map.on('error', (event) => console.warn('Detail map error', event?.error || event));
  new window.maplibregl.Marker({
    element: createDetailLocalMarker(venue, state),
    anchor: 'bottom'
  }).setLngLat([longitude, latitude]).addTo(map);
  requestAnimationFrame(() => {
    if (detailLocalMap === map) map.resize?.();
  });
}

export function upgradeRenderedIcons(root = document) {
  inlineSpriteIcons(root);

  root.querySelectorAll('.marker-star').forEach((star) => {
    replaceTextWithIcon(star, 'star', 'ui-icon marker-star__icon');
  });

  root.querySelectorAll('.party-module__title > span').forEach((star) => {
    replaceTextWithIcon(star, 'star');
  });

  root.querySelectorAll('.selected-card__header > .icon-button').forEach((button) => {
    replaceTextWithIcon(button, 'chevron-down');
  });

  clarifyShareLabels(root);
  root.querySelectorAll('.action-row > a, .action-row > button').forEach((action) => {
    const iconName = actionIconName(action);
    if (iconName) prependIcon(action, iconName);
  });

  root.querySelectorAll('.venue-website').forEach((link) => prependIcon(link, 'external'));
}

function runRefinements() {
  const state = window.CGBApp?.getState?.();
  enhanceVenueProfile({ state, documentObject: document, onPhotoError: scheduleUpgrade });
  renderPhotoFormEntry({ app: window.CGBApp, documentObject: document });
  upgradeRenderedIcons();
  const venue = detailVenue(state);
  const hero = document.querySelector('#venue-detail .detail-hero');
  if (!state?.detailMode || !venue || !hero) destroyDetailLocalMap();
  else syncDetailLocalMap(hero, venue, state);
  revealPendingDetailViewWhenSettled();
}

function scheduleUpgrade() {
  requestAnimationFrame(() => {
    runRefinements();
  });
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) {
      window.setTimeout(connectApp, 25);
    }
    return;
  }

  appConnected = true;
  window.CGBApp?.subscribe?.('rendered', scheduleUpgrade);
  window.CGBApp?.subscribe?.('ready', scheduleUpgrade);
  scheduleUpgrade();
}

function initialize() {
  runRefinements();
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
