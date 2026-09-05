import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import { readFormConfig } from './config.mjs';

const SELECTOR = '[data-cal-bar-nomination-entry]';
let initialized = false;

function readConfig(documentObject = document) {
  return readFormConfig('calBarNomination', documentObject);
}

function contributionCopy() {
  return 'Tell us about this location';
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
  link.textContent = contributionCopy();

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
