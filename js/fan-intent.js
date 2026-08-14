import { appState, subscribeAppEvent, waitForApplicationReady } from './app-state.mjs';
import { getFanCount } from './core.mjs';
import {
  BROWSER_ID_STORAGE_KEY,
  INTENT_SELECTIONS_STORAGE_KEY,
  compactListFanCountCopy,
  createBrowserId,
  isValidBrowserId,
  parseStoredSelections,
  validateFanIntentResponse
} from './fan-intent-core.mjs';
import { createFanIntentController } from './fan-intent-controller.mjs';
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

function syncDetailShareAction(button, isSelected) {
  const row = button.closest('.detail-primary-actions');
  const share = row?.querySelector(':scope > .detail-share');
  if (!share) return;
  const label = isSelected ? 'Invite Bears' : 'Share';
  const textNode = Array.from(share.childNodes).find((node) => node.nodeType === 3);
  if (textNode) textNode.textContent = label;
  else share.append(document.createTextNode(label));
  share.setAttribute('aria-label', label);
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
  syncDetailShareAction(button, isSelected);
  createRetryPanel(button, venueId);
}

function replaceTextLines(element, lines) {
  element.replaceChildren();
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

function renderSelectedCardActivity(game) {
  const card = document.querySelector('.selected-card[data-venue-id]');
  const venue = venueById(card?.dataset.venueId);
  const countLine = card?.querySelector('.bear-count');
  if (!card || !venue || !countLine) return;

  const migratedHistory = Boolean(legacyActivitySeason(venue));
  const description = card.querySelector('.venue-description');
  if (description && migratedHistory) description.hidden = true;

  const presentation = activityPresentation(game, venue, countLine.textContent);
  countLine.textContent = presentation.primary;

  let history = card.querySelector('.venue-activity-history');
  if (!presentation.secondary.length) {
    history?.remove();
    return;
  }
  if (!history) {
    history = document.createElement('p');
    history.className = 'venue-activity-history';
    countLine.insertAdjacentElement('afterend', history);
  }
  replaceTextLines(history, presentation.secondary);
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
  renderSelectedCardActivity(game);
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

function removePostJoinInvitation() {
  document.querySelectorAll('.post-join-invitation').forEach((panel) => panel.remove());
  document.querySelectorAll('.action-row.has-post-join-invitation')
    .forEach((row) => row.classList.remove('has-post-join-invitation'));
}

function renderPostJoinInvitation() {
  removePostJoinInvitation();
  const venueId = activeVenueId();
  if (
    !venueId ||
    appState.fanIntent.pending ||
    appState.selectedVenueId !== venueId
  ) return;

  const venue = venueById(venueId);
  const detailMode = appState.detailMode;
  const surface = detailMode
    ? document.querySelector('#venue-detail')
    : document.querySelector('#tray-selected');
  const row = surface?.querySelector(`.action-row[data-venue-id="${CSS.escape(venueId)}"]`);
  const intent = row?.querySelector(':scope > .intent-button');
  if (!venue || !row || !intent) return;
  const firstBear = getFanCount(appState.snapshot, appState.gameId, venueId) === 1;

  const panel = document.createElement('section');
  panel.className = 'post-join-invitation';
  panel.setAttribute('aria-live', 'polite');
  const heading = document.createElement('strong');
  heading.textContent = firstBear
    ? "You're starting the Cal crowd here."
    : "You're in. Bring more Bears.";
  const copy = document.createElement('p');
  copy.textContent = firstBear
    ? 'Invite other Bears to join you.'
    : 'Share this spot so other Cal fans can find you.';
  panel.append(heading, copy);

  if (!detailMode) {
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'secondary-button post-join-share';
    share.textContent = firstBear ? 'Invite other Bears' : 'Share this location';
    share.addEventListener('click', () => window.CGBApp?.shareVenue?.(venue));
    panel.append(share);
  }

  row.classList.add('has-post-join-invitation');
  if (detailMode) {
    panel.classList.add('detail-post-join-invitation');
    row.insertAdjacentElement('beforebegin', panel);
  } else {
    intent.insertAdjacentElement('afterend', panel);
  }
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
  subscribeAppEvent('rendered', renderPostJoinInvitation);
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
