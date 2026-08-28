import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  adjustFanCount,
  applyAggregateResponse,
  beginIntentTransaction,
  commitIntentResponse,
  compactListFanCountCopy,
  createBrowserId,
  detailPresenceCopy,
  intentAction,
  isValidBrowserId,
  parseStoredSelections,
  responseContainsPrivateKeys,
  rollbackIntentTransaction,
  validateFanIntentResponse,
  withStoredSelection
} from '../js/fan-intent-core.mjs';

test('browser identity is random, prefixed, and accepted by the shared validator', () => {
  const id = createBrowserId({ randomUUID });
  assert.match(id, /^browser_[A-Za-z0-9_-]{16,128}$/);
  assert.equal(isValidBrowserId(id), true);
  assert.equal(isValidBrowserId('browser_short'), false);
});

test('stored selections tolerate malformed storage and preserve one venue per game', () => {
  assert.deepEqual(parseStoredSelections('{bad json'), {});
  assert.deepEqual(
    parseStoredSelections(JSON.stringify({ game_1: 'ven_1', empty: '', bad: null })),
    { game_1: 'ven_1' }
  );
  assert.deepEqual(
    withStoredSelection({ game_1: 'ven_1' }, 'game_1', 'ven_2'),
    { game_1: 'ven_2' }
  );
  assert.deepEqual(withStoredSelection({ game_1: 'ven_1' }, 'game_1', null), {});
});

test('list fan counts suppress zero and use compact singular/plural copy', () => {
  assert.equal(compactListFanCountCopy(0), '');
  assert.equal(compactListFanCountCopy(1), '1 BEAR');
  assert.equal(compactListFanCountCopy(2), '2 BEARS');
});

test('selected detail presence never describes a zero-count venue as one of many', () => {
  assert.equal(detailPresenceCopy(0), 'You’re the first Bear on CGB.');
  assert.equal(detailPresenceCopy(1), 'You’re the first Bear on CGB.');
  assert.equal(detailPresenceCopy(2), 'You’re one of them.');
});

test('intent actions distinguish join, move, and withdraw', () => {
  assert.equal(intentAction(null, 'ven_1'), 'join');
  assert.equal(intentAction('ven_1', 'ven_2'), 'move');
  assert.equal(intentAction('ven_1', 'ven_1'), 'withdraw');
});

test('optimistic aggregate updates add, move, and remove counts without negatives', () => {
  const snapshot = {
    fanCounts: [{ game_id: 'game_1', venue_id: 'ven_1', count: 1 }]
  };
  adjustFanCount(snapshot, 'game_1', 'ven_1', -1);
  assert.deepEqual(snapshot.fanCounts, []);
  adjustFanCount(snapshot, 'game_1', 'ven_2', 1);
  assert.deepEqual(snapshot.fanCounts, [
    { game_id: 'game_1', venue_id: 'ven_2', count: 1 }
  ]);
  adjustFanCount(snapshot, 'game_1', 'ven_2', -9);
  assert.deepEqual(snapshot.fanCounts, []);
});

test('transactions optimistically update and restore selections and counts', () => {
  const snapshot = {
    fanCounts: [{ game_id: 'game_1', venue_id: 'ven_1', count: 2 }]
  };
  const transaction = beginIntentTransaction(
    snapshot,
    { game_1: 'ven_1' },
    'game_1',
    'ven_2'
  );

  assert.equal(transaction.operation.action, 'move');
  assert.deepEqual(transaction.nextSelections, { game_1: 'ven_2' });
  assert.deepEqual(snapshot.fanCounts, [
    { game_id: 'game_1', venue_id: 'ven_1', count: 1 },
    { game_id: 'game_1', venue_id: 'ven_2', count: 1 }
  ]);
  assert.deepEqual(rollbackIntentTransaction(snapshot, transaction), { game_1: 'ven_1' });
  assert.deepEqual(snapshot.fanCounts, [
    { game_id: 'game_1', venue_id: 'ven_1', count: 2 }
  ]);
});

test('server aggregate responses replace optimistic current and historical counts', () => {
  const snapshot = { fanCounts: [], venueHistoryCounts: [] };
  const selections = commitIntentResponse(snapshot, {}, 'game_1', {
    fanCounts: [{ game_id: 'game_1', venue_id: 'ven_1', count: 3 }],
    venueHistoryCounts: [{ venue_id: 'ven_1', past_game_count: 2 }],
    selection: { venue_id: 'ven_1' }
  });

  assert.deepEqual(selections, { game_1: 'ven_1' });
  assert.deepEqual(snapshot.fanCounts, [
    { game_id: 'game_1', venue_id: 'ven_1', count: 3 }
  ]);
  assert.deepEqual(snapshot.venueHistoryCounts, [
    { venue_id: 'ven_1', past_game_count: 2 }
  ]);
  assert.equal(applyAggregateResponse({}, {}), false);
});

test('write responses accept public aggregates and reject private identifiers recursively', () => {
  const valid = {
    ok: true,
    action: 'move',
    selection: { game_id: 'game_1', venue_id: 'ven_2', status: 'attending' },
    fanCounts: [],
    venueHistoryCounts: []
  };
  assert.equal(validateFanIntentResponse(valid), true);
  assert.equal(responseContainsPrivateKeys(valid), false);

  const privateResponse = { ...valid, debug: { browser_id: randomUUID() } };
  assert.equal(responseContainsPrivateKeys(privateResponse), true);
  assert.equal(validateFanIntentResponse(privateResponse), false);
});
