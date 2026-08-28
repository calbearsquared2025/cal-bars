import {
  buildListingUpdatePrefillUrl,
  resolveListingUpdateVenue
} from './listing-update-core.mjs';

const SELECTOR = '[data-listing-update-entry]';
let initialized = false;

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function readConfig(documentObject = document) {
  return {
    formUrl: meta('cgb-listing-update-form-url', documentObject),
    venueIdEntry: meta('cgb-listing-update-venue-id-entry', documentObject),
    venueNameEntry: meta('cgb-listing-update-venue-name-entry', documentObject)
  };
}

export function renderListingUpdateEntry({
  app = window.CGBApp,
  documentObject = document
} = {}) {
  const existing = documentObject.querySelector(SELECTOR);
  const existingDetail = existing?.closest?.('#venue-detail');
  existing?.remove();
  if (existingDetail) {
    const section = existingDetail.querySelector(':scope > .detail-contribution');
    if (section) section.hidden = !section.querySelector('.detail-contribution__actions > a[href]');
  }
  const state = app?.getState?.();
  if (!state?.detailMode) return '';
  const venue = resolveListingUpdateVenue(state.snapshot, state.selectedVenueId);
  const href = buildListingUpdatePrefillUrl(readConfig(documentObject), venue);
  if (!href) return '';

  const detail = documentObject.querySelector('#venue-detail');
  if (!detail) return '';
  const link = documentObject.createElement('a');
  link.className = 'detail-contribution__action';
  link.dataset.listingUpdateEntry = 'true';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Suggest an update or report an issue';

  const actions = detail.querySelector(':scope > .detail-contribution > .detail-contribution__actions');
  if (!actions) return '';
  actions.append(link);
  detail.querySelector(':scope > .detail-contribution').hidden = false;
  return href;
}

export function initializeListingUpdateEntry({
  app = window.CGBApp,
  documentObject = document
} = {}) {
  if (initialized || !app?.subscribe) return false;
  initialized = true;
  const render = () => renderListingUpdateEntry({ app, documentObject });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
  return true;
}