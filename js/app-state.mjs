const PUBLIC_SNAPSHOT_KEYS = [
  'venues',
  'games',
  'watchParties',
  'fanCounts',
  'venueHistoryCounts',
  'venueSeasonCounts'
];

export const appState = {
  snapshot: null,
  gameId: null,
  selectedVenueId: null,
  origin: null,
  listQuery: '',
  trayState: 'peek',
  map: null,
  locationFocusVenueId: null,
  markers: new Map(),
  userMarker: null,
  detailMode: false,
  dataSource: 'fallback',
  mapLayoutWaitFrames: 0,
  mapLayoutFrame: null,
  venueVisibilityFrame: null,
  trayResizeObserver: null,
  lastTraySize: '',
  fanIntent: {
    browserId: null,
    selections: {},
    pending: null,
    retry: null
  },
  externalSearch: {
    query: '',
    results: [],
    selected: null,
    pending: false,
    retry: null,
    error: null
  }
};

const listeners = new Map();
let ready = false;
let resolveReady;
const readyPromise = new Promise((resolve) => { resolveReady = resolve; });

export function setCanonicalSnapshot(snapshot, dataSource = appState.dataSource) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('invalid_snapshot');

  if (!appState.snapshot) {
    appState.snapshot = snapshot;
  } else if (appState.snapshot !== snapshot) {
    PUBLIC_SNAPSHOT_KEYS.forEach((key) => {
      appState.snapshot[key] = snapshot[key];
    });
    if ('schemaVersion' in snapshot) appState.snapshot.schemaVersion = snapshot.schemaVersion;
    if ('generatedAt' in snapshot) appState.snapshot.generatedAt = snapshot.generatedAt;
  }

  appState.dataSource = dataSource;
  return appState.snapshot;
}

export function markApplicationReady() {
  if (ready) return;
  ready = true;
  resolveReady(appState);
  emitAppEvent('ready', { state: appState });
}

export function waitForApplicationReady() {
  return ready ? Promise.resolve(appState) : readyPromise;
}

export function subscribeAppEvent(name, listener) {
  if (typeof listener !== 'function') return () => {};
  const group = listeners.get(name) || new Set();
  group.add(listener);
  listeners.set(name, group);
  return () => {
    group.delete(listener);
    if (group.size === 0) listeners.delete(name);
  };
}

export function emitAppEvent(name, detail = {}) {
  (listeners.get(name) || []).forEach((listener) => listener(detail));
}

export function activeFanIntentVenueId(gameId = appState.gameId) {
  return appState.fanIntent.selections[gameId] || null;
}

export function restoreSelectedVenueFromFanIntent({ preserveCurrentWhenEmpty = false } = {}) {
  if (appState.detailMode || !appState.snapshot) return appState.selectedVenueId;
  const venueId = activeFanIntentVenueId();
  const exists = venueId && appState.snapshot.venues.some((venue) => venue.venue_id === venueId);
  if (exists) {
    appState.selectedVenueId = venueId;
    appState.trayState = 'selected';
  } else if (!preserveCurrentWhenEmpty) {
    appState.selectedVenueId = null;
    appState.trayState = 'peek';
  }
  return appState.selectedVenueId;
}

export function resetAppStateForTests() {
  appState.snapshot = null;
  appState.gameId = null;
  appState.selectedVenueId = null;
  appState.origin = null;
  appState.listQuery = '';
  appState.trayState = 'peek';
  appState.locationFocusVenueId = null;
  appState.detailMode = false;
  appState.dataSource = 'fallback';
  appState.fanIntent.browserId = null;
  appState.fanIntent.selections = {};
  appState.fanIntent.pending = null;
  appState.fanIntent.retry = null;
  appState.externalSearch.query = '';
  appState.externalSearch.results = [];
  appState.externalSearch.selected = null;
  appState.externalSearch.pending = false;
  appState.externalSearch.retry = null;
  appState.externalSearch.error = null;
}
