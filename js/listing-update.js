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
  documentObject.querySelector(SELECTOR)?.remove();
  const state = app?.getState?.();
  if (!state?.detailMode) return '';
  const venue = resolveListingUpdateVenue(state.snapshot, state.selectedVenueId);
  const href = buildListingUpdatePrefillUrl(readConfig(documentObject), venue);
  if (!href) return '';

  const detail = documentObject.querySelector('#venue-detail');
  if (!detail) return '';
  const section = documentObject.createElement('section');
  section.className = 'watch-party-contribution';
  section.dataset.listingUpdateEntry = 'true';

  const link = documentObject.createElement('a');
  link.className = 'secondary-button watch-party-contribution__action';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Report a problem with this listing.';

  section.append(link);
  detail.append(section);
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
