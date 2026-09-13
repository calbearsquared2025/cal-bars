export function normalizedUserLocation(origin) {
  const lat = Number(origin?.lat);
  const lon = Number(origin?.lon);
  if (origin?.label !== 'your location' || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: 'your location' };
}

export function nearbyLocationControlPresentation({ origin, nearbyOrigin, query, radiusMiles }) {
  const usingNearby = Boolean(normalizedUserLocation(origin));
  const filteringSearch = Boolean(query || (origin && !usingNearby));
  const browsingAll = !usingNearby && !filteringSearch;
  const canRestoreNearby = !usingNearby && Boolean(normalizedUserLocation(nearbyOrigin));
  return {
    usingNearby,
    browsingAll,
    nearbyLabel: usingNearby
      ? `Near me selected, showing locations within ${radiusMiles} miles`
      : canRestoreNearby
        ? 'Show nearby locations using your saved location'
        : 'Use my location to show nearby locations',
    allLabel: browsingAll ? 'All locations selected' : 'Show all mapped locations'
  };
}
