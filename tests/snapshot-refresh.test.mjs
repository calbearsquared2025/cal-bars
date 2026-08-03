import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_REFRESH_INTERVAL_MS,
  FOCUS_REFRESH_STALE_MS,
  dataAvailabilityCopy,
  resolveDirectEntryVenueId,
  shouldRefreshSnapshot
} from '../js/snapshot-refresh.mjs';

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
  const snapshot = { venues: [
    { venue_id: 'venue_one', slug: 'first-place' },
    { venue_id: 'venue_two', slug: 'requested-place' }
  ] };
  assert.equal(resolveDirectEntryVenueId(snapshot, '?game=game_2026_01&venue=requested-place'), 'venue_two');
  assert.equal(resolveDirectEntryVenueId(snapshot, '?venue=missing-place'), '');
  assert.equal(resolveDirectEntryVenueId(snapshot, '?game=game_2026_01'), '');
});

test('browser bootstrap renders cache first, restores the endpoint, and starts one live refresh', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
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
  let refreshCalls = 0;

  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    location: { search: '' },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
    setTimeout,
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
      snapshot: { venues: [{ venue_id: 'venue_one', slug: 'one' }] },
      dataSource: 'last-known-good',
      detailMode: false,
      selectedVenueId: null
    };
    window.CGBApp = {
      getSnapshot: () => state.snapshot,
      getState: () => state,
      subscribe: () => () => {},
      render: () => {},
      refreshSnapshot: async () => {
        refreshCalls += 1;
        state.dataSource = 'live';
        return true;
      }
    };

    await windowListeners.get('DOMContentLoaded')();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(meta.content, 'https://example.invalid/default');
    assert.equal(storage.get('cgb_v2_public_data_url'), 'https://example.invalid/live');
    assert.equal(refreshCalls, 1);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
