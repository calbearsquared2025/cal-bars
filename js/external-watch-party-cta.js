import {
  buildCommittedExternalVenueWatchPartyUrl,
  observeExternalVenueCommit
} from './external-watch-party-cta-core.mjs';
import {
  INTENT_SELECTIONS_STORAGE_KEY,
  withStoredSelection
} from './fan-intent-core.mjs';
import { initializeExternalSearchStateGuard } from './external-search-state-guard.js';

const CTA_SELECTOR = '[data-external-watch-party-cta]';
const STYLE_HREF = 'css/external-watch-party-cta.css';
let pendingExternalCommit = null;
let lastCommittedKey = '';

function metaContent(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function readConfig(documentObject = document) {
  return {
    formUrl: metaContent('cgb-watch-party-form-url', documentObject),
    venueIdEntry: metaContent('cgb-watch-party-venue-id-entry', documentObject),
    venueNameEntry: metaContent('cgb-watch-party-venue-name-entry', documentObject),
    gameIdEntry: metaContent('cgb-watch-party-game-id-entry', documentObject)
  };
}

function ensureStylesheet(documentObject = document) {
  if (documentObject.querySelector(`link[href="${STYLE_HREF}"]`)) return;
  const link = documentObject.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  documentObject.head?.append(link);
}

function removeExisting(documentObject = document) {
  documentObject.querySelector(CTA_SELECTOR)?.remove();
}

function persistCommittedFanIntent(state, gameId, venueId) {
  if (!state?.fanIntent) return false;
  const selections = withStoredSelection(state.fanIntent.selections, gameId, venueId);
  state.fanIntent.selections = selections;
  try {
    window.localStorage.setItem(INTENT_SELECTIONS_STORAGE_KEY, JSON.stringify(selections));
  } catch (_) {}
  return selections[gameId] === venueId;
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
    config: readConfig(documentObject),
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
  ensureStylesheet(document);
  const app = window.CGBApp;
  if (!app?.subscribe) return;
  initializeExternalSearchStateGuard({ app, documentObject: document });

  app.subscribe('rendered', () => {
    removeExisting(document);
    const state = app.getState?.();
    const observation = observeExternalVenueCommit(pendingExternalCommit, state);
    pendingExternalCommit = observation.pending;
    if (!observation.committed) return;

    const key = `${observation.committed.gameId}:${observation.committed.venueId}`;
    if (key === lastCommittedKey) return;
    lastCommittedKey = key;

    const adopted = persistCommittedFanIntent(
      state,
      observation.committed.gameId,
      observation.committed.venueId
    );

    renderExternalVenueWatchPartyCta({
      detail: observation.committed,
      app,
      documentObject: document
    });

    if (adopted) queueMicrotask(() => app.render());
  });
}

initialize();
