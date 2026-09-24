const DEFAULT_PROJECTION_MS = 140;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clampTrayHeight(value, minHeight, maxHeight) {
  const min = Math.max(0, finite(minHeight));
  const max = Math.max(min, finite(maxHeight, min));
  return Math.min(max, Math.max(min, finite(value, min)));
}

export function projectedTrayHeight({
  height = 0,
  velocityY = 0,
  minHeight = 0,
  maxHeight = 0,
  projectionMs = DEFAULT_PROJECTION_MS
} = {}) {
  return clampTrayHeight(
    finite(height) - finite(velocityY) * Math.max(0, finite(projectionMs, DEFAULT_PROJECTION_MS)),
    minHeight,
    maxHeight
  );
}

export function magneticTrayState({
  height = 0,
  velocityY = 0,
  restingHeights = {},
  snapDistance = 36,
  projectionMs = 90
} = {}) {
  const entries = Object.entries(restingHeights)
    .map(([state, value]) => [state, finite(value, Number.NaN)])
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a[1] - b[1]);

  if (!entries.length) return null;
  const minHeight = entries[0][1];
  const maxHeight = entries[entries.length - 1][1];
  const projected = projectedTrayHeight({
    height,
    velocityY,
    minHeight,
    maxHeight,
    projectionMs
  });
  const nearest = entries.reduce((best, entry) => {
    const distance = Math.abs(entry[1] - projected);
    return distance < best.distance ? { state: entry[0], distance } : best;
  }, { state: entries[0][0], distance: Math.abs(entries[0][1] - projected) });

  return nearest.distance <= Math.max(0, finite(snapDistance, 36)) ? nearest.state : null;
}
