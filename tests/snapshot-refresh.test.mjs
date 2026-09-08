import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_REFRESH_INTERVAL_MS,
  FOCUS_REFRESH_STALE_MS,
  STARTUP_ROLLOVER_GUARD_MS,
  dataAvailabilityCopy,
  publicSnapshotsEqual,
  resolveDirectEntryVenueId,
  shouldRefreshSnapshot,
  shouldUseSavedSnapshotAtStartup
} from '../js/snapshot-refresh.mjs';
import { TRAY_GUIDANCE_COPY } from '../js/core.mjs';

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
    fanExperiences: [],
    ...overrides
  };
}

function game(overrides = {}) {
  return {
    game_id: 'game_syracuse',
    schedule_order: 2,
    opponent_name: 'Syracuse',
    game_date: '2099-09-12',
    kickoff_at: '2099-09-12T19:30:00-07:00',
    kickoff_status: 'confirmed',
    game_status: 'upcoming',
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

test('saved startup is allowed when the cached default matches the loading-cover game', () => {
  const cached = snapshot({ games: [game()] });
  assert.equal(shouldUseSavedSnapshotAtStartup({
    snapshot: cached,
    loadingCoverGameSlug: 'syracuse',
    now: new Date('2099-09-12T12:00:00-07:00')
  }), true);
});

test('saved startup is rejected when the cached default disagrees with the loading-cover game', () => {
  const cached = snapshot({ games: [game({ opponent_name: 'UCLA' })] });
  assert.equal(shouldUseSavedSnapshotAtStartup({
    snapshot: cached,
    loadingCoverGameSlug: 'syracuse',
    now: new Date('2099-09-12T12:00:00-07:00')
  }), false);
});

test('saved startup is rejected after the kickoff rollover guard even when the cover still matches', () => {
  const kickoff = '2099-09-12T12:00:00-07:00';
  const cached = snapshot({ games: [game({ kickoff_at: kickoff })] });
  assert.equal(shouldUseSavedSnapshotAtStartup({
    snapshot: cached,
    loadingCoverGameSlug: 'syracuse',
    now: new Date(new Date(kickoff).getTime() + STARTUP_ROLLOVER_GUARD_MS)
  }), false);
});

test('an explicit game route may use its matching saved game without auto-rollover gating', () => {
  const cached = snapshot({ games: [game({
    game_id: 'game_ucla',
    opponent_name: 'UCLA',
    game_date: '2099-09-05',
    kickoff_at: '2099-09-05T19:30:00-07:00'
  })] });
  assert.equal(shouldUseSavedSnapshotAtStartup({
    snapshot: cached,
    search: '?game=ucla',
    loadingCoverGameSlug: 'syracuse',
    now: new Date('2099-09-06T12:00:00-07:00')
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
  assert.equal(publicSnapshotsEqual(
    snapshot(),
    snapshot({ fanExperiences: [{ venue_id: 'venue_one', text: 'A real fan perspective.', display_name: '', year: 2026 }] })
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
    TRAY_GUIDANCE_COPY
  );
});

test('direct-entry venue is resolved after cached or fallback startup refreshes', () => {
  const current = { venues: [
    { venue_id: 'venue_one', slug: 'first-place' },
    { venue_id: 'venue_two', slug: 'requested-place' }
  ] };
  assert.equal(resolveDirectEntryVenueId(current, '?game=ucla&venue=requested-place'), 'venue_two');
  assert.equal(resolveDirectEntryVenueId(current, '?venue=missing-place'), '');
  assert.equal(resolveDirectEntryVenueId(current, '?game=ucla'), '');
});

test('browser bootstrap renders a safe saved snapshot before making one live refresh', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const initial = snapshot({
    games: [game()],
    generatedAt: '2099-09-01T00:00:00Z'
  });
  const live = snapshot({
    games: [game()],
    generatedAt: '2099-09-01T01:00:00Z'
  });
  const storage = new Map([
    ['cgb_v2_public_data_url', 'https://example.invalid/live'],
    ['cgb_v2_last_good_snapshot', JSON.stringify(initial)]
  ]);
  const windowListeners = new Map();
  const documentListeners = new Map();
  const meta = { content: 'https://example.invalid/default' };
  const preload = {
    href: 'assets/social-cards/syracuse.png',
    getAttribute: (name) => name === 'href' ? 'assets/social-cards/syracuse.png' : null
  };
  const elements = new Map([
    ['#tray-summary-copy', { textContent: '' }],
    ['#watch-party-stat', { textContent: '' }],
    ['#location-stat', { textContent: '' }],
    ['#list-heading', { textContent: '' }],
    ['#location-list', { replaceChildren() {} }]
  ]);
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
      if (selector === '#cgb-loading-cover-preload') return preload;
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
    assert.match(meta.content, /^data:application\/json/);
    assert.equal(storage.has('cgb_v2_public_data_url'), false);
    assert.equal(fetchCalls, 0);

    const state = {
      snapshot: initial,
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

    assert.equal(meta.content, 'https://example.invalid/default');
    assert.equal(storage.get('cgb_v2_public_data_url'), 'https://example.invalid/live');
    assert.equal(fetchCalls, 1);
    assert.equal(renderCalls, 0);
    assert.equal(state.dataSource, 'live');
    assert.equal(state.snapshot.generatedAt, '2099-09-01T01:00:00Z');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});
