import { appState, subscribeAppEvent, waitForApplicationReady } from './app-state.mjs';
import {
  BROWSER_ID_STORAGE_KEY,
  INTENT_SELECTIONS_STORAGE_KEY,
  createBrowserId,
  isValidBrowserId,
  parseStoredSelections,
  validateFanIntentResponse
} from './fan-intent-core.mjs';
import { createFanIntentController } from './fan-intent-controller.mjs';
import { canonicalizeStoredSelections } from './id-alias-core.mjs';
import { legacyActivitySeason, venueActivityPresentation } from './venue-activity-core.mjs';

const DATA_URL_KEY = 'cgb_v2_public_data_url';
const WRITE_TIMEOUT_MS = 10000;

let controller = null;

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (_) {}
}

function storageRemove(key) {
  try { window.localStorage.removeItem(key); } catch (_) {}
}

function configuredEndpoint() {
  return storageGet(DATA_URL_KEY)?.trim() ||
    document.querySelector('meta[name="cgb-data-endpoint"]')?.content.trim() || '';
}

function initializeIdentity() {
  const stored = storageGet(BROWSER_ID_STORAGE_KEY);
  appState.fanIntent.browserId = isValidBrowserId(stored) ? stored : createBrowserId(window.crypto);
  storageSet(BROWSER_ID_STORAGE_KEY, appState.fanIntent.browserId);
  appState.fanIntent.selections = parseStoredSelections(storageGet(INTENT_SELECTIONS_STORAGE_KEY));
}

function persistSelections(selections = appState.fanIntent.selections) {
  storageSet(INTENT_SELECTIONS_STORAGE_KEY, JSON.stringify(selections));
}

function pruneSelections() {
  const canonicalSelections = canonicalizeStoredSelections(
    appState.snapshot,
    appState.fanIntent.selections
  );
  const venueIds = new Set(appState.snapshot.venues.map((venue) => venue.venue_id));
  const openGameIds = new Set(appState.snapshot.games
    .filter((game) => game.game_status === 'upcoming')
    .map((game) => game.game_id));
  const next = Object.fromEntries(Object.entries(canonicalSelections)
    .filter(([gameId, venueId]) => openGameIds.has(gameId) && venueIds.has(venueId)));
  if (JSON.stringify(next) !== JSON.stringify(appState.fanIntent.selections)) {
    appState.fanIntent.selections = next;
    persistSelections();
  }
}

function currentGame() {
  return appState.snapshot?.games.find((game) => game.game_id === appState.gameId) || null;
}

function selectedVenue() {
  return appState.snapshot?.venues.find((venue) => venue.venue_id === appState.selectedVenueId) || null;
}

function gameAllowsIntent() {
  return currentGame()?.game_status === 'upcoming';
}

function activeVenueId(gameId = appState.gameId) {
  return appState.fanIntent.selections[gameId] || null;
}

async function fetchJson(url, options = {}, timeoutMs = WRITE_TIMEOUT_MS) {
  const abortController = new AbortController();
  const timeout = window.setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: abortController.signal, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function postIntent(operation) {
  const endpoint = configuredEndpoint();
  if (!endpoint) {
    const error = new Error('not_configured');
    error.code = 'not_configured';
    throw error;
  }
  const response = await fetchJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      action: operation.action,
      browserId: appState.fanIntent.browserId,
      gameId: operation.gameId,
      venueId: operation.venueId
    })
  });
  if (!response?.ok) {
    const error = new Error(response?.error || 'write_failed');
    error.code = response?.error || 'write_failed';
    throw error;
  }
  if (!validateFanIntentResponse(response)) throw new Error('invalid_write_response');
  return response;
}

function showStatus(message, timeout = 5000) {
  window.CGBApp?.showStatus(message, timeout);
}

function createRetryPanel(button, venueId) {
  const row = button.closest('.action-row');
  if (!row) return;
  let panel = row.parentElement.querySelector(':scope > .intent-feedback');
  const retry = appState.fanIntent.retry;
  const retryMatches = retry && retry.gameId === appState.gameId && retry.venueId === venueId;
  if (!retryMatches) {
    panel?.remove();
    return;
  }
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'intent-feedback';
    panel.setAttribute('role', 'alert');
    row.insertAdjacentElement('afterend', panel);
  }
  const panelState = `${retry.action}:${retry.message}`;
  if (panel.dataset.state === panelState) return;
  panel.dataset.state = panelState;
  panel.replaceChildren();
  const message = document.createElement('span');
  message.textContent = retry.message;
  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'text-button intent-retry';
  retryButton.dataset.venueId = venueId;
  retryButton.textContent = 'Retry';
  panel.append(message, retryButton);
}

function renderIntentButton(button) {
  const venueId = button.dataset.venueId;
  if (!venueId) return;
  const isSelected = activeVenueId() === venueId;
  const pending = appState.fanIntent.pending;
  const isPendingTarget = pending?.gameId === appState.gameId && pending?.venueId === venueId;

  button.disabled = Boolean(pending) || !gameAllowsIntent();
  button.removeAttribute('title');
  button.setAttribute('aria-pressed', String(isSelected));
  button.dataset.intentState = isSelected ? 'selected' : 'available';
  button.classList.toggle('is-pending', Boolean(isPendingTarget));
  button.textContent = isPendingTarget
    ? 'Saving…'
    : isSelected
      ? 'You’ll be here · Undo'
      : gameAllowsIntent()
        ? 'I’ll be here'
        : 'Selections closed';
  createRetryPanel(button, venueId);
}

function renderVenueActivity() {
  const activity = document.querySelector('.activity-card');
  const game = currentGame();
  const venue = selectedVenue();
  if (!activity || !game || !venue) return;

  const primary = activity.querySelector('strong');
  const secondary = activity.querySelector('p');
  if (!primary || !secondary) return;

  const migratedHistorySeason = legacyActivitySeason(venue);
  const description = document.querySelector('.detail-description');
  if (description && migratedHistorySeason) description.hidden = true;

  const presentation = venueActivityPresentation({
    snapshot: appState.snapshot,
    game,
    venue,
    currentCopy: primary.textContent
  });
  primary.textContent = presentation.primary;
  secondary.replaceChildren();
  secondary.hidden = presentation.secondary.length === 0;
  presentation.secondary.forEach((line, index) => {
    if (index > 0) secondary.append(document.createElement('br'));
    secondary.append(document.createTextNode(line));
  });
}

function renderFanIntentUi() {
  if (!appState.snapshot) return;
  document.querySelectorAll('.intent-button[data-venue-id]').forEach(renderIntentButton);
  renderVenueActivity();
}

function renderApplication() {
  window.CGBApp?.render();
}

async function refreshAggregates() {
  if (appState.fanIntent.pending || document.visibilityState === 'hidden') return false;
  return window.CGBSnapshotRefresh?.refresh?.() || false;
}

function handleDocumentClick(event) {
  const retryButton = event.target.closest('.intent-retry[data-venue-id]');
  if (retryButton) {
    event.preventDefault();
    controller?.retryIntent();
    return;
  }

  const intentButton = event.target.closest('.intent-button[data-venue-id]');
  if (!intentButton) return;
  event.preventDefault();
  controller?.performIntent(intentButton.dataset.venueId);
}

function startSynchronization() {
  window.addEventListener('storage', (event) => {
    if (event.key === INTENT_SELECTIONS_STORAGE_KEY) {
      appState.fanIntent.selections = parseStoredSelections(event.newValue);
      pruneSelections();
      window.CGBApp?.restoreSelection({ preserveCurrentWhenEmpty: false });
      renderApplication();
    }
    if (event.key === BROWSER_ID_STORAGE_KEY && isValidBrowserId(event.newValue)) {
      appState.fanIntent.browserId = event.newValue;
    }
  });
}

async function bootFanIntent() {
  initializeIdentity();
  await waitForApplicationReady();
  pruneSelections();

  controller = createFanIntentController({
    getState: () => appState,
    postIntent,
    persistSelections,
    render: renderApplication,
    showStatus
  });

  subscribeAppEvent('rendered', renderFanIntentUi);
  document.addEventListener('click', handleDocumentClick);
  startSynchronization();

  const selectionChanged = window.CGBApp?.restoreSelection({
    preserveCurrentWhenEmpty: false
  }) === true;
  if (selectionChanged) renderApplication();
  else renderFanIntentUi();
}

window.CGBFanIntent = Object.freeze({
  clearLocalIdentity() {
    storageRemove(BROWSER_ID_STORAGE_KEY);
    storageRemove(INTENT_SELECTIONS_STORAGE_KEY);
    location.reload();
  },
  refresh: refreshAggregates
});

bootFanIntent().catch((error) => console.error('Fan Intent initialization failed.', error));
