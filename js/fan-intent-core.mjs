export const BROWSER_ID_STORAGE_KEY = 'cgb_v2_browser_id';
export const INTENT_SELECTIONS_STORAGE_KEY = 'cgb_v2_fan_intent_selections';

const BROWSER_ID_PATTERN = /^browser_[A-Za-z0-9_-]{16,128}$/;
const PRIVATE_RESPONSE_KEYS = new Set([
  'browserId', 'browser_id', 'fan_intent_id', 'created_at', 'updated_at',
  'archived_at', 'workbook_id', 'workbook_url', 'spreadsheet_id', 'spreadsheet_url'
]);

export function isValidBrowserId(value) {
  return typeof value === 'string' && BROWSER_ID_PATTERN.test(value);
}

export function createBrowserId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `browser_${cryptoApi.randomUUID()}`;
  }
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);
    return `browser_${Array.from(values, (value) => value.toString(36).padStart(7, '0')).join('')}`;
  }
  throw new Error('secure_random_unavailable');
}

export function parseStoredSelections(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([gameId, venueId]) =>
      typeof gameId === 'string' && gameId.length > 0 &&
      typeof venueId === 'string' && venueId.length > 0
    ));
  } catch (_) {
    return {};
  }
}

export function compactListFanCountCopy(count) {
  const total = Math.max(0, Math.trunc(Number(count) || 0));
  if (total === 0) return '';
  return `${total} ${total === 1 ? 'BEAR' : 'BEARS'}`;
}

export function detailPresenceCopy(count) {
  const total = Math.max(0, Math.trunc(Number(count) || 0));
  return total <= 1
    ? 'You’re the first Bear on CGB.'
    : 'You’re one of them.';
}

export function withStoredSelection(selections, gameId, venueId) {
  const next = { ...parseStoredSelections(selections) };
  if (!gameId) return next;
  if (venueId) next[gameId] = venueId;
  else delete next[gameId];
  return next;
}

export function intentAction(currentVenueId, targetVenueId) {
  if (!targetVenueId) throw new Error('missing_target_venue');
  if (currentVenueId === targetVenueId) return 'withdraw';
  return currentVenueId ? 'move' : 'join';
}

export function setFanCount(snapshot, gameId, venueId, count) {
  if (!snapshot || !Array.isArray(snapshot.fanCounts) || !gameId || !venueId) return;
  const normalized = Math.max(0, Number.isFinite(Number(count)) ? Math.trunc(Number(count)) : 0);
  const index = snapshot.fanCounts.findIndex((row) => row.game_id === gameId && row.venue_id === venueId);
  if (index >= 0) {
    if (normalized === 0) snapshot.fanCounts.splice(index, 1);
    else snapshot.fanCounts[index] = { game_id: gameId, venue_id: venueId, count: normalized };
  } else if (normalized > 0) {
    snapshot.fanCounts.push({ game_id: gameId, venue_id: venueId, count: normalized });
  }
}

export function adjustFanCount(snapshot, gameId, venueId, delta) {
  if (!venueId) return;
  const current = Number(snapshot?.fanCounts?.find((row) =>
    row.game_id === gameId && row.venue_id === venueId
  )?.count || 0);
  setFanCount(snapshot, gameId, venueId, current + Number(delta || 0));
}

export function beginIntentTransaction(snapshot, selections, gameId, venueId, forcedAction = null) {
  if (!snapshot || !gameId || !venueId) throw new Error('invalid_intent_transaction');
  const previousSelections = { ...parseStoredSelections(selections) };
  const previousFanCounts = snapshot.fanCounts.map((row) => ({ ...row }));
  const currentVenueId = previousSelections[gameId] || null;
  const action = forcedAction || intentAction(currentVenueId, venueId);
  const nextVenueId = action === 'withdraw' ? null : venueId;
  const nextSelections = withStoredSelection(previousSelections, gameId, nextVenueId);

  if (currentVenueId && currentVenueId !== nextVenueId) {
    adjustFanCount(snapshot, gameId, currentVenueId, -1);
  }
  if (nextVenueId && nextVenueId !== currentVenueId) {
    adjustFanCount(snapshot, gameId, nextVenueId, 1);
  }

  return {
    operation: { action, gameId, venueId },
    previousSelections,
    previousFanCounts,
    nextSelections
  };
}

export function rollbackIntentTransaction(snapshot, transaction) {
  if (!snapshot || !transaction) return {};
  snapshot.fanCounts = transaction.previousFanCounts.map((row) => ({ ...row }));
  return { ...transaction.previousSelections };
}

export function applyAggregateResponse(snapshot, response) {
  if (!snapshot || !response || typeof response !== 'object') return false;
  if (!Array.isArray(response.fanCounts) || !Array.isArray(response.venueHistoryCounts)) return false;
  snapshot.fanCounts = response.fanCounts.map((row) => ({
    game_id: String(row.game_id || ''),
    venue_id: String(row.venue_id || ''),
    count: Math.max(0, Math.trunc(Number(row.count) || 0))
  })).filter((row) => row.game_id && row.venue_id);
  snapshot.venueHistoryCounts = response.venueHistoryCounts.map((row) => ({
    venue_id: String(row.venue_id || ''),
    past_game_count: Math.max(0, Math.trunc(Number(row.past_game_count) || 0))
  })).filter((row) => row.venue_id);
  if (response.generatedAt) snapshot.generatedAt = response.generatedAt;
  return true;
}

export function commitIntentResponse(snapshot, selections, gameId, response) {
  if (!applyAggregateResponse(snapshot, response)) throw new Error('invalid_aggregate_response');
  return withStoredSelection(selections, gameId, response.selection?.venue_id || null);
}

export function responseContainsPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(responseContainsPrivateKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    PRIVATE_RESPONSE_KEYS.has(key) || responseContainsPrivateKeys(child)
  );
}

export function validateFanIntentResponse(response) {
  if (!response || typeof response !== 'object' || responseContainsPrivateKeys(response)) return false;
  if (response.ok !== true) return false;
  if (!['join', 'withdraw', 'move'].includes(response.action)) return false;
  if (response.selection !== null) {
    if (!response.selection || typeof response.selection !== 'object') return false;
    if (typeof response.selection.game_id !== 'string' || typeof response.selection.venue_id !== 'string') return false;
    if (response.selection.status !== 'attending') return false;
  }
  return Array.isArray(response.fanCounts) && Array.isArray(response.venueHistoryCounts);
}