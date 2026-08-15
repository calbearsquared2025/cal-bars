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

export function renderPhotoFormEntry({ app = window.CGBApp, documentObject = document } = {}) {
  const existing = documentObject.querySelector(SELECTOR);
  const detail = existing?.closest?.('#venue-detail') || documentObject.querySelector('#venue-detail');
  existing?.remove();
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
  const link = documentObject.createElement('a');
  link.className = 'detail-contribution__action';
  link.dataset.photoFormEntry = 'true';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Submit a Photo';
  actions.append(link);
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
