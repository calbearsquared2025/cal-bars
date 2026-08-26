import { appState, subscribeAppEvent, waitForApplicationReady } from './app-state.mjs';
import { getFanCount } from './core.mjs';
import {
  BROWSER_ID_STORAGE_KEY,
  INTENT_SELECTIONS_STORAGE_KEY,
  compactListFanCountCopy,
  createBrowserId,
  detailPresenceCopy,
  isValidBrowserId,
  parseStoredSelections,
  validateFanIntentResponse
} from './fan-intent-core.mjs';
import { createFanIntentController } from './fan-intent-controller.mjs';
import { createIcon } from './icons.mjs';
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
  const venueIds = new Set(appState.snapshot.venues.map((venue) => venue.venue_id));
  const openGameIds = new Set(appState.snapshot.games
    .filter((game) => game.game_status === 'upcoming')
    .map((game) => game.game_id));
  const next = Object.fromEntries(Object.entries(appState.fanIntent.selections)
    .filter(([gameId, venueId]) => openGameIds.has(gameId) && venueIds.has(venueId)));
  if (JSON.stringify(next) !== JSON.stringify(appState.fanIntent.selections)) {
    appState.fanIntent.selections = next;
    persistSelections();
  }
}

function currentGame() {
  return appState.snapshot?.games.find((game) => game.game_id === appState.gameId) || null;
}

function venueById(venueId) {
  return appState.snapshot?.venues.find((venue) => venue.venue_id === venueId) || null;
}

function selectedVenue() {
  return venueById(appState.selectedVenueId);
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

function syncDetailPresence(venueId, isSelected) {
  if (appState.selectedVenueId !== venueId) return;
  const detail = document.querySelector('#venue-detail');
  if (!detail || detail.dataset.venueId !== venueId) return;
  const card = detail.querySelector(':scope > .activity-card');
  if (!card) return;
  let presence = card.querySelector(':scope > .activity-card__presence');
  const count = getFanCount(appState.snapshot, appState.gameId, venueId);
  if (!isSelected && count <= 0 && !gameAllowsIntent()) {
    presence?.remove();
    return;
  }
  if (!presence) {
    presence = document.createElement('p');
    presence.className = 'activity-card__presence';
    const current = card.querySelector(':scope > strong');
    if (current) current.insertAdjacentElement('afterend', presence);
    else card.prepend(presence);
  }
  presence.textContent = isSelected
    ? detailPresenceCopy(count)
    : count <= 0
      ? 'Tap “I’ll be here” to let other Bears know you’re coming.'
      : 'Click "I\'ll be here" below to join them.';
}

function renderIntentButton(button) {
  const venueId = button.dataset.venueId;
  if (!venueId) return;
  const isSelected = activeVenueId() === venueId;
  const pending = appState.fanIntent.pending;
  const isPendingTarget = pending?.gameId === appState.gameId && pending?.venueId === venueId;
  const showSelectedContent = isSelected && !isPendingTarget;

  button.disabled = Boolean(pending) || !gameAllowsIntent();
  button.removeAttribute('title');
  button.setAttribute('aria-pressed', String(isSelected));
  button.dataset.intentState = isSelected ? 'selected' : 'available';
  button.classList.toggle('is-pending', Boolean(isPendingTarget));
  button.setAttribute('aria-label', showSelectedContent ? 'You’ll be here. Undo selection' : 'I’ll be here');

  const main = document.createElement('span');
  main.className = 'intent-button__main';
  if (showSelectedContent) main.append(createIcon('check'), document.createTextNode('You’ll be here'));
  else main.textContent = 'I’ll be here';
  button.replaceChildren(main);
  if (showSelectedContent) {
    const undo = document.createElement('span');
    undo.className = 'intent-button__undo';
    undo.textContent = 'Undo';
    button.append(undo);
  }

  syncDetailPresence(venueId, isSelected);
  createRetryPanel(button, venueId);
}

function replaceTextLines(element, lines) {
  element.replaceChildren();
  const seasonPrompt = element.classList.contains('venue-activity-history') &&
    lines.length === 2 &&
    /last season\.$/i.test(lines[0]) &&
    /^Be part of the \d{4} season\.$/i.test(lines[1]);
  element.classList.toggle('venue-activity-history--season-prompt', seasonPrompt);

  if (seasonPrompt) {
    lines.forEach((line, index) => {
      const copy = document.createElement('span');
      copy.className = index === 0
        ? 'venue-activity-history__history'
        : 'venue-activity-history__cta';
      copy.textContent = line;
      element.append(copy);
    });
    return;
  }

  lines.forEach((line, index) => {
    if (index > 0) element.append(document.createElement('br'));
    element.append(document.createTextNode(line));
  });
}

function activityPresentation(game, venue, currentCopy) {
  return venueActivityPresentation({
    snapshot: appState.snapshot,
    game,
    venue,
    currentCopy
  });
}

function renderLocationCardActivity(game) {
  document.querySelectorAll('.location-card[data-venue-id]').forEach((card) => {
    const venue = venueById(card.dataset.venueId);
    const countLine = card.querySelector('.location-card__count');
    if (!venue || !countLine) return;

    const migratedHistory = Boolean(legacyActivitySeason(venue));
    const description = card.querySelector('.location-card__description');
    if (description && migratedHistory) description.hidden = true;

    const presentation = activityPresentation(game, venue, countLine.textContent);
    if (game.game_status === 'completed') {
      countLine.textContent = presentation.primary;
    } else {
      const fanCount = getFanCount(appState.snapshot, appState.gameId, venue.venue_id);
      countLine.textContent = compactListFanCountCopy(fanCount);
    }

    const compactHistory = game.game_status === 'completed'
      ? []
      : presentation.secondary.slice(0, 1);
    let history = card.querySelector('.location-card__history');
    if (!compactHistory.length) {
      history?.remove();
      return;
    }
    if (!history) {
      history = document.createElement('span');
      history.className = 'location-card__history';
      card.append(history);
    }
    replaceTextLines(history, compactHistory);
  });
}

function renderVenueActivity() {
  const game = currentGame();
  if (!game || !appState.snapshot) return;
  renderLocationCardActivity(game);
}

function renderIntentButtons() {
  if (!appState.snapshot) return;
  document.querySelectorAll('.intent-button[data-venue-id]').forEach(renderIntentButton);
}

function renderApplication() {
  window.CGBApp?.render();
}

async function refreshAggregates() {
  if (appState.fanIntent.pending || document.visibilityState === 'hidden') return false;
  return window.CGBSnapshotRefresh?.refresh?.() || false;
}

async function handleDocumentClick(event) {
  const retryButton = event.target.closest('.intent-retry[data-venue-id]');
  if (retryButton) {
    event.preventDefault();
    await controller?.retryIntent();
    return;
  }

  const intentButton = event.target.closest('.intent-button[data-venue-id]');
  if (!intentButton) return;
  event.preventDefault();
  await controller?.performIntent(intentButton.dataset.venueId);
}

export async function ensureFanIntentAttendance(venueId, gameId = appState.gameId) {
  if (!controller || !venueId || !gameId || gameId !== appState.gameId) return false;
  return controller.ensureIntent(venueId);
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
  await waitForApplicationReady();
  subscribeAppEvent('rendered', renderVenueActivity);
  renderVenueActivity();

  initializeIdentity();
  pruneSelections();

  controller = createFanIntentController({
    getState: () => appState,
    postIntent,
    persistSelections,
    render: renderApplication,
    showStatus
  });

  subscribeAppEvent('rendered', renderIntentButtons);
  document.addEventListener('click', handleDocumentClick);
  startSynchronization();

  const selectionChanged = window.CGBApp?.restoreSelection({
    preserveCurrentWhenEmpty: false
  }) === true;
  if (selectionChanged) renderApplication();
  else renderIntentButtons();
}

window.CGBFanIntent = Object.freeze({
  ensureAttendance: ensureFanIntentAttendance,
  clearLocalIdentity() {
    storageRemove(BROWSER_ID_STORAGE_KEY);
    storageRemove(INTENT_SELECTIONS_STORAGE_KEY);
    location.reload();
  },
  refresh: refreshAggregates
});

bootFanIntent().catch((error) => console.error('Fan Intent initialization failed.', error));
