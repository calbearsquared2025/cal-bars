const COLLISION_DISTANCE_PX = 28;
const SPREAD_RADIUS_PX = 9;

let appConnected = false;
let trackedMap = null;
let spreadFrame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizedEntries(entries = []) {
  return entries
    .map((entry) => ({
      id: String(entry?.id ?? ''),
      x: finite(entry?.x),
      y: finite(entry?.y)
    }))
    .filter((entry) => entry.id && entry.x !== null && entry.y !== null);
}

function collisionGroups(entries, threshold) {
  const groups = [];
  const visited = new Set();

  entries.forEach((seed) => {
    if (visited.has(seed.id)) return;
    const group = [];
    const pending = [seed];
    visited.add(seed.id);

    while (pending.length) {
      const current = pending.pop();
      group.push(current);
      entries.forEach((candidate) => {
        if (visited.has(candidate.id)) return;
        if (distance(current, candidate) > threshold) return;
        visited.add(candidate.id);
        pending.push(candidate);
      });
    }

    groups.push(group);
  });

  return groups;
}

export function markerSpreadOffsets(entries = [], {
  collisionDistancePx = COLLISION_DISTANCE_PX,
  spreadRadiusPx = SPREAD_RADIUS_PX
} = {}) {
  const threshold = Math.max(0, finite(collisionDistancePx) ?? COLLISION_DISTANCE_PX);
  const radius = Math.max(0, finite(spreadRadiusPx) ?? SPREAD_RADIUS_PX);
  const normalized = normalizedEntries(entries);
  const offsets = new Map(normalized.map((entry) => [entry.id, [0, 0]]));

  collisionGroups(normalized, threshold).forEach((group) => {
    if (group.length < 2) return;
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const center = group.reduce((sum, entry) => ({ x: sum.x + entry.x, y: sum.y + entry.y }), { x: 0, y: 0 });
    center.x /= group.length;
    center.y /= group.length;

    sorted.forEach((entry, index) => {
      let dx = entry.x - center.x;
      let dy = entry.y - center.y;
      let magnitude = Math.hypot(dx, dy);

      if (magnitude < 0.5) {
        const angle = (Math.PI * 2 * index) / sorted.length;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        magnitude = 1;
      }

      offsets.set(entry.id, [
        Math.round((dx / magnitude) * radius * 100) / 100,
        Math.round((dy / magnitude) * radius * 100) / 100
      ]);
    });
  });

  return offsets;
}

function projectedMarkerEntries(state) {
  const map = state?.map;
  if (!map?.project || !state?.markers?.forEach || !state?.snapshot?.venues) return [];
  const venues = new Map(state.snapshot.venues.map((venue) => [String(venue.venue_id), venue]));
  const entries = [];

  state.markers.forEach((_marker, venueId) => {
    const id = String(venueId);
    const venue = venues.get(id);
    const longitude = finite(venue?.longitude);
    const latitude = finite(venue?.latitude);
    if (longitude === null || latitude === null) return;

    try {
      const point = map.project([longitude, latitude]);
      const x = finite(point?.x);
      const y = finite(point?.y);
      if (x !== null && y !== null) entries.push({ id, x, y });
    } catch (_) {}
  });

  return entries;
}

export function syncMarkerSpread({ app = globalThis.window?.CGBApp } = {}) {
  const state = app?.getState?.();
  if (!state?.markers?.forEach) return false;
  const offsets = markerSpreadOffsets(projectedMarkerEntries(state));
  let spreadCount = 0;

  state.markers.forEach((marker, venueId) => {
    const offset = offsets.get(String(venueId)) || [0, 0];
    if (offset[0] || offset[1]) spreadCount += 1;
    marker?.setOffset?.(offset);
  });

  return spreadCount > 0;
}

function scheduleSpread() {
  if (spreadFrame || typeof window === 'undefined') return;
  spreadFrame = window.requestAnimationFrame?.(() => {
    spreadFrame = 0;
    syncMarkerSpread({ app: window.CGBApp });
  }) || 0;
}

function trackMap() {
  const map = window.CGBApp?.getState?.()?.map || null;
  if (map === trackedMap) return;
  try { trackedMap?.off?.('zoomend', scheduleSpread); } catch (_) {}
  trackedMap = map;
  trackedMap?.on?.('zoomend', scheduleSpread);
}

function sync() {
  trackMap();
  scheduleSpread();
}

function connect() {
  if (appConnected || typeof window === 'undefined') return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connect, 25);
    return;
  }

  appConnected = true;
  app.subscribe('rendered', sync);
  app.subscribe('ready', sync);
  window.addEventListener('resize', scheduleSpread);
  window.visualViewport?.addEventListener?.('resize', scheduleSpread);
  sync();
}

if (typeof window !== 'undefined') {
  window.setTimeout(connect, 0);
}
