const LAST_GOOD_KEY = 'cgb_v2_last_good_snapshot';

function hasCoordinateValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function isMappableVenue(venue) {
  if (!venue || !hasCoordinateValue(venue.latitude) || !hasCoordinateValue(venue.longitude)) {
    return false;
  }

  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180;
}

function isPublicSnapshot(value) {
  return value &&
    typeof value === 'object' &&
    Array.isArray(value.venues) &&
    Array.isArray(value.watchParties) &&
    Array.isArray(value.fanCounts) &&
    Array.isArray(value.venueHistoryCounts);
}

export function sanitizeSnapshotCoordinates(snapshot, logger = console) {
  if (!isPublicSnapshot(snapshot)) return snapshot;

  const validVenues = snapshot.venues.filter(isMappableVenue);
  if (validVenues.length === snapshot.venues.length) return snapshot;

  const validVenueIds = new Set(validVenues.map((venue) => venue.venue_id));
  const omittedVenueIds = snapshot.venues
    .filter((venue) => !validVenueIds.has(venue.venue_id))
    .map((venue) => venue.venue_id || '(missing venue_id)');

  logger?.warn?.(
    `Omitted ${omittedVenueIds.length} published venue record(s) with invalid coordinates.`,
    omittedVenueIds
  );

  return {
    ...snapshot,
    venues: validVenues,
    watchParties: snapshot.watchParties.filter((row) => validVenueIds.has(row.venue_id)),
    fanCounts: snapshot.fanCounts.filter((row) => validVenueIds.has(row.venue_id)),
    venueHistoryCounts: snapshot.venueHistoryCounts.filter((row) => validVenueIds.has(row.venue_id))
  };
}

function wrapJsonResponse(response, logger) {
  return new Proxy(response, {
    get(target, property) {
      if (property === 'json') {
        return async () => sanitizeSnapshotCoordinates(await target.json(), logger);
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

export function installSnapshotCoordinateGuard(scope = window, logger = console) {
  if (!scope || scope.__cgbSnapshotCoordinateGuardInstalled) return;

  const nativeFetch = scope.fetch?.bind(scope);
  if (nativeFetch) {
    scope.fetch = async (...args) => wrapJsonResponse(await nativeFetch(...args), logger);
  }

  const storagePrototype = scope.Storage?.prototype;
  if (storagePrototype && !storagePrototype.__cgbCoordinateGuardGetItem) {
    const nativeGetItem = storagePrototype.getItem;
    storagePrototype.getItem = function guardedGetItem(key) {
      const value = nativeGetItem.call(this, key);
      if (key !== LAST_GOOD_KEY || !value) return value;

      try {
        return JSON.stringify(sanitizeSnapshotCoordinates(JSON.parse(value), logger));
      } catch (_) {
        return value;
      }
    };
    Object.defineProperty(storagePrototype, '__cgbCoordinateGuardGetItem', {
      value: nativeGetItem,
      enumerable: false,
      configurable: false,
      writable: false
    });
  }

  Object.defineProperty(scope, '__cgbSnapshotCoordinateGuardInstalled', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });
}

if (typeof window !== 'undefined') {
  installSnapshotCoordinateGuard(window, console);
}
