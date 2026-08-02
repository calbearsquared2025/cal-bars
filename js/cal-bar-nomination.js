import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';

const SELECTOR = '[data-cal-bar-nomination-entry]';

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

export function renderCalBarNominationEntry({ app = window.CGBApp, documentObject = document } = {}) {
  documentObject.querySelector(SELECTOR)?.remove();
  const state = app?.getState?.();
  if (!state?.detailMode) return '';
  const venue = resolveCalBarNominationVenue(state.snapshot, state.selectedVenueId);
  const href = buildCalBarNominationPrefillUrl(readConfig(documentObject), venue);
  if (!href) return '';

  const detail = documentObject.querySelector('#venue-detail');
  if (!detail) return '';
  const section = documentObject.createElement('section');
  section.className = 'watch-party-contribution';
  section.dataset.calBarNominationEntry = 'true';

  const prompt = documentObject.createElement('p');
  prompt.className = 'watch-party-contribution__prompt';
  prompt.textContent = 'Does this place feel like a Cal Bar? Tell us why.';

  const link = documentObject.createElement('a');
  link.className = 'secondary-button watch-party-contribution__action';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Nominate as a Cal Bar';

  section.append(prompt, link);
  detail.append(section);
  return href;
}

function initialize() {
  const app = window.CGBApp;
  if (!app?.subscribe) return;
  const render = () => renderCalBarNominationEntry({ app, documentObject: document });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
}

initialize();
