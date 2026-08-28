import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import './mobile-direct-venue-profile.mjs';
import { renderMobileSelectedProfileContinuation } from './mobile-selected-profile-continuation.mjs';
import { getFanCount, markerKind } from './core.mjs';
import { createIcon, inlineSpriteIcons } from './icons.mjs';
import { renderPhotoFormEntry } from './photo-form.js';
import { renderFanExperiences } from './fan-experiences.mjs';
import { arrangeDesktopVenueMedia, enhanceVenueProfile } from './venue-profile-enhancement.mjs';

let appConnected = false;
let appConnectAttempts = 0;
let detailLocalMap = null;
let detailLocalMapContainer = null;
let detailLocalMapVenueId = '';
const desktopAttendanceSources = new WeakMap();
const APP_CONNECT_MAX_ATTEMPTS = 1200;
const DETAIL_MAP_STYLE_ID = 'dataviz-v4';
const DETAIL_MAP_ZOOM = 15;
const MOBILE_QUERY = '(max-width: 899px)';
const WIDE_DESKTOP_QUERY = '(min-width: 1100px)';

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

function detailGame(state) {
  return state?.snapshot?.games?.find((game) => game.game_id === state.gameId) || null;
}

function mobileDirectMapProfile(state) {
  return Boolean(
    state?.detailMode &&
    document.body?.dataset.view === 'map' &&
    window.matchMedia?.(MOBILE_QUERY)?.matches === true
  );
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

function restoreDesktopProfileAttendance(activity) {
  if (!activity) return false;
  const compact = activity.querySelector(':scope > .detail-attendance-compact');
  const source = desktopAttendanceSources.get(activity);
  if (compact && source) compact.replaceWith(source);
  else compact?.remove();
  desktopAttendanceSources.delete(activity);
  activity.classList.remove('activity-card--desktop-attendance');
  return Boolean(compact);
}

function syncDesktopProfileAttendance(state) {
  const detail = document.querySelector('#venue-detail');
  const activity = detail?.querySelector(':scope > .activity-card');
  const venue = detailVenue(state);
  const game = detailGame(state);
  const wideDesktop = window.matchMedia?.(WIDE_DESKTOP_QUERY)?.matches === true;
  const upcoming = String(game?.game_status || '').toLowerCase() === 'upcoming';
  const eligible = Boolean(state?.detailMode && detail && activity && venue && wideDesktop && upcoming);

  if (!eligible) return restoreDesktopProfileAttendance(activity);

  const publicCount = getFanCount(state.snapshot, state.gameId, venue.venue_id);
  const selectedByThisBrowser = state?.fanIntent?.selections?.[state.gameId] === venue.venue_id;
  const count = selectedByThisBrowser ? Math.max(publicCount, 1) : publicCount;
  let compact = activity.querySelector(':scope > .detail-attendance-compact');
  if (!compact) {
    const source = activity.querySelector(':scope > strong');
    if (!source) return false;
    compact = document.createElement('div');
    compact.className = 'detail-attendance-compact';
    desktopAttendanceSources.set(activity, source);
    source.replaceWith(compact);
  }
  compact.replaceChildren();

  if (count <= 0) {
    compact.classList.add('detail-attendance-compact--empty');
    compact.append(createIcon('users', { className: 'ui-icon detail-attendance-compact__icon' }));
    const prompt = document.createElement('strong');
    prompt.className = 'detail-attendance-compact__prompt';
    prompt.textContent = 'Be the first.';
    compact.append(prompt);
    compact.setAttribute('aria-label', 'No Bears attending yet. Be the first.');
  } else {
    compact.classList.remove('detail-attendance-compact--empty');
    const number = document.createElement('strong');
    number.className = 'detail-attendance-compact__number';
    number.textContent = String(count);
    const label = document.createElement('span');
    label.className = 'detail-attendance-compact__label';
    label.textContent = count === 1 ? 'BEAR' : 'BEARS';
    const attending = document.createElement('span');
    attending.className = 'detail-attendance-compact__attending';
    attending.textContent = 'ATTENDING';
    const context = document.createElement('span');
    context.className = 'detail-attendance-compact__context';
    context.textContent = 'ON CGB';
    compact.append(number, label, attending, context);
    compact.setAttribute('aria-label', `${count} ${count === 1 ? 'Bear' : 'Bears'} attending on CGB`);
  }

  activity.classList.add('activity-card--desktop-attendance');
  return true;
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

  root.querySelectorAll('.action-row > a, .action-row > button').forEach((action) => {
    const iconName = actionIconName(action);
    if (iconName) prependIcon(action, iconName);
  });

  root.querySelectorAll('.venue-website').forEach((link) => prependIcon(link, 'external'));
}

function runRefinements() {
  const state = window.CGBApp?.getState?.();
  const directMobileProfile = mobileDirectMapProfile(state);
  if (!directMobileProfile) {
    enhanceVenueProfile({ state, documentObject: document, onPhotoError: scheduleUpgrade });
    renderFanExperiences({ app: window.CGBApp, documentObject: document });
    arrangeDesktopVenueMedia({ state, documentObject: document, windowObject: window });
    renderPhotoFormEntry({ app: window.CGBApp, documentObject: document });
  }
  syncDesktopProfileAttendance(state);
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
  window.matchMedia?.(WIDE_DESKTOP_QUERY)?.addEventListener?.('change', scheduleUpgrade);
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
