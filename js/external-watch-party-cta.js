import {
  buildCommittedExternalVenueWatchPartyUrl,
  observeExternalVenueCommit
} from './external-watch-party-cta-core.mjs';
import { readWatchPartyFormConfig } from './watch-party-form.js';

const CTA_SELECTOR = '[data-external-watch-party-cta]';
let pendingExternalCommit = null;
let lastCommittedKey = '';

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
  const app = window.CGBApp;
  if (!app?.subscribe) return;

  app.subscribe('rendered', () => {
    removeExisting(document);
    const state = app.getState?.();
    const observation = observeExternalVenueCommit(pendingExternalCommit, state);
    pendingExternalCommit = observation.pending;
    if (!observation.committed) return;

    const key = `${observation.committed.gameId}:${observation.committed.venueId}`;
    if (key === lastCommittedKey) return;
    lastCommittedKey = key;
    renderExternalVenueWatchPartyCta({
      detail: observation.committed,
      app,
      documentObject: document
    });
  });
}

initialize();
