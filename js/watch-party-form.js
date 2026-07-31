import {
  buildWatchPartyPrefillUrl,
  normalizeWatchPartyFormConfig,
  resolveWatchPartyFormContext
} from './watch-party-form-core.mjs';

const CTA_SELECTOR = '[data-watch-party-form-entry-point]';
const CONFIG_STORAGE_KEY = 'cgb_watch_party_form_config';
const CONFIG_META_NAMES = Object.freeze({
  formUrl: 'cgb-watch-party-form-url',
  venueIdEntry: 'cgb-watch-party-venue-id-entry',
  venueNameEntry: 'cgb-watch-party-venue-name-entry',
  gameIdEntry: 'cgb-watch-party-game-id-entry'
});

function metaContent(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function storageGet(storageObject, key) {
  try { return storageObject?.getItem(key) || ''; } catch (_) { return ''; }
}

function storageSet(storageObject, key, value) {
  try { storageObject?.setItem(key, value); return true; } catch (_) { return false; }
}

function storageRemove(storageObject, key) {
  try { storageObject?.removeItem(key); } catch (_) {}
}

export function readWatchPartyFormConfig(
  documentObject = document,
  storageObject = window.localStorage
) {
  const stored = storageGet(storageObject, CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (normalizeWatchPartyFormConfig(parsed)) return parsed;
    } catch (_) {}
  }

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
  documentObject = document,
  storageObject = window.localStorage
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
    readWatchPartyFormConfig(documentObject, storageObject),
    context
  );

  if (!href) return '';

  const section = documentObject.createElement('section');
  section.className = 'watch-party-contribution';
  section.dataset.watchPartyFormEntryPoint = 'true';

  const prompt = documentObject.createElement('p');
  prompt.className = 'watch-party-contribution__prompt';
  prompt.textContent = 'Is there a watch party going on?';

  const link = documentObject.createElement('a');
  link.className = 'primary-button watch-party-contribution__action';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Submit a Watch Party';

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

  window.CGBWatchPartyForm = Object.freeze({
    setConfig(config) {
      const normalized = normalizeWatchPartyFormConfig(config);
      if (!normalized) throw new Error('invalid_watch_party_form_config');
      if (!storageSet(window.localStorage, CONFIG_STORAGE_KEY, JSON.stringify(normalized))) {
        throw new Error('watch_party_form_config_storage_unavailable');
      }
      render();
      return normalized;
    },
    clearConfig() {
      storageRemove(window.localStorage, CONFIG_STORAGE_KEY);
      render();
    },
    getConfig() {
      return readWatchPartyFormConfig(document, window.localStorage);
    }
  });

  render();
}

initializeWatchPartyFormEntryPoint();
