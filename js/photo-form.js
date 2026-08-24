import { PHOTO_FORM_CONFIG } from './photo-form-config.mjs';
import {
  buildPhotoFormPrefillUrl,
  resolvePhotoFormVenue
} from './photo-form-core.mjs';

const SELECTOR = '[data-photo-form-entry]';
let initialized = false;

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

export function readPhotoFormConfig(documentObject = document) {
  return {
    formUrl: meta('cgb-photo-form-url', documentObject) || PHOTO_FORM_CONFIG.formUrl,
    venueIdEntry: meta('cgb-photo-form-venue-id-entry', documentObject) || PHOTO_FORM_CONFIG.venueIdEntry,
    venueNameEntry: meta('cgb-photo-form-venue-name-entry', documentObject) || PHOTO_FORM_CONFIG.venueNameEntry
  };
}

function syncContributionVisibility(detail) {
  const section = detail?.querySelector(':scope > .detail-contribution');
  if (section) section.hidden = !section.querySelector('.detail-contribution__actions > a[href]');
}

function createPhotoFormLink(documentObject, { href, label, entryPoint, className }) {
  const link = documentObject.createElement('a');
  link.className = className;
  link.dataset.photoFormEntry = entryPoint;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = label;
  return link;
}

export function renderPhotoFormEntry({ app = window.CGBApp, documentObject = document } = {}) {
  const existing = Array.from(documentObject.querySelectorAll(SELECTOR));
  const detail = existing[0]?.closest?.('#venue-detail') || documentObject.querySelector('#venue-detail');
  existing.forEach((entry) => entry.remove());
  if (!detail) return '';

  const state = app?.getState?.();
  if (!state?.detailMode) {
    syncContributionVisibility(detail);
    return '';
  }
  const venue = resolvePhotoFormVenue(state.snapshot, state.selectedVenueId);
  const href = buildPhotoFormPrefillUrl(readPhotoFormConfig(documentObject), venue);
  if (!href) {
    syncContributionVisibility(detail);
    return '';
  }

  const actions = detail.querySelector(':scope > .detail-contribution > .detail-contribution__actions');
  if (!actions) return '';
  actions.append(createPhotoFormLink(documentObject, {
    href,
    label: 'Add a Photo',
    entryPoint: 'contribution',
    className: 'detail-contribution__action'
  }));

  const localMap = detail.querySelector(':scope > .detail-hero > .detail-local-map');
  if (localMap) {
    localMap.append(createPhotoFormLink(documentObject, {
      href,
      label: 'Add a Photo!',
      entryPoint: 'map-overlay',
      className: 'detail-local-map__photo-action'
    }));
  }
  syncContributionVisibility(detail);
  return href;
}

export function initializePhotoFormEntry({ app = window.CGBApp, documentObject = document } = {}) {
  if (initialized || !app?.subscribe) return false;
  initialized = true;
  const render = () => renderPhotoFormEntry({ app, documentObject });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
  return true;
}
