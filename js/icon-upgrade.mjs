import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import { markerKind } from './core.mjs';
import { createIcon, inlineSpriteIcons } from './icons.mjs';

let appConnected = false;
let appConnectAttempts = 0;
let detailLocalMap = null;
let detailLocalMapContainer = null;
let detailLocalMapVenueId = '';
const APP_CONNECT_MAX_ATTEMPTS = 1200;
const DETAIL_MAP_STYLE_ID = '019997ef-99cb-7052-b842-98cc3dbf3d7c';
const DETAIL_MAP_ZOOM = 17;

function replaceTextWithIcon(element, iconName, className = 'ui-icon') {
  if (!element || element.querySelector('.ui-icon')) return;
  element.replaceChildren(createIcon(iconName, { className }));
}

function prependIcon(element, iconName) {
  if (!element || element.querySelector('.ui-icon')) return;
  element.prepend(createIcon(iconName));
}

function appendIcon(element, iconName) {
  if (!element || element.querySelector('.ui-icon')) return;
  element.append(createIcon(iconName));
}

function actionIconName(element) {
  const label = element.textContent.trim().toLowerCase();
  if (label === 'directions') return 'directions';
  if (label === 'view details' || label === 'details') return 'details';
  if (label === 'share' || label === 'share watch party') return 'share';
  return null;
}

function clarifyShareLabels(root = document) {
  root.querySelectorAll('.action-row').forEach((row) => {
    const share = Array.from(row.querySelectorAll(':scope > button'))
      .find((button) => /^Share(?: Watch Party)?$/i.test(button.textContent.trim()));
    if (!share) return;
    const container = row.parentElement;
    const detail = Boolean(row.closest('#venue-detail'));
    if (detail && share.classList.contains('detail-share')) return;
    const hasWatchParty = Boolean(container?.querySelector(':scope > .party-module'));
    const icon = share.querySelector('.ui-icon');
    share.replaceChildren();
    if (icon) share.append(icon);
    share.append(document.createTextNode(detail ? 'Share' : hasWatchParty ? 'Share Watch Party' : 'Share'));
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

function syncDetailLocalMap(hero, venue, state) {
  const container = hero?.querySelector('.detail-local-map');
  if (!container || venue.photo_url) {
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
    return;
  }

  const key = String(window.CGBApp?.mapTilerKey || '').trim();
  if (!key) return;
  const style = `https://api.maptiler.com/maps/${DETAIL_MAP_STYLE_ID}/style.json?key=${encodeURIComponent(key)}`;
  detailLocalMap = new window.maplibregl.Map({
    container,
    style,
    center: [longitude, latitude],
    zoom: DETAIL_MAP_ZOOM,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0
  });
  detailLocalMap.on('error', (event) => console.warn('Detail map error', event?.error || event));
  new window.maplibregl.Marker({
    element: createDetailLocalMarker(venue, state),
    anchor: 'bottom'
  }).setLngLat([longitude, latitude]).addTo(detailLocalMap);
  requestAnimationFrame(() => detailLocalMap?.resize?.());
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
  root.querySelectorAll('.party-module a[target="_blank"]:not(.party-module__report)')
    .forEach((link) => appendIcon(link, 'external'));
}

function runRefinements() {
  upgradeRenderedIcons();
  const state = window.CGBApp?.getState?.();
  const venue = detailVenue(state);
  const hero = document.querySelector('#venue-detail .detail-hero');
  if (!state?.detailMode || !venue || !hero) destroyDetailLocalMap();
  else syncDetailLocalMap(hero, venue, state);
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
