import {
  buildPhotoFormPrefillUrl,
  resolvePhotoFormVenue
} from './photo-form-core.mjs';
import { readFormConfig } from './config.mjs';

const SELECTOR = '[data-photo-form-entry]';
let initialized = false;

export function readPhotoFormConfig(documentObject = document) {
  return readFormConfig('photo', documentObject);
}

function syncContributionVisibility(detail) {
  const section = detail?.querySelector(':scope > .detail-contribution');
  if (section) section.hidden = !section.querySelector('.detail-contribution__actions > a[href]');
}

function createPhotoFormLink(documentObject, { href, label, entryPoint, className }) {
  const link = documentObject.createElement('a');
  link.className = className;
  link.dataset.photoFormEntry = entryPoint;
  link.dataset.googleFormExternal = 'true';
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
    label: 'Add a new photo',
    entryPoint: 'contribution',
    className: 'detail-contribution__action'
  }));
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
