const DEFAULT_MARKER_WIDTH_PX = 48;
const DEFAULT_MARKER_HEIGHT_PX = 54;
const COLLISION_PADDING_PX = 4;
const FAN_GAP_PX = 8;
const FAN_MIN_RADIUS_PX = 36;

let appConnected = false;
let trackedMap = null;
let activeFanIds = new Set();

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positive(value, fallback) {
  const number = finite(value);
  return number !== null && number > 0 ? number : fallback;
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

function normalizedEntries(entries = []) {
  return entries
    .map((entry) => ({
      id: String(entry?.id ?? ''),
      x: finite(entry?.x),
      y: finite(entry?.y),
      width: positive(entry?.width, DEFAULT_MARKER_WIDTH_PX),
      height: positive(entry?.height, DEFAULT_MARKER_HEIGHT_PX)
    }))
    .filter((entry) => entry.id && entry.x !== null && entry.y !== null);
}

function markerRect(entry, padding = 0) {
  return {
    left: entry.x - (entry.width / 2) - padding,
    right: entry.x + (entry.width / 2) + padding,
    top: entry.y - entry.height - padding,
    bottom: entry.y + padding
  };
}

function overlaps(a, b, padding) {
  const first = markerRect(a, padding);
  const second = markerRect(b, padding);
  return first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top;
}

export function markerCollisionGroup(entries = [], targetId, {
  collisionPaddingPx = COLLISION_PADDING_PX
} = {}) {
  const normalized = normalizedEntries(entries);
  const target = String(targetId ?? '');
  if (!target) return [];
  const targetEntry = normalized.find((entry) => entry.id === target);
  if (!targetEntry) return [];
  const padding = Math.max(0, finite(collisionPaddingPx) ?? COLLISION_PADDING_PX);

  return normalized.filter((entry) =>
    entry.id === target || overlaps(targetEntry, entry, padding));
}

export function markerFanOffsets(entries = [], targetId, {
  collisionPaddingPx = COLLISION_PADDING_PX,
  fanGapPx = FAN_GAP_PX,
  fanMinRadiusPx = FAN_MIN_RADIUS_PX
} = {}) {
  const normalized = normalizedEntries(entries);
  const offsets = new Map(normalized.map((entry) => [entry.id, [0, 0]]));
  const target = String(targetId ?? '');
  const group = markerCollisionGroup(normalized, target, { collisionPaddingPx });
  if (group.length < 2) return offsets;

  const targetEntry = group.find((entry) => entry.id === target);
  if (!targetEntry) return offsets;
  const others = group
    .filter((entry) => entry.id !== target)
    .sort((a, b) => a.id.localeCompare(b.id));

  const gap = Math.max(0, finite(fanGapPx) ?? FAN_GAP_PX);
  const minRadius = Math.max(0, finite(fanMinRadiusPx) ?? FAN_MIN_RADIUS_PX);
  const largestMarker = Math.max(...group.map((entry) => Math.max(entry.width, entry.height)));
  const desiredSeparation = largestMarker + gap;
  const ringRadius = others.length > 1
    ? desiredSeparation / (2 * Math.sin(Math.PI / others.length))
    : desiredSeparation;
  const radius = Math.max(minRadius, desiredSeparation, ringRadius);
  const startAngle = -Math.PI / 2;

  others.forEach((entry, index) => {
    const angle = startAngle + ((Math.PI * 2 * index) / others.length);
    const desiredX = targetEntry.x + (Math.cos(angle) * radius);
    const desiredY = targetEntry.y + (Math.sin(angle) * radius);
    offsets.set(entry.id, [
      rounded(desiredX - entry.x),
      rounded(desiredY - entry.y)
    ]);
  });

  return offsets;
}

function projectedMarkerEntries(state) {
  const map = state?.map;
  if (!map?.project || !state?.markers?.forEach || !state?.snapshot?.venues) return [];
  const venues = new Map(state.snapshot.venues.map((venue) => [String(venue.venue_id), venue]));
  const entries = [];

  state.markers.forEach((marker, venueId) => {
    const id = String(venueId);
    const venue = venues.get(id);
    const longitude = finite(venue?.longitude);
    const latitude = finite(venue?.latitude);
    if (longitude === null || latitude === null) return;

    try {
      const point = map.project([longitude, latitude]);
      const x = finite(point?.x);
      const y = finite(point?.y);
      if (x === null || y === null) return;
      const rect = marker?.getElement?.()?.getBoundingClientRect?.();
      entries.push({
        id,
        x,
        y,
        width: positive(rect?.width, DEFAULT_MARKER_WIDTH_PX),
        height: positive(rect?.height, DEFAULT_MARKER_HEIGHT_PX)
      });
    } catch (_) {}
  });

  return entries;
}

function setFanClass(marker, active) {
  const element = marker?.getElement?.();
  element?.classList?.toggle?.('is-fanned', active);
}

export function collapseMarkerFan({ app = globalThis.window?.CGBApp } = {}) {
  if (!activeFanIds.size) return false;
  const state = app?.getState?.();
  state?.markers?.forEach?.((marker) => {
    marker?.setOffset?.([0, 0]);
    setFanClass(marker, false);
  });
  activeFanIds = new Set();
  return true;
}

function openMarkerFan(targetId, { app = globalThis.window?.CGBApp } = {}) {
  const state = app?.getState?.();
  if (!state?.markers?.forEach) return false;
  const entries = projectedMarkerEntries(state);
  const group = markerCollisionGroup(entries, targetId);
  if (group.length < 2) return false;

  const offsets = markerFanOffsets(entries, targetId);
  activeFanIds = new Set(group.map((entry) => entry.id));
  state.markers.forEach((marker, venueId) => {
    const id = String(venueId);
    marker?.setOffset?.(offsets.get(id) || [0, 0]);
    setFanClass(marker, activeFanIds.has(id));
  });
  return true;
}

function markerButtonFromEvent(event) {
  return event?.target?.closest?.('.cgb-marker[data-venue-id]') || null;
}

function handleDocumentClick(event) {
  const button = markerButtonFromEvent(event);
  if (!button) {
    collapseMarkerFan();
    return;
  }

  const venueId = String(button.dataset?.venueId || '');
  if (!venueId) return;

  if (activeFanIds.has(venueId)) return;
  if (activeFanIds.size) collapseMarkerFan();
  if (!openMarkerFan(venueId)) return;

  event.preventDefault?.();
  event.stopImmediatePropagation?.();
}

function collapseActiveFan() {
  collapseMarkerFan();
}

function trackMap() {
  const map = window.CGBApp?.getState?.()?.map || null;
  if (map === trackedMap) return;
  try { trackedMap?.off?.('movestart', collapseActiveFan); } catch (_) {}
  trackedMap = map;
  trackedMap?.on?.('movestart', collapseActiveFan);
}

function handleRendered() {
  collapseMarkerFan();
  trackMap();
}

function connect() {
  if (appConnected || typeof window === 'undefined') return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connect, 25);
    return;
  }

  appConnected = true;
  document.addEventListener('click', handleDocumentClick, { capture: true });
  app.subscribe('rendered', handleRendered);
  app.subscribe('ready', trackMap);
  window.addEventListener('resize', collapseActiveFan);
  window.visualViewport?.addEventListener?.('resize', collapseActiveFan);
  trackMap();
}

if (typeof window !== 'undefined') {
  window.setTimeout(connect, 0);
}
