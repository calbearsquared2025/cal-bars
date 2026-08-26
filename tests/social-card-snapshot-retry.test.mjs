import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchSnapshot } from '../scripts/generate-social-cards.mjs';

const validSnapshot = {
  venues: [{ venue_id: 'ven_1', latitude: 37.87, longitude: -122.27 }],
  games: [{ game_id: 'game_1', opponent_name: 'Test', home_away: 'home' }],
  watchParties: [],
  fanCounts: [],
  venueHistoryCounts: []
};

function jsonResponse(snapshot, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => snapshot
  };
}

test('retries a transient network failure and succeeds on the next attempt', async () => {
  let calls = 0;
  const sleeps = [];
  const snapshot = await fetchSnapshot('https://script.google.com/test', {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('temporary network failure');
      return jsonResponse(validSnapshot);
    },
    retryDelaysMs: [1000, 2500],
    sleepImpl: async (ms) => { sleeps.push(ms); }
  });

  assert.equal(snapshot, validSnapshot);
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1000]);
});

test('retries timeouts up to the configured attempt limit', async () => {
  let calls = 0;
  const sleeps = [];
  await assert.rejects(
    fetchSnapshot('https://script.google.com/test', {
      fetchImpl: async () => {
        calls += 1;
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      },
      timeoutMs: 100,
      attempts: 3,
      retryDelaysMs: [1, 2],
      sleepImpl: async (ms) => { sleeps.push(ms); }
    }),
    /after 3 attempts: request timed out after 0.1 seconds/
  );

  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [1, 2]);
});

test('retries transient server errors but not permanent client errors', async () => {
  let serverCalls = 0;
  const recovered = await fetchSnapshot('https://script.google.com/test', {
    fetchImpl: async () => {
      serverCalls += 1;
      return serverCalls === 1 ? jsonResponse({}, 503) : jsonResponse(validSnapshot);
    },
    sleepImpl: async () => {}
  });
  assert.equal(recovered, validSnapshot);
  assert.equal(serverCalls, 2);

  let clientCalls = 0;
  await assert.rejects(
    fetchSnapshot('https://script.google.com/test', {
      fetchImpl: async () => {
        clientCalls += 1;
        return jsonResponse({}, 404);
      },
      sleepImpl: async () => {}
    }),
    /HTTP 404/
  );
  assert.equal(clientCalls, 1);
});

test('invalid snapshot data fails immediately instead of being retried', async () => {
  let calls = 0;
  let sleeps = 0;
  await assert.rejects(
    fetchSnapshot('https://script.google.com/test', {
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ venues: [] });
      },
      sleepImpl: async () => { sleeps += 1; }
    }),
    /Snapshot is missing required public arrays/
  );

  assert.equal(calls, 1);
  assert.equal(sleeps, 0);
});