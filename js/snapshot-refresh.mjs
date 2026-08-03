export const ACTIVE_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const FOCUS_REFRESH_STALE_MS = 5 * 60 * 1000;

const DATA_URL_KEY = 'cgb_v2_public_data_url';
const DEFAULT_TRAY_COPY = 'Watch Parties first, then Cal Bars and Community Locations.';

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
    trayCopy: DEFAULT_TRAY_COPY,
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

function suspendConfiguredEndpoint() {
  const meta = document.querySelector('meta[name="cgb-data-endpoint"]');
  const metaValue = meta?.content || '';
  const storedValue = safeStorageGet(DATA_URL_KEY);
  const endpoint = String(storedValue || '').trim() || metaValue.trim();

  if (storedValue !== null) safeStorageRemove(DATA_URL_KEY);
  if (meta) meta.content = '';

  let restored = false;
  return {
    endpoint,
    restore() {
      if (restored) return;
      restored = true;
      if (storedValue !== null) safeStorageSet(DATA_URL_KEY, storedValue);
      if (meta) meta.content = metaValue;
    }
  };
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
  app.render?.();
  return true;
}

function startRefreshController(endpointControl) {
  const app = window.CGBApp;
  if (!app) return;

  let inFlight = null;
  let lastAttemptAt = 0;
  let refreshFailed = !endpointControl.endpoint;

  const applyCopy = () => applyDataAvailabilityCopy(refreshFailed);
  app.subscribe?.('rendered', applyCopy);
  applyCopy();

  async function refreshLive({ force = false } = {}) {
    if (!endpointControl.endpoint || !app.getSnapshot?.()) return false;
    if (!force && document.visibilityState !== 'visible') return false;
    if (inFlight) return inFlight;

    lastAttemptAt = Date.now();
    inFlight = app.refreshSnapshot({ restoreSelection: true })
      .then((updated) => {
        refreshFailed = !updated;
        if (updated) restoreDirectEntryAfterRefresh(app);
        applyCopy();
        return updated;
      })
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

  refreshLive({ force: true });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshLive();
  }, ACTIVE_REFRESH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshWhenStale();
  });
  window.addEventListener('focus', refreshWhenStale);
}

async function initializeBrowserRefresh() {
  const endpointControl = suspendConfiguredEndpoint();
  window.addEventListener('DOMContentLoaded', async () => {
    endpointControl.restore();
    const ready = await waitForSnapshot();
    if (!ready) return;
    startRefreshController(endpointControl);
  }, { once: true });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeBrowserRefresh();
}
