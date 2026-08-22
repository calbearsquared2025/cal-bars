import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';

const SELECTOR = '[data-cal-bar-nomination-entry]';
let initialized = false;

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function readConfig(documentObject = document) {
  return {
    formUrl: meta('cgb-cal-bar-nomination-form-url', documentObject),
    venueIdEntry: meta('cgb-cal-bar-nomination-venue-id-entry', documentObject),
    venueNameEntry: meta('cgb-cal-bar-nomination-venue-name-entry', documentObject)
  };
}

function contributionCopy(venueType) {
  return venueType === 'cal_bar'
    ? 'Tell us what makes this Cal Bar special'
    : 'Is this your local Cal Bar?';
}

export function renderCalBarNominationEntry({ app = window.CGBApp, documentObject = document } = {}) {
  const existing = documentObject.querySelector(SELECTOR);
  const existingDetail = existing?.closest?.('#venue-detail');
  existing?.remove();
  if (existingDetail) {
    const section = existingDetail.querySelector(':scope > .detail-contribution');
    if (section) section.hidden = !section.querySelector('.detail-contribution__actions > a[href]');
  }
  const state = app?.getState?.();
  if (!state?.detailMode) return '';
  const venue = resolveCalBarNominationVenue(state.snapshot, state.selectedVenueId);
  const href = buildCalBarNominationPrefillUrl(readConfig(documentObject), venue);
  if (!href || !venue) return '';

  const detail = documentObject.querySelector('#venue-detail');
  if (!detail) return '';
  const link = documentObject.createElement('a');
  link.className = 'detail-contribution__action';
  link.dataset.calBarNominationEntry = 'true';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = contributionCopy(venue.venueType);

  const actions = detail.querySelector(':scope > .detail-contribution > .detail-contribution__actions');
  if (!actions) return '';
  actions.append(link);
  detail.querySelector(':scope > .detail-contribution').hidden = false;
  return href;
}

export function initializeCalBarNominationEntry({
  app = window.CGBApp,
  documentObject = document
} = {}) {
  if (initialized || !app?.subscribe) return false;
  initialized = true;
  const render = () => renderCalBarNominationEntry({ app, documentObject });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
  return true;
}
