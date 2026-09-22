import './analytics.mjs';
import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';
import { presentationSnapshot } from './app-state.mjs';
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

export function shouldRefreshAfterStartup(dataSource) {
  return dataSource !== 'live';
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

function configuredEndpoint() {
  return readRuntimeConfig().dataEndpoint;
}

export function readSavedSnapshot() {
  const cached = safeStorageGet(LAST_GOOD_KEY);
  if (!cached) return null;
  try {
    const snapshot = JSON.parse(cached);
    return validateSnapshotShape(snapshot) ? snapshot : null;
  } catch (_) {
    return null;
  }
}

export function currentLoadingCoverGameSlug(documentObject = document) {
  const preload = documentObject?.querySelector?.('#cgb-loading-cover-preload');
  const href = preload?.getAttribute?.('href') || preload?.href || '';
  const clean = String(href).split(/[?#]/)[0];
  const filename = clean.slice(clean.lastIndexOf('/') + 1);
  return filename.toLowerCase().endsWith('.png') ? filename.slice(0, -4) : '';
}

export function shouldUseStaticSnapshotAtStartup({
  snapshot,
  search = '',
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

  const kickoffAt = Date.parse(defaultGame.kickoff_at || '');
  const nowAt = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (defaultGame.kickoff_status !== 'tbd' &&
      Number.isFinite(kickoffAt) && Number.isFinite(nowAt) &&
      nowAt >= kickoffAt + rolloverGuardMs) {
    return false;
  }
  return true;
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

function rowsByIdentity(rows, identityFields) {
  const fields = Array.isArray(identityFields) ? identityFields : [identityFields];
  const values = new Map();
  (rows || []).forEach((row, index) => {
    const parts = fields.map((field) => String(row?.[field] ?? ''));
    const key = parts.some(Boolean) ? parts.join('::') : String(index);
    values.set(key, row);
  });
  return values;
}

function changedRowVenueIds(leftRows, rightRows, identityFields = 'venue_id') {
  const left = rowsByIdentity(leftRows, identityFields);
  const right = rowsByIdentity(rightRows, identityFields);
  const keys = new Set([...left.keys(), ...right.keys()]);
  const venueIds = new Set();
  keys.forEach((key) => {
    const before = left.get(key);
    const after = right.get(key);
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const beforeVenueId = String(before?.venue_id || '');
    const afterVenueId = String(after?.venue_id || '');
    if (beforeVenueId) venueIds.add(beforeVenueId);
    if (afterVenueId) venueIds.add(afterVenueId);
  });
  return venueIds;
}

export function publicSnapshotChanges(left, right) {
  left = presentationSnapshot(left || {});
  right = presentationSnapshot(right || {});
  const changedVenueIds = new Set();
  [
    changedRowVenueIds(left?.venues, right?.venues),
    changedRowVenueIds(left?.watchParties, right?.watchParties, 'watch_party_id'),
    changedRowVenueIds(left?.fanCounts, right?.fanCounts, ['game_id', 'venue_id']),
    changedRowVenueIds(left?.venueHistoryCounts, right?.venueHistoryCounts),
    changedRowVenueIds(left?.venueSeasonCounts, right?.venueSeasonCounts, ['season', 'venue_id']),
    changedRowVenueIds(left?.fanExperiences, right?.fanExperiences, ['venue_id', 'text'])
  ].forEach((ids) => ids.forEach((id) => changedVenueIds.add(id)));

  return {
    changed: !publicSnapshotsEqual(left, right),
    changedVenueIds: [...changedVenueIds],
    gamesChanged: JSON.stringify(left?.games || []) !== JSON.stringify(right?.games || [])
  };
}

function applyPublicSnapshot(app, snapshot, dataSource = 'live') {
  const state = app.getState?.();
  if (!state?.snapshot) return { changed: false, changedVenueIds: [], gamesChanged: false };

  const nextSnapshot = presentationSnapshot(snapshot);
  const changes = publicSnapshotChanges(state.snapshot, nextSnapshot);
  PUBLIC_SNAPSHOT_KEYS.forEach((key) => {
    state.snapshot[key] = nextSnapshot[key];
  });
  if ('schemaVersion' in nextSnapshot) state.snapshot.schemaVersion = nextSnapshot.schemaVersion;
  if ('generatedAt' in nextSnapshot) state.snapshot.generatedAt = nextSnapshot.generatedAt;
  state.dataSource = dataSource;
  return changes;
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
    markCgbPerformance('cgb:live-refresh:start');
    markCgbPerformance('cgb:snapshot:request:start');
    inFlight = (async () => {
      const live = await fetchJson(endpoint);
      if (!validateSnapshotShape(live)) throw new Error('Unexpected public-data shape');

      safeStorageSet(LAST_GOOD_KEY, JSON.stringify(live));
      const changes = applyPublicSnapshot(app, live, 'live');
      const selectionChanged = app.restoreSelection?.({ preserveCurrentWhenEmpty: true }) === true;
      const directEntryChanged = changes.changed && restoreDirectEntryAfterRefresh(app);

      if (changes.changed || selectionChanged || directEntryChanged) {
        if (typeof app.renderSnapshotRefresh === 'function') {
          app.renderSnapshotRefresh(Object.assign({}, changes, {
            selectionChanged: selectionChanged,
            directEntryChanged: directEntryChanged
          }));
        } else {
          app.render?.();
        }
      }
      refreshFailed = false;
      markCgbPerformance('cgb:snapshot:source:live');
      markCgbPerformance('cgb:live-refresh:complete');
      markCgbPerformance('cgb:snapshot:request:complete');
      measureCgbPerformance('cgb:live-refresh', 'cgb:live-refresh:start', 'cgb:live-refresh:complete');
      measureCgbPerformance('cgb:snapshot:request', 'cgb:snapshot:request:start', 'cgb:snapshot:request:complete');
      applyCopy();
      return true;
    })()
      .catch((error) => {
        refreshFailed = true;
        markCgbPerformance('cgb:live-refresh:failed');
        markCgbPerformance('cgb:snapshot:request:complete');
        measureCgbPerformance('cgb:snapshot:request', 'cgb:snapshot:request:start', 'cgb:snapshot:request:complete');
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

function initializeBrowserRefresh() {
  window.addEventListener('DOMContentLoaded', async () => {
    const ready = await waitForSnapshot();
    if (!ready) return;
    browserRefreshController = startRefreshController(configuredEndpoint());
    if (shouldRefreshAfterStartup(window.CGBApp?.getState?.()?.dataSource)) {
      void browserRefreshController?.refreshLive({ force: true });
    }
  }, { once: true });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  clearDisallowedDataEndpointOverride({ hostname: window.location?.hostname });
  window.CGBSnapshotRefresh = Object.freeze({
    refresh() {
      return browserRefreshController?.refreshLive({ force: true }) || Promise.resolve(false);
    }
  });
  initializeBrowserRefresh();
}
