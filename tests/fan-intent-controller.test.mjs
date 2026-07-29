import test from 'node:test';
import assert from 'node:assert/strict';
import { createFanIntentController } from '../js/fan-intent-controller.mjs';

function makeState(selection = null, counts = []) {
  return {
    gameId: 'game_1',
    snapshot: {
      games: [{ game_id: 'game_1', game_status: 'upcoming' }],
      fanCounts: counts.map((row) => ({ ...row })),
      venueHistoryCounts: []
    },
    fanIntent: {
      selections: selection ? { game_1: selection } : {},
      pending: null,
      retry: null
    }
  };
}

function response(action, venueId, fanCounts) {
  return {
    ok: true,
    action,
    selection: venueId
      ? { game_id: 'game_1', venue_id: venueId, status: 'attending' }
      : null,
    fanCounts,
    venueHistoryCounts: []
  };
}

function harness(state, postIntent) {
  let renders = 0;
  const controller = createFanIntentController({
    getState: () => state,
    postIntent,
    persistSelections: () => {},
    render: () => { renders += 1; },
    showStatus: () => {}
  });
  return {
    controller,
    get renders() { return renders; }
  };
}

test('join, move, and undo commit authoritative selections and aggregates', async () => {
  const state = makeState(null, []);
  let next = response('join', 'ven_1', [
    { game_id: 'game_1', venue_id: 'ven_1', count: 7 }
  ]);
  const h = harness(state, async () => next);

  assert.equal(await h.controller.performIntent('ven_1'), true);
  assert.deepEqual(state.fanIntent.selections, { game_1: 'ven_1' });
  assert.equal(state.snapshot.fanCounts[0].count, 7);

  next = response('move', 'ven_2', [
    { game_id: 'game_1', venue_id: 'ven_2', count: 3 }
  ]);
  assert.equal(await h.controller.performIntent('ven_2'), true);
  assert.deepEqual(state.fanIntent.selections, { game_1: 'ven_2' });

  next = response('withdraw', null, []);
  assert.equal(await h.controller.performIntent('ven_2'), true);
  assert.deepEqual(state.fanIntent.selections, {});
  assert.deepEqual(state.snapshot.fanCounts, []);
});

for (const scenario of [
  {
    name: 'join',
    state: () => makeState(null, [
      { game_id: 'game_1', venue_id: 'ven_1', count: 2 }
    ]),
    target: 'ven_2'
  },
  {
    name: 'move',
    state: () => makeState('ven_1', [
      { game_id: 'game_1', venue_id: 'ven_1', count: 2 }
    ]),
    target: 'ven_2'
  },
  {
    name: 'undo',
    state: () => makeState('ven_1', [
      { game_id: 'game_1', venue_id: 'ven_1', count: 2 }
    ]),
    target: 'ven_1'
  }
]) {
  test(`failed optimistic ${scenario.name} restores prior selection and counts`, async () => {
    const state = scenario.state();
    const beforeSelections = structuredClone(state.fanIntent.selections);
    const beforeCounts = structuredClone(state.snapshot.fanCounts);
    const h = harness(state, async () => { throw new Error('network'); });

    assert.equal(await h.controller.performIntent(scenario.target), false);
    assert.deepEqual(state.fanIntent.selections, beforeSelections);
    assert.deepEqual(state.snapshot.fanCounts, beforeCounts);
    assert.ok(state.fanIntent.retry);
  });
}

test('Retry starts from rolled-back state and does not double-apply optimistic counts', async () => {
  const state = makeState(null, []);
  let calls = 0;
  const h = harness(state, async () => {
    calls += 1;
    if (calls === 1) throw new Error('network');
    return response('join', 'ven_1', [
      { game_id: 'game_1', venue_id: 'ven_1', count: 1 }
    ]);
  });

  await h.controller.performIntent('ven_1');
  assert.deepEqual(state.snapshot.fanCounts, []);
  assert.equal(await h.controller.retryIntent(), true);
  assert.deepEqual(state.snapshot.fanCounts, [
    { game_id: 'game_1', venue_id: 'ven_1', count: 1 }
  ]);
  assert.equal(calls, 2);
});
