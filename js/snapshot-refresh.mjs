import './analytics.mjs';
import {
  gameRouteParam,
  selectDefaultGame,
  TRAY_GUIDANCE_COPY,
  validateSnapshotShape
} from './core.mjs';
import {
  DATA_ENDPOINT_OVERRIDE_STORAGE_KEY,
  readRuntimeConfig
} from './config.mjs';

export const ACTIVE_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const FOCUS_REFRESH_STALE_MS = 5 * 60 * 1000;
export const STARTUP_ROLLOVER_GUARD_MS = 5 * 60 * 60 * 1000;

const LAST_GOOD_KEY = 'cgb_v2_last_good_snapshot';
const REFRESH_TIMEOUT_MS = 10000;
const SAVED_STARTUP_ENDPOINT = 'data:application/json,%7B%7D';
const PUBLIC_SNAPSHOT_KEYS = [
  'venues',
  'games',
  'watchParties',
  'fanCounts',
  'venueHistoryCounts',
  'venueSeasonCounts',
  'fanExperiences'
];

let browserRefreshController = null;

function cleanHostname(hostname) {
  return String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
}

export function allowsDataEndpointOverride(hostname) {
  const value = cleanHostname(hostname);
  return value === 'localhost' ||
    value === '127.0.0.1' ||
    value === '::1' ||
    value.endsWith('.app.github.dev') ||
    value.endsWith('.githubpreview.dev');
}

export function clearDisallowedDataEndpointOverride({
  hostname,
  getStorage = () => window.localStorage,
  key = DATA_ENDPOINT_OVERRIDE_STORAGE_KEY
} = {}) {
  if (allowsDataEndpointOverride(hostname) || typeof getStorage !== 'function') return false;
  try {
    const storage = getStorage();
    if (!storage || storage.getItem(key) === null) return false;
    storage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

export function shouldRefreshSnapshot({
  visibilityState,
  now,
  lastAttemptAt,
  staleAfterMs = FOCUS_REFRESH_STALE_MS
}) {
  if (visibilityState !== 'visible') return false;
  if (!Number.isFinite(lastAttemptAt) || lastAttemptAt <= 0) return true;
  return now - lastAttemptAt >= staleAfterMs;
}

export function resolveDirectEntryVenueId(snapshot, search = '') {
  const slug = new URLSearchParams(search).get('venue');
  if (!slug || !Array.isArray(snapshot?.venues)) return '';
  return snapshot.venues.find((venue) => venue.slug === slug)?.venue_id || '';
}

export function shouldUseSavedSnapshotAtStartup({
  snapshot,
  search = '',
  loadingCoverGameSlug = '',
  now = new Date(),
  rolloverGuardMs = STARTUP_ROLLOVER_GUARD_MS
} = {}) {
  if (!validateSnapshotShape(snapshot)) return false;

  const requestedGame = String(new URLSearchParams(search).get('game') || '').trim();
  if (requestedGame) {
    const requestedSlug = requestedGame.toLowerCase();
    return snapshot.games.some((game) =>
      game?.game_id === requestedGame || gameRouteParam(game) === requestedSlug);
  }

  const defaultGame = selectDefaultGame(snapshot.games, now);
  if (!defaultGame || defaultGame.game_status !== 'upcoming') return false;

  const coverSlug = String(loadingCoverGameSlug || '').trim().toLowerCase();
  const defaultSlug = gameRouteParam(defaultGame);
  if (coverSlug && defaultSlug && coverSlug !== defaultSlug) return false;

  const kickoffAt = Date.parse(defaultGame.kickoff_at || '');
  const nowAt = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (defaultGame.kickoff_status !== 'tbd' &&
      Number.isFinite(kickoffAt) && Number.isFinite(nowAt) &&
      nowAt >= kickoffAt + rolloverGuardMs) {
    return false;
  }

  return true;
}

function publicSnapshotValue(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    schemaVersion: snapshot.schemaVersion || '',
    ...Object.fromEntries(PUBLIC_SNAPSHOT_KEYS.map((key) => [key, snapshot[key] ?? null]))
  };
}

export function publicSnapshotsEqual(left, right) {
  if (!left || !right) return false;
  return JSON.stringify(publicSnapshotValue(left)) === JSON.stringify(publicSnapshotValue(right));
}

export function dataAvailabilityCopy({ dataSource, venueCount, refreshFailed = false }) {
  if (dataSource === 'fallback' && venueCount === 0) {
    return {
      unavailable: true,
      partyStat: 'Game schedule available',
      locationStat: 'Location data unavailable',
      trayCopy: 'The schedule loaded, but gathering-location data is temporarily unavailable.',
      emptyHeading: 'Gathering-location data is temporarily unavailable.',
      emptyGuidance: 'The game schedule is available. Try again after the latest location data loads.'
    };
  }

  if (dataSource !== 'live') {
    return {
      unavailable: false,
      partyStat: '',
      locationStat: '',
      trayCopy: refreshFailed
        ? 'Showing saved location data. The latest update is temporarily unavailable.'
        : 'Showing saved location data while the latest update loads.',
      emptyHeading: '',
      emptyGuidance: ''
    };
  }

  return {
    unavailable: false,
    partyStat: '',
    locationStat: '',
    trayCopy: TRAY_GUIDANCE_COPY,
    emptyHeading: '',
    emptyGuidance: ''
  };
}

function safeStorageGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}

function safeStorageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (_) {}
}

function safeStorageRemove(key) {
  try { window.localStorage.removeItem(key); } catch (_) {}
}

function configuredEndpoint() {
  return readRuntimeConfig().dataEndpoint;
}

function readSavedSnapshot() {
  const cached = safeStorageGet(LAST_GOOD_KEY);
  if (!cached) return null;
  try {
    const snapshot = JSON.parse(cached);
    return validateSnapshotShape(snapshot) ? snapshot : null;
  } catch (_) {
    return null;
  }
}

function currentLoadingCoverGameSlug(documentObject = document) {
  const preload = documentObject?.querySelector?.('#cgb-loading-cover-preload');
  const href = preload?.getAttribute?.('href') || preload?.href || '';
  const clean = String(href).split(/[?#]/)[0];
  const filename = clean.slice(clean.lastIndexOf('/') + 1);
  return filename.toLowerCase().endsWith('.png') ? filename.slice(0, -4) : '';
}

function prepareStartupEndpoint() {
  const endpoint = configuredEndpoint();
  const meta = document.querySelector('meta[name="cgb-data-endpoint"]');
  const snapshot = readSavedSnapshot();
  const fastStart = Boolean(endpoint && meta && shouldUseSavedSnapshotAtStartup({
    snapshot,
    search: window.location?.search || '',
    loadingCoverGameSlug: currentLoadingCoverGameSlug()
  }));

  if (!fastStart) {
    return { endpoint, fastStart: false, restore() {} };
  }

  const originalMetaContent = meta.content;
  const storedEndpoint = safeStorageGet(DATA_ENDPOINT_OVERRIDE_STORAGE_KEY);
  if (storedEndpoint !== null) safeStorageRemove(DATA_ENDPOINT_OVERRIDE_STORAGE_KEY);
  meta.content = SAVED_STARTUP_ENDPOINT;

  let restored = false;
  return {
    endpoint,
    fastStart: true,
    restore() {
      if (restored) return;
      restored = true;
      meta.content = originalMetaContent;
      if (storedEndpoint !== null) safeStorageSet(DATA_ENDPOINT_OVERRIDE_STORAGE_KEY, storedEndpoint);
    }
  };
}

async function fetchJson(url, timeoutMs = REFRESH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function applyPublicSnapshot(app, snapshot, dataSource = 'live') {
  const state = app.getState?.();
  if (!state?.snapshot) return false;

  const changed = !publicSnapshotsEqual(state.snapshot, snapshot);
  PUBLIC_SNAPSHOT_KEYS.forEach((key) => {
    state.snapshot[key] = snapshot[key];
  });
  if ('schemaVersion' in snapshot) state.snapshot.schemaVersion = snapshot.schemaVersion;
  if ('generatedAt' in snapshot) state.snapshot.generatedAt = snapshot.generatedAt;
  state.dataSource = dataSource;
  return changed;
}

function replaceUnavailableList(copy) {
  const list = document.querySelector('#location-list');
  if (!list) return;
  const empty = document.createElement('section');
  empty.className = 'empty-state';
  const heading = document.createElement('strong');
  heading.textContent = copy.emptyHeading;
  const guidance = document.createElement('p');
  guidance.textContent = copy.emptyGuidance;
  empty.append(heading, guidance);
  list.replaceChildren(empty);
}

function applyDataAvailabilityCopy(refreshFailed = false) {
  const app = window.CGBApp;
  const state = app?.getState?.();
  const snapshot = state?.snapshot;
  if (!snapshot) return;

  const copy = dataAvailabilityCopy({
    dataSource: state.dataSource,
    venueCount: Array.isArray(snapshot.venues) ? snapshot.venues.length : 0,
    refreshFailed
  });

  const traySummary = document.querySelector('#tray-summary-copy');
  if (traySummary) traySummary.textContent = copy.trayCopy;

  if (!copy.unavailable) return;

  const partyStat = document.querySelector('#watch-party-stat');
  const locationStat = document.querySelector('#location-stat');
  const listHeading = document.querySelector('#list-heading');
  if (partyStat) partyStat.textContent = copy.partyStat;
  if (locationStat) locationStat.textContent = copy.locationStat;
  if (listHeading) listHeading.textContent = 'Gathering locations';
  replaceUnavailableList(copy);
}

function waitForSnapshot(timeoutMs = 12000) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (window.CGBApp?.getSnapshot?.()) return resolve(true);
      if (Date.now() - startedAt >= timeoutMs) return resolve(false);
      window.setTimeout(check, 25);
    };
    check();
  });
}

function restoreDirectEntryAfterRefresh(app) {
  const state = app.getState?.();
  if (!state?.snapshot || state.detailMode) return false;
  const venueId = resolveDirectEntryVenueId(state.snapshot, window.location.search);
  if (!venueId) return false;
  state.detailMode = true;
  state.selectedVenueId = venueId;
  return true;
}

function startRefreshController(endpoint) {
  const app = window.CGBApp;
  if (!app) return null;

  let inFlight = null;
  let lastAttemptAt = Date.now();
  let refreshFailed = !endpoint || app.getState?.()?.dataSource !== 'live';

  const applyCopy = () => applyDataAvailabilityCopy(refreshFailed);
  app.subscribe?.('rendered', applyCopy);
  applyCopy();

  async function refreshLive({ force = false } = {}) {
    if (!endpoint || !app.getSnapshot?.()) return false;
    if (!force && document.visibilityState !== 'visible') return false;
    if (inFlight) return inFlight;

    lastAttemptAt = Date.now();
    inFlight = (async () => {
      const live = await fetchJson(endpoint);
      if (!validateSnapshotShape(live)) throw new Error('Unexpected public-data shape');

      safeStorageSet(LAST_GOOD_KEY, JSON.stringify(live));
      const changed = applyPublicSnapshot(app, live, 'live');
      const selectionChanged = app.restoreSelection?.({ preserveCurrentWhenEmpty: true }) === true;
      const directEntryChanged = changed && restoreDirectEntryAfterRefresh(app);

      if (changed || selectionChanged || directEntryChanged) app.render?.();
      refreshFailed = false;
      applyCopy();
      return true;
    })()
      .catch((error) => {
        refreshFailed = true;
        console.warn('Live snapshot refresh unavailable; retaining cached or fallback data.', error);
        applyCopy();
        return false;
      })
      .finally(() => { inFlight = null; });

    return inFlight;
  }

  const refreshWhenStale = () => {
    if (!shouldRefreshSnapshot({
      visibilityState: document.visibilityState,
      now: Date.now(),
      lastAttemptAt
    })) return;
    refreshLive();
  };

  window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshLive();
  }, ACTIVE_REFRESH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshWhenStale();
  });
  window.addEventListener('focus', refreshWhenStale);

  return { refreshLive };
}

function initializeBrowserRefresh(startupEndpoint) {
  window.addEventListener('DOMContentLoaded', async () => {
    const ready = await waitForSnapshot();
    startupEndpoint.restore();
    if (!ready) return;
    browserRefreshController = startRefreshController(startupEndpoint.endpoint || configuredEndpoint());
    if (startupEndpoint.fastStart) {
      await browserRefreshController?.refreshLive({ force: true });
    }
  }, { once: true });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  clearDisallowedDataEndpointOverride({ hostname: window.location?.hostname });
  const startupEndpoint = prepareStartupEndpoint();
  window.CGBSnapshotRefresh = Object.freeze({
    refresh() {
      return browserRefreshController?.refreshLive({ force: true }) || Promise.resolve(false);
    }
  });
  initializeBrowserRefresh(startupEndpoint);
}
