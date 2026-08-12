import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_REFRESH_INTERVAL_MS,
  FOCUS_REFRESH_STALE_MS,
  dataAvailabilityCopy,
  publicSnapshotsEqual,
  resolveDirectEntryVenueId,
  shouldRefreshSnapshot
} from '../js/snapshot-refresh.mjs';

function snapshot(overrides = {}) {
  return {
    schemaVersion: '2.0',
    venues: [{
      venue_id: 'venue_one',
      slug: 'one',
      latitude: 37.8,
      longitude: -122.2
    }],
    games: [],
    watchParties: [],
    fanCounts: [],
    venueHistoryCounts: [],
    venueSeasonCounts: [],
    ...overrides
  };
}

test('refresh cadence is fifteen minutes while active and five minutes on return', () => {
  assert.equal(ACTIVE_REFRESH_INTERVAL_MS, 15 * 60 * 1000);
  assert.equal(FOCUS_REFRESH_STALE_MS, 5 * 60 * 1000);
});

test('hidden tabs do not request refreshes', () => {
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'hidden',
    now: 600000,
    lastAttemptAt: 0
  }), false);
});

test('visible tabs refresh immediately without a prior attempt', () => {
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'visible',
    now: 1,
    lastAttemptAt: 0
  }), true);
});

test('visible tabs refresh after the stale threshold but not before it', () => {
  const lastAttemptAt = 1000;
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'visible',
    now: lastAttemptAt + FOCUS_REFRESH_STALE_MS - 1,
    lastAttemptAt
  }), false);
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'visible',
    now: lastAttemptAt + FOCUS_REFRESH_STALE_MS,
    lastAttemptAt
  }), true);
});

test('snapshot comparison ignores generated timestamps but detects public-data changes', () => {
  assert.equal(publicSnapshotsEqual(
    snapshot({ generatedAt: '2026-08-03T00:00:00Z' }),
    snapshot({ generatedAt: '2026-08-03T00:01:00Z' })
  ), true);
  assert.equal(publicSnapshotsEqual(
    snapshot(),
    snapshot({ fanCounts: [{ game_id: 'game_one', venue_id: 'venue_one', count: 1 }] })
  ), false);
});

test('empty schedule fallback is described as unavailable data, not zero locations', () => {
  const copy = dataAvailabilityCopy({ dataSource: 'fallback', venueCount: 0 });
  assert.equal(copy.unavailable, true);
  assert.equal(copy.locationStat, 'Location data unavailable');
  assert.match(copy.emptyHeading, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(copy), /0 locations mapped|No mapped locations match/i);
});

test('saved snapshots disclose background refresh and failed refresh states', () => {
  assert.match(dataAvailabilityCopy({
    dataSource: 'last-known-good',
    venueCount: 3
  }).trayCopy, /latest update loads/i);
  assert.match(dataAvailabilityCopy({
    dataSource: 'last-known-good',
    venueCount: 3,
    refreshFailed: true
  }).trayCopy, /temporarily unavailable/i);
});

test('live data restores the normal tray description', () => {
  assert.equal(
    dataAvailabilityCopy({ dataSource: 'live', venueCount: 3 }).trayCopy,
    'Watch Parties first, then Cal Bars and Community Locations.'
  );
});

test('direct-entry venue is resolved after cached or fallback startup refreshes', () => {
  const current = { venues: [
    { venue_id: 'venue_one', slug: 'first-place' },
    { venue_id: 'venue_two', slug: 'requested-place' }
  ] };
  assert.equal(resolveDirectEntryVenueId(current, '?game=game_one&venue=requested-place'), 'venue_two');
  assert.equal(resolveDirectEntryVenueId(current, '?venue=missing-place'), '');
  assert.equal(resolveDirectEntryVenueId(current, '?game=game_one'), '');
});

test('browser bootstrap renders cache first and suppresses an unchanged live rerender', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const storage = new Map([['cgb_v2_public_data_url', 'https://example.invalid/live']]);
  const windowListeners = new Map();
  const documentListeners = new Map();
  const meta = { content: 'https://example.invalid/default' };
  const elements = new Map([
    ['#tray-summary-copy', { textContent: '' }],
    ['#watch-party-stat', { textContent: '' }],
    ['#location-stat', { textContent: '' }],
    ['#list-heading', { textContent: '' }],
    ['#location-list', { replaceChildren() {} }]
  ]);
  const live = snapshot({ generatedAt: '2026-08-03T01:00:00Z' });
  let fetchCalls = 0;
  let renderCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    return { ok: true, json: async () => live };
  };
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    location: { href: 'http://localhost/', hostname: 'localhost', search: '' },
    history: { state: null, replaceState() {} },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    CGBApp: null
  };
  globalThis.document = {
    visibilityState: 'visible',
    querySelector(selector) {
      if (selector === 'meta[name="cgb-data-endpoint"]') return meta;
      return elements.get(selector) || null;
    },
    addEventListener: (name, listener) => documentListeners.set(name, listener),
    createElement: () => ({
      className: '',
      textContent: '',
      append() {}
    })
  };

  try {
    await import(`../js/snapshot-refresh.mjs?browser-bootstrap=${Date.now()}`);
    assert.equal(meta.content, '');
    assert.equal(storage.has('cgb_v2_public_data_url'), false);

    const state = {
      snapshot: snapshot({ generatedAt: '2026-08-03T00:00:00Z' }),
      dataSource: 'last-known-good',
      detailMode: false,
      selectedVenueId: null
    };
    window.CGBApp = {
      getSnapshot: () => state.snapshot,
      getState: () => state,
      subscribe: () => () => {},
      restoreSelection: () => false,
      render: () => { renderCalls += 1; }
    };

    await windowListeners.get('DOMContentLoaded')();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(meta.content, 'https://example.invalid/default');
    assert.equal(storage.get('cgb_v2_public_data_url'), 'https://example.invalid/live');
    assert.equal(fetchCalls, 1);
    assert.equal(renderCalls, 0);
    assert.equal(state.dataSource, 'live');
    assert.equal(state.snapshot.generatedAt, '2026-08-03T01:00:00Z');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});
