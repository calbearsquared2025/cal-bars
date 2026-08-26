import { markerKind } from './core.mjs';
import { renderCalBarNominationEntry } from './cal-bar-nomination.js';
import { renderFanExperiences } from './fan-experiences.mjs';
import { renderListingUpdateEntry } from './listing-update.js';
import { renderPhotoFormEntry } from './photo-form.js';
import { enhanceVenueProfile } from './venue-profile-enhancement.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-selected-profile-continuation';
const DETAIL_MAP_STYLE_ID = 'dataviz-v4';
const DETAIL_MAP_ZOOM = 15;
const cachedVenueDetail = typeof document !== 'undefined'
  ? document.querySelector('#venue-detail')
  : null;

let appConnected = false;
let continuationMap = null;
let continuationMapContainer = null;
let continuationMapVenueId = '';
let lastContinuationVenueId = '';

function clean(value) {
  return String(value ?? '').trim();
}

export function shouldRenderContinuousProfile({
  mobile = false,
  detailMode = false,
  selectedVenueId = '',
  trayState = '',
  commandSurface = ''
} = {}) {
  return Boolean(
    mobile &&
    !detailMode &&
    clean(selectedVenueId) &&
    trayState === 'selected' &&
    commandSurface === 'map'
  );
}

function selectedVenue(state) {
  return state?.snapshot?.venues?.find((venue) =>
    clean(venue?.venue_id) === clean(state?.selectedVenueId)) || null;
}

function installStyles(documentObject) {
  if (!documentObject || documentObject.getElementById(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-selected {
        max-height: calc(min(58dvh, 520px) - 24px) !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card + #venue-detail.venue-detail--selected-continuation {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 0 14px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-editorial {
        margin: 0 !important;
        padding: 16px 16px 15px !important;
        background: var(--cgb-gold-50) !important;
        border: 0 !important;
        border-bottom: 1px solid var(--cgb-gold-200) !important;
        border-radius: 0 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-editorial h2,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences h2 {
        margin: 0 0 6px !important;
        color: var(--cgb-navy-950) !important;
        font-family: var(--font-display) !important;
        font-size: .72rem !important;
        font-weight: 850 !important;
        letter-spacing: .09em !important;
        line-height: 1.15 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-editorial__copy {
        margin: 0 !important;
        color: var(--cgb-ink-700) !important;
        font-size: var(--text-sm) !important;
        line-height: 1.48 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-hero {
        min-height: 0 !important;
        display: block !important;
        padding: 12px 16px 16px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-hero::before,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-hero::after {
        display: none !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo {
        width: min(100%, 520px) !important;
        margin: 0 auto !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__frame {
        width: 100% !important;
        aspect-ratio: 4 / 3 !important;
        overflow: hidden !important;
        background: var(--cgb-neutral-100) !important;
        border: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 14px !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__image {
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        object-fit: contain !important;
        object-position: center !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__metadata {
        display: grid !important;
        gap: 3px !important;
        padding: 7px 2px 0 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__caption,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__credit {
        margin: 0 !important;
        color: var(--cgb-ink-500) !important;
        font-size: var(--text-xs) !important;
        line-height: 1.35 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-local-map {
        position: relative !important;
        z-index: 0 !important;
        width: 100% !important;
        height: 138px !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: var(--cgb-neutral-100) !important;
        border: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 14px !important;
        clip-path: none !important;
        visibility: hidden !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-local-map.is-ready {
        visibility: visible !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-local-map canvas {
        cursor: default !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-local-map .maplibregl-control-container {
        display: none !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences {
        margin: 0 !important;
        padding: 16px !important;
        background: #f1f6fb !important;
        border: 0 !important;
        border-top: 1px solid rgba(1, 1, 51, .09) !important;
        border-bottom: 1px solid rgba(1, 1, 51, .12) !important;
        border-radius: 0 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__quotes {
        display: grid !important;
        gap: 12px !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__quote-row {
        display: grid !important;
        grid-template-columns: 18px minmax(0, 1fr) !important;
        align-items: start !important;
        gap: 7px !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__mark {
        color: var(--cgb-gold-500) !important;
        font-family: var(--font-display) !important;
        font-size: 24px !important;
        line-height: .85 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__quote,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__prompt,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__guidance {
        margin: 0 !important;
        color: var(--cgb-ink-700) !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__quote {
        font-size: 13px !important;
        line-height: 1.45 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__attribution {
        margin: 7px 0 0 25px !important;
        color: var(--cgb-ink-500) !important;
        font-size: 12px !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__toggle,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-fan-experiences__share {
        width: fit-content !important;
        margin-top: 10px !important;
        padding: 0 !important;
        color: var(--cgb-navy-900) !important;
        background: transparent !important;
        border: 0 !important;
        font-size: var(--text-sm) !important;
        font-weight: 700 !important;
        text-decoration: underline !important;
        text-underline-offset: 3px !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-contribution {
        margin: 0 !important;
        padding: 16px !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-contribution h2 {
        margin: 0 0 10px !important;
        color: var(--cgb-navy-950) !important;
        font-family: var(--font-display) !important;
        font-size: .9rem !important;
        line-height: 1.15 !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card .action-row {
        grid-template-rows: minmax(50px, auto) !important;
      }
    }
  `;
  documentObject.head.append(style);
}

function destroyContinuationMap() {
  try { continuationMap?.remove?.(); } catch (_) {}
  continuationMap = null;
  continuationMapContainer = null;
  continuationMapVenueId = '';
}

function createLocalMapElement(documentObject, venue, state) {
  const latitude = Number(venue?.latitude);
  const longitude = Number(venue?.longitude);
  if (![latitude, longitude].every(Number.isFinite)) return null;
  const map = documentObject.createElement('div');
  map.className = 'detail-local-map';
  map.dataset.venueId = clean(venue.venue_id);
  map.dataset.latitude = String(latitude);
  map.dataset.longitude = String(longitude);
  map.dataset.zoom = String(DETAIL_MAP_ZOOM);
  map.dataset.markerKind = markerKind(state.snapshot, state.gameId, venue);
  map.setAttribute('role', 'group');
  map.setAttribute('aria-label', `Local map centered on ${clean(venue.name) || 'this venue'}`);
  map.setAttribute('aria-busy', 'true');
  return map;
}

function createLocalMarker(documentObject, venue, state) {
  const kind = markerKind(state.snapshot, state.gameId, venue);
  const marker = documentObject.createElement('div');
  marker.className = `cgb-marker marker--${kind} is-selected detail-local-map__marker`;
  marker.setAttribute('aria-hidden', 'true');
  const symbol = documentObject.createElement('span');
  symbol.className = kind === 'watch-party' ? 'marker-star' : 'marker-pin';
  symbol.setAttribute('aria-hidden', 'true');
  if (kind === 'watch-party') symbol.textContent = '★';
  marker.append(symbol);
  return marker;
}

function revealLocalMap(container) {
  container?.classList.add('is-ready');
  container?.setAttribute('aria-busy', 'false');
}

function syncLocalMap(container, venue, state, windowObject) {
  if (!container) {
    destroyContinuationMap();
    return;
  }
  const latitude = Number(venue?.latitude);
  const longitude = Number(venue?.longitude);
  if (![latitude, longitude].every(Number.isFinite)) {
    destroyContinuationMap();
    return;
  }
  if (
    continuationMap &&
    continuationMapContainer === container &&
    continuationMapVenueId === venue.venue_id
  ) return;

  destroyContinuationMap();
  continuationMapContainer = container;
  continuationMapVenueId = venue.venue_id;
  if (!windowObject?.maplibregl?.Map || !windowObject?.maplibregl?.Marker) {
    revealLocalMap(container);
    return;
  }
  const key = clean(windowObject.CGBApp?.mapTilerKey);
  if (!key) {
    revealLocalMap(container);
    return;
  }
  const style = `https://api.maptiler.com/maps/${DETAIL_MAP_STYLE_ID}/style.json?key=${encodeURIComponent(key)}`;
  const map = new windowObject.maplibregl.Map({
    container,
    style,
    center: [longitude, latitude],
    zoom: DETAIL_MAP_ZOOM,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0
  });
  continuationMap = map;
  map.on('load', () => {
    if (continuationMap !== map || continuationMapContainer !== container) return;
    revealLocalMap(container);
  });
  map.on('error', (event) => console.warn('Selected profile map error', event?.error || event));
  new windowObject.maplibregl.Marker({
    element: createLocalMarker(container.ownerDocument, venue, state),
    anchor: 'bottom'
  }).setLngLat([longitude, latitude]).addTo(map);
  requestAnimationFrame(() => {
    if (continuationMap === map) map.resize?.();
  });
}

function createEditorial(documentObject, venue) {
  const copy = clean(venue?.short_description);
  if (!copy) return null;
  const section = documentObject.createElement('section');
  section.className = 'detail-editorial';
  const heading = documentObject.createElement('h2');
  heading.textContent = 'CGB SAYS';
  const description = documentObject.createElement('p');
  description.className = 'detail-editorial__copy';
  description.textContent = copy;
  section.append(heading, description);
  return section;
}

function createContribution(documentObject) {
  const section = documentObject.createElement('section');
  section.className = 'detail-contribution';
  section.hidden = true;
  const heading = documentObject.createElement('h2');
  heading.textContent = 'Help improve this listing';
  const actions = documentObject.createElement('div');
  actions.className = 'detail-contribution__actions';
  section.append(heading, actions);
  return section;
}

function proxyApp(app, state) {
  const proxyState = { ...state, detailMode: true };
  return {
    getState: () => proxyState,
    showStatus: (...args) => app?.showStatus?.(...args)
  };
}

function removeGateway(documentObject) {
  documentObject.querySelectorAll('#tray-selected .selected-card__details').forEach((link) => link.remove());
}

function clearContinuation() {
  destroyContinuationMap();
  if (cachedVenueDetail?.dataset.profilePresentation === 'mobile-continuation') {
    cachedVenueDetail.classList.remove('venue-detail--selected-continuation');
    if (cachedVenueDetail.parentElement?.id === 'tray-selected') cachedVenueDetail.remove();
  }
  lastContinuationVenueId = '';
}

export function renderMobileSelectedProfileContinuation({
  app = globalThis.window?.CGBApp,
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!app || !documentObject || !windowObject || !cachedVenueDetail) return false;
  installStyles(documentObject);
  const state = app.getState?.();
  const mobile = windowObject.matchMedia?.(MOBILE_QUERY)?.matches === true;
  const commandSurface = documentObject.body?.dataset.commandSurface || '';
  const trayState = documentObject.querySelector('#venue-tray')?.dataset.state || state?.trayState || '';
  const eligible = shouldRenderContinuousProfile({
    mobile,
    detailMode: state?.detailMode,
    selectedVenueId: state?.selectedVenueId,
    trayState,
    commandSurface
  });

  if (!eligible) {
    clearContinuation();
    return false;
  }

  const venue = selectedVenue(state);
  const traySelected = documentObject.querySelector('#tray-selected');
  const selectedCard = traySelected?.querySelector(':scope > .selected-card');
  if (!venue || !traySelected || !selectedCard) {
    clearContinuation();
    return false;
  }

  removeGateway(documentObject);
  destroyContinuationMap();
  const changedVenue = lastContinuationVenueId !== venue.venue_id;
  lastContinuationVenueId = venue.venue_id;

  cachedVenueDetail.replaceChildren();
  cachedVenueDetail.dataset.venueId = venue.venue_id;
  cachedVenueDetail.dataset.profilePresentation = 'mobile-continuation';
  cachedVenueDetail.classList.add('venue-detail--selected-continuation');

  const editorial = createEditorial(documentObject, venue);
  if (editorial) cachedVenueDetail.append(editorial);

  const hero = documentObject.createElement('header');
  hero.className = `detail-hero${venue.photo_url ? '' : ' detail-hero--no-photo'}`;
  if (!venue.photo_url) {
    const localMap = createLocalMapElement(documentObject, venue, state);
    if (localMap) hero.append(localMap);
  }
  cachedVenueDetail.append(hero, createContribution(documentObject));
  traySelected.append(cachedVenueDetail);

  const continuationApp = proxyApp(app, state);
  const continuationState = continuationApp.getState();
  enhanceVenueProfile({
    state: continuationState,
    documentObject,
    onPhotoError: () => queueMicrotask(() => renderMobileSelectedProfileContinuation({ app, documentObject, windowObject }))
  });
  const fanSection = renderFanExperiences({ app: continuationApp, documentObject });
  if (fanSection) hero.after(fanSection);
  renderCalBarNominationEntry({ app: continuationApp, documentObject });
  renderPhotoFormEntry({ app: continuationApp, documentObject });
  renderListingUpdateEntry({ app: continuationApp, documentObject });

  const localMap = hero.querySelector(':scope > .detail-local-map');
  syncLocalMap(localMap, venue, continuationState, windowObject);
  if (changedVenue) traySelected.scrollTop = 0;
  return true;
}

function connect() {
  if (appConnected || typeof window === 'undefined' || typeof document === 'undefined') return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connect, 25);
    return;
  }
  appConnected = true;
  const render = () => renderMobileSelectedProfileContinuation({ app, documentObject: document, windowObject: window });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.setTimeout(connect, 0);
}
