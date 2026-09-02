import { markerKind } from './core.mjs';
import { renderCalBarNominationEntry } from './cal-bar-nomination.js';
import { renderFanExperiences } from './fan-experiences.mjs';
import { renderListingUpdateEntry } from './listing-update.js';
import { renderPhotoFormEntry } from './photo-form.js';
import { enhanceVenueProfile } from './venue-profile-enhancement.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-selected-profile-continuation';
const PHOTO_VIEWER_SELECTOR = 'dialog[data-mobile-photo-viewer]';
const DETAIL_MAP_STYLE_ID = 'dataviz-v4';
const DETAIL_MAP_ZOOM = 15;
const BASE_TRAY_VIEWPORT_RATIO = 0.58;
const BASE_TRAY_MAX_PX = 520;
const REVEAL_TRAY_VIEWPORT_RATIO = 0.66;
const REVEAL_TRAY_MAX_PX = 584;
const TRAY_HANDLE_HEIGHT_PX = 24;
const CONTINUATION_REVEAL_PX = 64;
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
  mapView = false,
  selectedVenueId = '',
  trayState = '',
  commandSurface = ''
} = {}) {
  return Boolean(
    mobile &&
    mapView &&
    clean(selectedVenueId) &&
    trayState === 'selected' &&
    commandSurface === 'map'
  );
}

export function selectedTrayHeightForContinuation({
  viewportHeight = 0,
  selectedCardHeight = 0,
  revealHeight = CONTINUATION_REVEAL_PX
} = {}) {
  const viewport = Number(viewportHeight);
  const card = Number(selectedCardHeight);
  const reveal = Number(revealHeight);
  if (!Number.isFinite(viewport) || viewport <= 0 || !Number.isFinite(card) || card <= 0) return 0;

  const baseline = Math.min(viewport * BASE_TRAY_VIEWPORT_RATIO, BASE_TRAY_MAX_PX);
  const expanded = Math.min(viewport * REVEAL_TRAY_VIEWPORT_RATIO, REVEAL_TRAY_MAX_PX);
  const desired = card + TRAY_HANDLE_HEIGHT_PX + (Number.isFinite(reveal) && reveal > 0 ? reveal : 0);
  return Math.min(Math.max(baseline, desired), expanded);
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
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected {
        max-height: var(--cgb-selected-tray-max-height, min(58dvh, 520px)) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-selected {
        max-height: calc(var(--cgb-selected-tray-max-height, min(58dvh, 520px)) - 24px) !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card + #venue-detail.venue-detail--selected-continuation {
        width: 100% !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 0 14px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
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

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-hero.detail-hero--mobile-opening-empty {
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo {
        width: min(100%, 520px) !important;
        margin: 0 auto !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__frame,
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__frame {
        width: 100% !important;
        overflow: hidden !important;
        background: var(--cgb-neutral-100) !important;
        border: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 12px !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__image,
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__image {
        width: 100% !important;
        height: 100% !important;
        display: block !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__frame[data-mobile-photo-expandable="true"] {
        cursor: zoom-in;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__frame[data-mobile-photo-expandable="true"]:focus-visible {
        outline: 2px solid var(--cgb-gold-500);
        outline-offset: 2px;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__metadata,
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__metadata {
        display: grid !important;
        gap: 2px !important;
        padding: 5px 1px 0 !important;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__caption,
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-photo__credit,
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__caption,
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .detail-photo--mobile-opening .detail-photo__credit {
        margin: 0 !important;
        color: var(--cgb-ink-500) !important;
        font-size: .6rem !important;
        line-height: 1.25 !important;
      }

      .detail-photo-viewer {
        width: min(94vw, 720px);
        max-width: 94vw;
        max-height: 88dvh;
        margin: auto;
        padding: 0;
        background: transparent;
        border: 0;
        overflow: visible;
      }

      .detail-photo-viewer::backdrop {
        background: rgba(1, 1, 20, .78);
      }

      .detail-photo-viewer__surface {
        position: relative;
        max-height: 88dvh;
        display: grid;
        gap: 0;
        background: var(--cgb-white);
        border-radius: 14px;
        box-shadow: 0 18px 48px rgba(1, 1, 51, .28);
        overflow: hidden;
      }

      .detail-photo-viewer__image {
        width: 100%;
        max-height: 74dvh;
        display: block;
        object-fit: contain;
        background: var(--cgb-navy-950);
      }

      .detail-photo-viewer__metadata {
        padding: 9px 12px 10px;
      }

      .detail-photo-viewer__metadata-line {
        margin: 0;
        color: var(--cgb-ink-600);
        font-size: .7rem;
        line-height: 1.35;
      }

      .detail-photo-viewer__close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        padding: 0;
        color: var(--cgb-navy-950);
        background: rgba(255, 255, 255, .94);
        border: 1px solid rgba(1, 1, 51, .14);
        border-radius: 999px;
        box-shadow: 0 2px 8px rgba(1, 1, 51, .14);
        font-size: 1.25rem;
        line-height: 1;
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

function closeMobilePhotoViewer(documentObject) {
  const dialog = documentObject?.querySelector?.(PHOTO_VIEWER_SELECTOR);
  if (!dialog) return false;
  try {
    if (dialog.open) dialog.close();
  } catch (_) {}
  dialog.remove();
  return true;
}

function createMobilePhotoViewer(documentObject, figure) {
  const sourceImage = figure?.querySelector?.('.detail-photo__image');
  if (!sourceImage?.src) return null;

  const dialog = documentObject.createElement('dialog');
  dialog.className = 'detail-photo-viewer';
  dialog.dataset.mobilePhotoViewer = 'true';
  dialog.setAttribute('aria-label', sourceImage.alt || 'Venue photo');

  const surface = documentObject.createElement('div');
  surface.className = 'detail-photo-viewer__surface';

  const image = documentObject.createElement('img');
  image.className = 'detail-photo-viewer__image';
  image.src = sourceImage.currentSrc || sourceImage.src;
  image.alt = sourceImage.alt;
  image.decoding = 'async';
  surface.append(image);

  const sourceMetadata = figure.querySelector(':scope > .detail-photo__metadata');
  const sourceCaption = sourceMetadata?.querySelector('.detail-photo__caption');
  const sourceCredit = sourceMetadata?.querySelector('.detail-photo__credit');
  if (sourceCaption || sourceCredit) {
    const metadata = documentObject.createElement('div');
    metadata.className = 'detail-photo-viewer__metadata';
    const line = documentObject.createElement('p');
    line.className = 'detail-photo-viewer__metadata-line';

    const captionText = clean(sourceCaption?.textContent);
    if (captionText) line.append(documentObject.createTextNode(captionText));

    const creditIdentity = sourceCredit?.querySelector('a, span');
    if (creditIdentity) {
      line.append(documentObject.createTextNode(captionText ? ' · Photo: ' : 'Photo: '));
      line.append(creditIdentity.cloneNode(true));
    }

    if (line.childNodes.length) {
      metadata.append(line);
      surface.append(metadata);
    }
  }

  const close = documentObject.createElement('button');
  close.type = 'button';
  close.className = 'detail-photo-viewer__close';
  close.setAttribute('aria-label', 'Close photo');
  close.textContent = '×';
  close.addEventListener('click', () => dialog.close());
  surface.append(close);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.append(surface);
  return dialog;
}

function openMobilePhotoViewer(figure, documentObject, windowObject) {
  if (windowObject?.matchMedia?.(MOBILE_QUERY)?.matches !== true) return false;
  closeMobilePhotoViewer(documentObject);
  const dialog = createMobilePhotoViewer(documentObject, figure);
  if (!dialog || !documentObject?.body) return false;
  documentObject.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  return true;
}

function enableMobilePhotoViewer(media, documentObject, windowObject) {
  if (!media?.classList?.contains('detail-photo--mobile-opening')) return false;
  const frame = media.querySelector(':scope > .detail-photo__frame');
  if (!frame || frame.dataset.mobilePhotoExpandable === 'true') return Boolean(frame);

  frame.dataset.mobilePhotoExpandable = 'true';
  frame.setAttribute('role', 'button');
  frame.setAttribute('tabindex', '0');
  frame.setAttribute('aria-haspopup', 'dialog');
  frame.setAttribute('aria-label', 'Expand venue photo');

  const activate = (event) => {
    event.preventDefault();
    openMobilePhotoViewer(media, documentObject, windowObject);
  };
  frame.addEventListener('click', activate);
  frame.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    activate(event);
  });
  return true;
}

function clearMobileOpeningMedia(card) {
  card?.querySelector?.(':scope > .detail-photo--mobile-opening')?.remove();
  card?.querySelector?.(':scope > .detail-local-map--mobile-opening')?.remove();
  if (card?.dataset) {
    delete card.dataset.mobileMediaForward;
    delete card.dataset.mobileMediaType;
  }
}

function placeMobileOpeningMedia(detail, card) {
  const hero = detail?.querySelector?.(':scope > .detail-hero');
  const media = hero?.querySelector?.(':scope > .detail-photo, :scope > .detail-local-map') ||
    detail?.querySelector?.(':scope > .detail-photo, :scope > .detail-local-map');
  clearMobileOpeningMedia(card);
  hero?.classList?.remove('detail-hero--mobile-opening-empty');
  if (!hero || !media || !card) return null;

  const isPhoto = media.classList.contains('detail-photo');
  media.classList.remove('detail-photo--mobile-deferred', 'detail-profile-media--desktop');
  media.classList.add(isPhoto ? 'detail-photo--mobile-opening' : 'detail-local-map--mobile-opening');
  const header = card.querySelector(':scope > .selected-card__header');
  if (header) header.after(media);
  else card.prepend(media);
  card.dataset.mobileMediaForward = 'true';
  card.dataset.mobileMediaType = isPhoto ? 'photo' : 'map';
  if (!hero.children.length) hero.classList.add('detail-hero--mobile-opening-empty');
  return media;
}

function movePhotoActionToOpeningMap(detail, openingMedia) {
  if (!openingMedia?.classList?.contains('detail-local-map--mobile-opening')) return false;
  const link = detail?.querySelector?.('[data-photo-form-entry]');
  if (!link) return false;
  link.className = 'detail-local-map__photo-action';
  link.dataset.photoFormEntry = 'mobile-map-overlay';
  link.textContent = 'Add a photo';
  openingMedia.append(link);
  const contribution = detail.querySelector(':scope > .detail-contribution');
  if (contribution) contribution.hidden = !contribution.querySelector('.detail-contribution__actions > a[href]');
  return true;
}

function syncContinuationRevealHeight(venueTray, selectedCard, windowObject) {
  const viewportHeight = Number(windowObject?.innerHeight) || 0;
  const selectedCardHeight = Number(selectedCard?.getBoundingClientRect?.().height) || 0;
  const targetHeight = selectedTrayHeightForContinuation({ viewportHeight, selectedCardHeight });
  if (!targetHeight) {
    venueTray?.style?.removeProperty?.('--cgb-selected-tray-max-height');
    return;
  }
  venueTray?.style?.setProperty?.('--cgb-selected-tray-max-height', `${Math.round(targetHeight)}px`);
}

function clearContinuation(documentObject) {
  destroyContinuationMap();
  closeMobilePhotoViewer(documentObject);
  clearMobileOpeningMedia(documentObject?.querySelector?.('#tray-selected > .selected-card'));
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
  const mapView = documentObject.body?.dataset.view === 'map';
  const commandSurface = documentObject.body?.dataset.commandSurface || '';
  const venueTray = documentObject.querySelector('#venue-tray');
  const trayState = venueTray?.dataset.state || state?.trayState || '';
  const eligible = shouldRenderContinuousProfile({
    mobile,
    mapView,
    selectedVenueId: state?.selectedVenueId,
    trayState,
    commandSurface
  });

  if (!eligible) {
    clearContinuation(documentObject);
    return false;
  }

  const venue = selectedVenue(state);
  const traySelected = documentObject.querySelector('#tray-selected');
  const selectedCard = traySelected?.querySelector(':scope > .selected-card');
  if (!venue || !venueTray || !traySelected || !selectedCard) {
    clearContinuation(documentObject);
    return false;
  }

  removeGateway(documentObject);
  destroyContinuationMap();
  clearMobileOpeningMedia(selectedCard);
  const changedVenue = lastContinuationVenueId !== venue.venue_id;
  if (changedVenue) closeMobilePhotoViewer(documentObject);
  lastContinuationVenueId = venue.venue_id;

  cachedVenueDetail.replaceChildren();
  cachedVenueDetail.dataset.venueId = venue.venue_id;
  cachedVenueDetail.dataset.profilePresentation = 'mobile-continuation';
  cachedVenueDetail.classList.add('venue-detail--selected-continuation');

  const hero = documentObject.createElement('header');
  hero.className = `detail-hero${venue.photo_url ? '' : ' detail-hero--no-photo'}`;
  if (!venue.photo_url) {
    const localMap = createLocalMapElement(documentObject, venue, state);
    if (localMap) hero.append(localMap);
  }
  cachedVenueDetail.append(hero);

  const editorial = createEditorial(documentObject, venue);
  if (editorial) cachedVenueDetail.append(editorial);
  cachedVenueDetail.append(createContribution(documentObject));
  traySelected.append(cachedVenueDetail);

  const continuationApp = proxyApp(app, state);
  const continuationState = continuationApp.getState();
  enhanceVenueProfile({
    state: continuationState,
    documentObject,
    onPhotoError: () => queueMicrotask(() => renderMobileSelectedProfileContinuation({ app, documentObject, windowObject }))
  });
  const openingMedia = placeMobileOpeningMedia(cachedVenueDetail, selectedCard);
  enableMobilePhotoViewer(openingMedia, documentObject, windowObject);
  renderFanExperiences({ app: continuationApp, documentObject });
  renderCalBarNominationEntry({ app: continuationApp, documentObject });
  renderPhotoFormEntry({ app: continuationApp, documentObject });
  movePhotoActionToOpeningMap(cachedVenueDetail, openingMedia);
  renderListingUpdateEntry({ app: continuationApp, documentObject });

  const localMap = openingMedia?.classList?.contains('detail-local-map--mobile-opening')
    ? openingMedia
    : hero.querySelector(':scope > .detail-local-map');
  syncLocalMap(localMap, venue, continuationState, windowObject);
  syncContinuationRevealHeight(venueTray, selectedCard, windowObject);
  windowObject.requestAnimationFrame?.(() => syncContinuationRevealHeight(venueTray, selectedCard, windowObject));
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
