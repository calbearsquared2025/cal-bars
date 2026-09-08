import test from 'node:test';
import assert from 'node:assert/strict';

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

test('saved startup snapshot retries live attendance immediately while visible', async () => {
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
  const initial = snapshot({ generatedAt: '2026-09-08T19:00:00Z' });
  const live = snapshot({
    generatedAt: '2026-09-08T20:00:00Z',
    fanCounts: [{ game_id: 'game_one', venue_id: 'venue_one', count: 2 }]
  });
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
    await import(`../js/snapshot-refresh.mjs?saved-recovery=${Date.now()}`);
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
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(fetchCalls, 1);
    assert.equal(renderCalls, 1);
    assert.equal(state.dataSource, 'live');
    assert.equal(state.snapshot.generatedAt, '2026-09-08T20:00:00Z');
    assert.deepEqual(state.snapshot.fanCounts, [
      { game_id: 'game_one', venue_id: 'venue_one', count: 2 }
    ]);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});
