import { buildCommittedExternalVenueWatchPartyUrl } from './external-watch-party-cta-core.mjs';
import { readWatchPartyFormConfig } from './watch-party-form.js';

const EVENT_NAME = 'cgb:external-venue-committed';
const CTA_SELECTOR = '[data-external-watch-party-cta]';

function removeExisting(documentObject = document) {
  documentObject.querySelector(CTA_SELECTOR)?.remove();
}

export function renderExternalVenueWatchPartyCta({
  detail,
  app = window.CGBApp,
  documentObject = document
} = {}) {
  removeExisting(documentObject);
  const state = app?.getState?.();
  const venueId = String(detail?.venueId || '').trim();
  const gameId = String(detail?.gameId || '').trim();
  if (!venueId || !gameId || state?.selectedVenueId !== venueId || state?.gameId !== gameId) return '';

  const href = buildCommittedExternalVenueWatchPartyUrl({
    config: readWatchPartyFormConfig(documentObject),
    snapshot: state.snapshot,
    gameId,
    venueId
  });
  if (!href) return '';

  const card = documentObject.querySelector('#tray-selected .selected-card');
  if (!card) return '';

  const section = documentObject.createElement('section');
  section.className = 'external-watch-party-cta';
  section.dataset.externalWatchPartyCta = 'true';

  const prompt = documentObject.createElement('p');
  prompt.textContent = 'Is there a watch party going on here?';

  const link = documentObject.createElement('a');
  link.className = 'primary-button';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Submit a Watch Party';

  section.append(prompt, link);
  card.append(section);
  return href;
}

function initialize() {
  document.addEventListener(EVENT_NAME, (event) => {
    renderExternalVenueWatchPartyCta({ detail: event.detail, app: window.CGBApp, documentObject: document });
  });
  window.CGBApp?.subscribe?.('rendered', () => removeExisting(document));
}

initialize();
