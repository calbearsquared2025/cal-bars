import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import './mobile-direct-venue-profile.mjs';
import { renderMobileSelectedProfileContinuation } from './mobile-selected-profile-continuation.mjs';
import { markerKind } from './core.mjs';
import { createIcon, inlineSpriteIcons } from './icons.mjs';
import { renderPhotoFormEntry } from './photo-form.js';
import { renderFanExperiences } from './fan-experiences.mjs';
import { arrangeDesktopVenueMedia, enhanceVenueProfile } from './venue-profile-enhancement.mjs';

let appConnected = false;
let appConnectAttempts = 0;
let postRenderUpgradeQueued = false;
let iconMutationObserver = null;
let detailLocalMap = null;
let detailLocalMapContainer = null;
let detailLocalMapVenueId = '';
const APP_CONNECT_MAX_ATTEMPTS = 1200;
const DETAIL_MAP_STYLE_ID = 'dataviz-v4';
const DETAIL_MAP_ZOOM = 15;
const MOBILE_QUERY = '(max-width: 899px)';
const MOBILE_SEARCH_HELPER_STYLE_ID = 'cgb-mobile-search-helper-visibility';
const WIDE_DESKTOP_QUERY = '(min-width: 1100px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DESKTOP_TRAY_MOTION_DURATION = '210ms';
const DESKTOP_TRAY_MOTION_EASING = 'cubic-bezier(.16, 1, .3, 1)';

function installMobileSearchHelperVisibility() {
  if (document.getElementById(MOBILE_SEARCH_HELPER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = MOBILE_SEARCH_HELPER_STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      #location-search:has(#location-query:placeholder-shown) #search-dropdown {
        display: none !important;
      }
    }
  `;
  document.head.append(style);
}

function replaceTextWithIcon(element, iconName, className = 'ui-icon') {
  if (!element || element.querySelector('.ui-icon')) return;
  element.replaceChildren(createIcon(iconName, { className }));
}

function matchingNodes(root, selector) {
  const matches = [];
  if (root?.nodeType === 1 && root.matches?.(selector)) matches.push(root);
  root?.querySelectorAll?.(selector)?.forEach((node) => matches.push(node));
  return matches;
}

function upgradeStarIcons(root = document) {
  matchingNodes(root, '.marker-star').forEach((star) => {
    replaceTextWithIcon(star, 'star', 'ui-icon marker-star__icon');
  });

  matchingNodes(root, '.party-module__title > span').forEach((star) => {
    replaceTextWithIcon(star, 'star');
  });
}

function installAtomicStarIconUpgrade() {
  if (iconMutationObserver || !window.MutationObserver || !document.documentElement) return;
  iconMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 || node.nodeType === 11) upgradeStarIcons(node);
      });
    });
  });
  iconMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  upgradeStarIcons(document);
}

function prependIcon(element, iconName) {
  if (!element || element.querySelector('.ui-icon')) return;
  element.prepend(createIcon(iconName));
}

function actionIconName(element) {
  const label = element.textContent.trim().toLowerCase();
  if (label === 'directions') return 'location';
  if (label === 'view details' || label === 'details') return 'details';
  return null;
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

function mobileDirectMapProfile(state) {
  return Boolean(
    state?.detailMode &&
    document.body?.dataset.view === 'map' &&
    window.matchMedia?.(MOBILE_QUERY)?.matches === true
  );
}

function setDesktopTransition(element, property, enabled, reduceMotion) {
  if (!element) return;
  if (!enabled) {
    element.style.removeProperty('transition-property');
    element.style.removeProperty('transition-duration');
    element.style.removeProperty('transition-timing-function');
    return;
  }
  element.style.transitionProperty = reduceMotion ? 'none' : property;
  if (reduceMotion) {
    element.style.removeProperty('transition-duration');
    element.style.removeProperty('transition-timing-function');
    return;
  }
  element.style.transitionDuration = DESKTOP_TRAY_MOTION_DURATION;
  element.style.transitionTimingFunction = DESKTOP_TRAY_MOTION_EASING;
}

function syncDesktopTrayMotion() {
  const wideDesktop = window.matchMedia?.(WIDE_DESKTOP_QUERY)?.matches === true;
  const reduceMotion = window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;
  const tray = document.querySelector('#map-view > #venue-tray');
  const controls = document.querySelector('#map-view .maplibregl-ctrl-top-right');
  const locate = document.querySelector('#map-view > .map-actions');
  setDesktopTransition(tray, 'width', wideDesktop, reduceMotion);
  setDesktopTransition(controls, 'right', wideDesktop, reduceMotion);
  setDesktopTransition(locate, 'right', wideDesktop, reduceMotion);
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
  if (kind === 'watch-party') symbol.append(createIcon('star', { className: 'ui-icon marker-star__icon' }));
  marker.append(symbol);
  return marker;
}

function revealDetailLocalMap(container) {
  container?.classList.add('is-ready');
  container?.setAttribute('aria-busy', 'false');
}

function revealPendingDetailViewWhenSettled() {
  const state = window.CGBApp?.getState?.();
  const detail = document.querySelector('#venue-detail');
  const hero = detail?.querySelector(':scope > .detail-hero');
  if (mobileDirectMapProfile(state) || !state?.detailMode || !detailVenue(state) || !hero) return;

  const localMap = detail.querySelector('.detail-local-map');
  if (localMap && !localMap.classList.contains('is-ready')) return;

  const photo = detail.querySelector('.detail-photo .detail-photo__image');
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

function syncDetailLocalMap(root, venue, state) {
  const container = root?.querySelector('.detail-local-map');
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
  const configuredZoom = Number(container.dataset.zoom);
  const zoom = Number.isFinite(configuredZoom) ? configuredZoom : DETAIL_MAP_ZOOM;
  const map = new window.maplibregl.Map({
    container,
    style,
    center: [longitude, latitude],
    zoom,
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
  upgradeStarIcons(root);

  root.querySelectorAll('.selected-card__header > .icon-button').forEach((button) => {
    replaceTextWithIcon(button, 'chevron-down');
  });

  root.querySelectorAll('.action-row > a, .action-row > button').forEach((action) => {
    const iconName = actionIconName(action);
    if (iconName) prependIcon(action, iconName);
  });

  root.querySelectorAll('.venue-website').forEach((link) => prependIcon(link, 'external'));
}

function runRefinements() {
  const state = window.CGBApp?.getState?.();
  const directMobileProfile = mobileDirectMapProfile(state);
  syncDesktopTrayMotion();
  if (!directMobileProfile) {
    enhanceVenueProfile({ state, documentObject: document, onPhotoError: scheduleUpgrade });
    renderFanExperiences({ app: window.CGBApp, documentObject: document });
    arrangeDesktopVenueMedia({ state, documentObject: document, windowObject: window });
    renderPhotoFormEntry({ app: window.CGBApp, documentObject: document });
  }
  upgradeRenderedIcons();
  const venue = detailVenue(state);
  const detail = document.querySelector('#venue-detail');
  const hero = detail?.querySelector(':scope > .detail-hero');
  if (directMobileProfile || !state?.detailMode || !venue || !hero || !detail) destroyDetailLocalMap();
  else syncDetailLocalMap(detail, venue, state);
  if (!directMobileProfile) revealPendingDetailViewWhenSettled();

  if (renderMobileSelectedProfileContinuation({
    app: window.CGBApp,
    documentObject: document,
    windowObject: window
  })) {
    upgradeRenderedIcons();
  }
}

function scheduleUpgrade() {
  requestAnimationFrame(() => {
    runRefinements();
  });
}

function schedulePostRenderUpgrade() {
  if (postRenderUpgradeQueued) return;
  postRenderUpgradeQueued = true;
  queueMicrotask(() => {
    postRenderUpgradeQueued = false;
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
  window.CGBApp?.subscribe?.('rendered', schedulePostRenderUpgrade);
  window.CGBApp?.subscribe?.('ready', schedulePostRenderUpgrade);
  schedulePostRenderUpgrade();
}

function initialize() {
  installMobileSearchHelperVisibility();
  runRefinements();
  window.matchMedia?.(WIDE_DESKTOP_QUERY)?.addEventListener?.('change', scheduleUpgrade);
  window.matchMedia?.(REDUCED_MOTION_QUERY)?.addEventListener?.('change', scheduleUpgrade);
  connectApp();
}

installAtomicStarIconUpgrade();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
