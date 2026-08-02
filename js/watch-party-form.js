import { initializeCalBarNominationEntry } from './cal-bar-nomination.js';
import { initializeListingUpdateEntry } from './listing-update.js';
import './external-watch-party-cta.js';
import { getWatchParty } from './core.mjs';
import {
  buildWatchPartyPrefillUrl,
  resolveWatchPartyFormContext
} from './watch-party-form-core.mjs';

const CTA_SELECTOR = '[data-watch-party-form-entry-point]';
const CONFIG_META_NAMES = Object.freeze({
  formUrl: 'cgb-watch-party-form-url',
  venueIdEntry: 'cgb-watch-party-venue-id-entry',
  venueNameEntry: 'cgb-watch-party-venue-name-entry',
  gameIdEntry: 'cgb-watch-party-game-id-entry'
});

function metaContent(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

export function readWatchPartyFormConfig(documentObject = document) {
  return {
    formUrl: metaContent(CONFIG_META_NAMES.formUrl, documentObject),
    venueIdEntry: metaContent(CONFIG_META_NAMES.venueIdEntry, documentObject),
    venueNameEntry: metaContent(CONFIG_META_NAMES.venueNameEntry, documentObject),
    gameIdEntry: metaContent(CONFIG_META_NAMES.gameIdEntry, documentObject)
  };
}

function removeExistingEntryPoint(detail) {
  detail.querySelector(CTA_SELECTOR)?.remove();
  detail.querySelector('.preview-note')?.remove();
}

export function renderWatchPartyFormEntryPoint({
  app = window.CGBApp,
  documentObject = document
} = {}) {
  const detail = documentObject.querySelector('#venue-detail');
  if (!detail) return '';

  removeExistingEntryPoint(detail);

  const state = app?.getState?.();
  const context = resolveWatchPartyFormContext({
    snapshot: state?.snapshot,
    gameId: state?.gameId,
    selectedVenueId: state?.selectedVenueId,
    detailMode: state?.detailMode
  });
  const href = buildWatchPartyPrefillUrl(
    readWatchPartyFormConfig(documentObject),
    context
  );

  if (!href) return '';

  const existingParty = getWatchParty(
    state?.snapshot,
    context?.gameId,
    context?.venueId
  );

  const section = documentObject.createElement('section');
  section.className = 'watch-party-contribution';
  section.dataset.watchPartyFormEntryPoint = 'true';

  const prompt = documentObject.createElement('p');
  prompt.className = 'watch-party-contribution__prompt';
  prompt.textContent = existingParty
    ? 'Is there another watch party going on?'
    : 'Is there a watch party going on?';

  const link = documentObject.createElement('a');
  link.className = 'primary-button watch-party-contribution__action';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = existingParty
    ? 'Add Another Watch Party'
    : 'Submit a Watch Party';

  section.append(prompt, link);
  detail.append(section);
  return href;
}

function initializeWatchPartyFormEntryPoint() {
  const app = window.CGBApp;
  if (!app?.subscribe) return;

  const render = () => renderWatchPartyFormEntryPoint({ app, documentObject: document });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
  initializeCalBarNominationEntry({ app, documentObject: document });
  initializeListingUpdateEntry({ app, documentObject: document });
}

initializeWatchPartyFormEntryPoint();
