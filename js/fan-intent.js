import {
  bearCountCopy,
  getFanCount,
  getHistoryCount,
  historyCountCopy,
  selectDefaultGame,
  validateSnapshotShape,
  venueTypeLabel
} from './core.mjs';
import {
  BROWSER_ID_STORAGE_KEY,
  INTENT_SELECTIONS_STORAGE_KEY,
  adjustFanCount,
  applyAggregateResponse,
  createBrowserId,
  intentAction,
  isValidBrowserId,
  parseStoredSelections,
  validateFanIntentResponse,
  withStoredSelection
} from './fan-intent-core.mjs';

const DATA_URL_KEY = 'cgb_v2_public_data_url';
const AGGREGATE_REFRESH_MS = 30000;
const WRITE_TIMEOUT_MS = 10000;

const fanState = {
  snapshot: null,
  browserId: null,
  selections: {},
  gameId: null,
  pending: null,
  retry: null,
  restorePending: true,
  observer: null,
  refreshTimer: null,
  patchFrame: null
};

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
  fanState.browserId = isValidBrowserId(stored) ? stored : createBrowserId(window.crypto);
  storageSet(BROWSER_ID_STORAGE_KEY, fanState.browserId);
  fanState.selections = parseStoredSelections(storageGet(INTENT_SELECTIONS_STORAGE_KEY));
}

function persistSelections() {
  storageSet(INTENT_SELECTIONS_STORAGE_KEY, JSON.stringify(fanState.selections));
}

function resolveGameId() {
  const requested = new URLSearchParams(location.search).get('game');
  if (fanState.snapshot?.games.some((game) => game.game_id === requested)) return requested;
  return selectDefaultGame(fanState.snapshot?.games || [])?.game_id || fanState.snapshot?.games?.[0]?.game_id || null;
}

function currentGame() {
  return fanState.snapshot?.games.find((game) => game.game_id === fanState.gameId) || null;
}

function gameAllowsIntent() {
  return currentGame()?.game_status === 'upcoming';
}

function activeVenueId(gameId = fanState.gameId) {
  return fanState.selections[gameId] || null;
}

function pruneSelections() {
  const venueIds = new Set(fanState.snapshot.venues.map((venue) => venue.venue_id));
  const openGameIds = new Set(fanState.snapshot.games
    .filter((game) => game.game_status === 'upcoming')
    .map((game) => game.game_id));
  const next = Object.fromEntries(Object.entries(fanState.selections)
    .filter(([gameId, venueId]) => openGameIds.has(gameId) && venueIds.has(venueId)));
  if (JSON.stringify(next) !== JSON.stringify(fanState.selections)) {
    fanState.selections = next;
    persistSelections();
  }
}

async function fetchJson(url, options = {}, timeoutMs = WRITE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadSnapshot() {
  const endpoint = configuredEndpoint();
  if (endpoint) {
    try {
      const live = await fetchJson(endpoint, {}, 8000);
      if (validateSnapshotShape(live)) return live;
    } catch (error) {
      console.warn('Fan Intent client could not load live aggregates.', error);
    }
  }
  const fallback = await fetchJson('data/fallback-v2.json', {}, 8000);
  if (!validateSnapshotShape(fallback)) throw new Error('invalid_fallback_snapshot');
  return fallback;
}

function venueBySlug(slug) {
  return fanState.snapshot?.venues.find((venue) => venue.slug === slug) || null;
}

function venueById(venueId) {
  return fanState.snapshot?.venues.find((venue) => venue.venue_id === venueId) || null;
}

function venueFromCard(card) {
  if (!card) return null;
  if (card.dataset.venueId) return venueById(card.dataset.venueId);
  const name = card.querySelector('strong, h2, h1')?.textContent.trim();
  const meta = card.querySelector('.venue-location, .detail-city, .location-card__top span:not(.venue-badge)')?.textContent || '';
  const candidates = fanState.snapshot.venues.filter((venue) => venue.name === name);
  const venue = candidates.find((candidate) => meta.includes(candidate.city) && meta.includes(candidate.region)) || candidates[0] || null;
  if (venue) card.dataset.venueId = venue.venue_id;
  return venue;
}

function venueForIntentButton(button) {
  if (button.dataset.venueId) return venueById(button.dataset.venueId);
  const detailsLink = button.closest('.action-row')?.querySelector('a[href*="venue="]');
  if (detailsLink) {
    const slug = new URL(detailsLink.href, location.href).searchParams.get('venue');
    const venue = venueBySlug(slug);
    if (venue) button.dataset.venueId = venue.venue_id;
    return venue;
  }
  if (button.closest('.venue-detail')) {
    const venue = venueBySlug(new URLSearchParams(location.search).get('venue'));
    if (venue) button.dataset.venueId = venue.venue_id;
    return venue;
  }
  return venueFromCard(button.closest('.selected-card'));
}

function findVenueForLocationCard(card) {
  if (card.dataset.venueId) return venueById(card.dataset.venueId);
  const name = card.querySelector('strong')?.textContent.trim();
  const meta = card.querySelector('.location-card__top span:not(.venue-badge)')?.textContent || '';
  const candidates = fanState.snapshot.venues.filter((venue) => venue.name === name);
  const venue = candidates.find((candidate) => meta.includes(candidate.city) && meta.includes(candidate.region)) || candidates[0] || null;
  if (venue) card.dataset.venueId = venue.venue_id;
  return venue;
}

function setText(element, value) {
  if (element && element.textContent !== value) element.textContent = value;
}

function patchCountForVenue(venueId) {
  const count = getFanCount(fanState.snapshot, fanState.gameId, venueId);
  const copy = bearCountCopy(count);
  const historyCopy = historyCountCopy(getHistoryCount(fanState.snapshot, venueId));

  document.querySelectorAll(`.cgb-marker[data-venue-id="${CSS.escape(venueId)}"]`).forEach((marker) => {
    let badge = marker.querySelector('.marker-count');
    if (count > 0 && !badge) {
      badge = document.createElement('span');
      badge.className = 'marker-count';
      marker.append(badge);
    }
    if (badge) {
      if (count > 0) setText(badge, copy);
      else badge.remove();
    }
    const venue = venueById(venueId);
    if (venue) marker.setAttribute('aria-label', `${venue.name}, ${venueTypeLabel(venue)}. ${copy}`);
  });

  document.querySelectorAll(`.location-card[data-venue-id="${CSS.escape(venueId)}"] .location-card__count`)
    .forEach((element) => setText(element, copy));
  document.querySelectorAll(`.selected-card[data-venue-id="${CSS.escape(venueId)}"] .bear-count`)
    .forEach((element) => setText(element, copy));
  document.querySelectorAll(`.venue-detail[data-venue-id="${CSS.escape(venueId)}"] .activity-card strong`)
    .forEach((element) => setText(element, copy));
  document.querySelectorAll(`.venue-detail[data-venue-id="${CSS.escape(venueId)}"] .activity-card p`)
    .forEach((element) => setText(element, historyCopy));
}

function failureCopy(error) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('game_not_open')) return 'This game is no longer open for selections.';
  if (code.includes('venue_not_found')) return 'This location is not available right now.';
  if (code.includes('selection_conflict')) return 'Your selection changed elsewhere. Refresh and try again.';
  if (code.includes('not_configured')) return 'Check-ins are not connected on this preview.';
  return 'Could not save your selection. Your previous choice was restored.';
}

function showStatus(message, timeout = 5000) {
  const status = document.querySelector('#status');
  if (!status) return;
  status.textContent = message;
  status.hidden = false;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { status.hidden = true; }, timeout);
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
      browserId: fanState.browserId,
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

function snapshotCounts() {
  return fanState.snapshot.fanCounts.map((row) => ({ ...row }));
}

async function performIntent(venueId, forcedAction = null) {
  if (fanState.pending || !fanState.snapshot || !fanState.gameId) return;
  if (!gameAllowsIntent()) {
    showStatus('Selections are closed for this game.');
    return;
  }

  const currentVenueId = activeVenueId();
  const action = forcedAction || intentAction(currentVenueId, venueId);
  const operation = { action, gameId: fanState.gameId, venueId };
  const previousSelections = { ...fanState.selections };
  const previousCounts = snapshotCounts();
  const nextVenueId = action === 'withdraw' ? null : venueId;

  fanState.pending = operation;
  fanState.retry = null;
  fanState.selections = withStoredSelection(fanState.selections, fanState.gameId, nextVenueId);
  if (currentVenueId && currentVenueId !== nextVenueId) adjustFanCount(fanState.snapshot, fanState.gameId, currentVenueId, -1);
  if (nextVenueId && nextVenueId !== currentVenueId) adjustFanCount(fanState.snapshot, fanState.gameId, nextVenueId, 1);
  persistSelections();
  patchUi();

  try {
    const response = await postIntent(operation);
    applyAggregateResponse(fanState.snapshot, response);
    fanState.selections = withStoredSelection(
      fanState.selections,
      fanState.gameId,
      response.selection?.venue_id || null
    );
    persistSelections();
    const message = action === 'withdraw'
      ? 'Selection removed.'
      : action === 'move'
        ? 'Your selection moved.'
        : 'You’ll be here.';
    showStatus(message, 2600);
  } catch (error) {
    fanState.snapshot.fanCounts = previousCounts;
    fanState.selections = previousSelections;
    persistSelections();
    fanState.retry = { ...operation, message: failureCopy(error) };
    showStatus(fanState.retry.message);
  } finally {
    fanState.pending = null;
    patchUi();
  }
}

function createRetryPanel(button, venueId) {
  const row = button.closest('.action-row');
  if (!row) return;
  let panel = row.parentElement.querySelector(':scope > .intent-feedback');
  const retryMatches = fanState.retry && fanState.retry.gameId === fanState.gameId && fanState.retry.venueId === venueId;
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
  const panelState = `${fanState.retry.action}:${fanState.retry.message}`;
  if (panel.dataset.state === panelState) return;
  panel.dataset.state = panelState;
  panel.replaceChildren();
  const message = document.createElement('span');
  message.textContent = fanState.retry.message;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'text-button intent-retry';
  retry.textContent = 'Retry';
  retry.addEventListener('click', () => performIntent(venueId, fanState.retry?.action));
  panel.append(message, retry);
}

function patchIntentButton(button) {
  const venue = venueForIntentButton(button);
  if (!venue) return;
  const isSelected = activeVenueId() === venue.venue_id;
  const pending = fanState.pending;
  const isPendingTarget = pending?.gameId === fanState.gameId && pending?.venueId === venue.venue_id;

  button.disabled = Boolean(pending) || !gameAllowsIntent();
  button.removeAttribute('title');
  button.setAttribute('aria-pressed', String(isSelected));
  button.dataset.intentState = isSelected ? 'selected' : 'available';
  button.classList.toggle('is-pending', Boolean(isPendingTarget));
  const label = isPendingTarget
    ? 'Saving…'
    : isSelected
      ? 'You’ll be here · Undo'
      : gameAllowsIntent()
        ? 'I’ll be here'
        : 'Selections closed';
  setText(button, label);

  if (!button.dataset.fanIntentWired) {
    button.dataset.fanIntentWired = 'true';
    button.addEventListener('click', () => performIntent(button.dataset.venueId));
  }
  createRetryPanel(button, venue.venue_id);
}

function patchGameOptions() {
  const sorted = [...fanState.snapshot.games].sort((a, b) =>
    Number(a.season) - Number(b.season) || Number(a.schedule_order) - Number(b.schedule_order));
  document.querySelectorAll('#game-list .game-option').forEach((button, index) => {
    const game = sorted[index];
    if (!game) return;
    button.dataset.fanIntentGameId = game.game_id;
    if (button.dataset.fanIntentWired) return;
    button.dataset.fanIntentWired = 'true';
    button.addEventListener('click', () => {
      fanState.gameId = game.game_id;
      fanState.retry = null;
      fanState.restorePending = !new URLSearchParams(location.search).get('venue');
      schedulePatch();
    });
  });
}

function restoreSelectedVenue() {
  if (!fanState.restorePending || new URLSearchParams(location.search).get('venue')) return;
  const venueId = activeVenueId();
  if (!venueId) {
    fanState.restorePending = false;
    return;
  }
  const marker = document.querySelector(`.cgb-marker[data-venue-id="${CSS.escape(venueId)}"]`);
  const listCard = document.querySelector(`.location-card[data-venue-id="${CSS.escape(venueId)}"]`);
  const target = marker || listCard;
  if (target) {
    fanState.restorePending = false;
    target.click();
  }
}

function patchUi() {
  if (!fanState.snapshot) return;
  document.querySelectorAll('.preview-note').forEach((note) => {
    if (/check-ins/i.test(note.textContent)) note.remove();
  });
  document.querySelectorAll('.location-card').forEach(findVenueForLocationCard);
  const selectedCard = document.querySelector('.selected-card');
  if (selectedCard) venueFromCard(selectedCard);
  const detail = document.querySelector('.venue-detail');
  if (detail) {
    const venue = venueBySlug(new URLSearchParams(location.search).get('venue'));
    if (venue) detail.dataset.venueId = venue.venue_id;
  }
  patchGameOptions();
  document.querySelectorAll('.intent-button').forEach(patchIntentButton);
  fanState.snapshot.venues.forEach((venue) => patchCountForVenue(venue.venue_id));
  restoreSelectedVenue();
}

function schedulePatch() {
  if (fanState.patchFrame !== null) return;
  fanState.patchFrame = requestAnimationFrame(() => {
    fanState.patchFrame = null;
    patchUi();
  });
}

async function refreshAggregates() {
  if (fanState.pending || document.visibilityState === 'hidden') return;
  const endpoint = configuredEndpoint();
  if (!endpoint) return;
  try {
    const response = await fetchJson(endpoint, {}, 8000);
    if (!validateSnapshotShape(response)) return;
    fanState.snapshot.fanCounts = response.fanCounts.map((row) => ({ ...row }));
    fanState.snapshot.venueHistoryCounts = response.venueHistoryCounts.map((row) => ({ ...row }));
    patchUi();
  } catch (error) {
    console.warn('Fan Intent aggregate refresh failed.', error);
  }
}

function startSynchronization() {
  fanState.refreshTimer = window.setInterval(refreshAggregates, AGGREGATE_REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshAggregates();
  });
  window.addEventListener('focus', refreshAggregates);
  window.addEventListener('storage', (event) => {
    if (event.key === INTENT_SELECTIONS_STORAGE_KEY) {
      fanState.selections = parseStoredSelections(event.newValue);
      fanState.restorePending = true;
      patchUi();
    }
    if (event.key === BROWSER_ID_STORAGE_KEY && isValidBrowserId(event.newValue)) {
      fanState.browserId = event.newValue;
    }
  });
}

async function bootFanIntent() {
  initializeIdentity();
  fanState.snapshot = await loadSnapshot();
  fanState.gameId = resolveGameId();
  pruneSelections();
  fanState.observer = new MutationObserver(schedulePatch);
  fanState.observer.observe(document.body, { childList: true, subtree: true });
  startSynchronization();
  patchUi();
}

window.CGBFanIntent = Object.freeze({
  clearLocalIdentity() {
    storageRemove(BROWSER_ID_STORAGE_KEY);
    storageRemove(INTENT_SELECTIONS_STORAGE_KEY);
    location.reload();
  }
});

bootFanIntent().catch((error) => console.error('Fan Intent initialization failed.', error));
