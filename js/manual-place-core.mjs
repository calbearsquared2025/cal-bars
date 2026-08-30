import { normalizeMapTilerResults } from './external-venue-core.mjs';

function cleanText(value, maximum = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function coordinates(origin) {
  const latitude = Number(origin?.lat ?? origin?.latitude);
  const longitude = Number(origin?.lon ?? origin?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function baseGeocodingUrl(query, key) {
  const normalizedQuery = cleanText(query, 300);
  const normalizedKey = cleanText(key, 500);
  if (!normalizedQuery || !normalizedKey) throw new Error('maptiler_not_configured');
  return new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(normalizedQuery)}.json`);
}

export function buildMapTilerAddressSearchUrl(address, key, { limit = 5, proximity = null } = {}) {
  const url = baseGeocodingUrl(address, key);
  url.searchParams.set('key', cleanText(key, 500));
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 5))));
  url.searchParams.set('autocomplete', 'false');
  url.searchParams.set('fuzzyMatch', 'true');
  url.searchParams.set('country', 'us');
  url.searchParams.set('types', 'address');
  const point = coordinates(proximity);
  if (point) url.searchParams.set('proximity', `${point.longitude},${point.latitude}`);
  return url.toString();
}

export function buildMapTilerReverseGeocodeUrl(origin, key, { limit = 5 } = {}) {
  const point = coordinates(origin);
  if (!point) throw new Error('invalid_user_location');
  const url = baseGeocodingUrl(`${point.longitude},${point.latitude}`, key);
  url.searchParams.set('key', cleanText(key, 500));
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 5))));
  url.searchParams.set('country', 'us');
  url.searchParams.set('types', 'address');
  return url.toString();
}

export function resolvedManualPlace(payload, venueName) {
  const name = cleanText(venueName, 180);
  if (!name) return null;
  const address = normalizeMapTilerResults(payload, 10)
    .find((place) => place.placeType === 'address');
  if (!address) return null;
  return Object.freeze({ ...address, name, placeType: 'address' });
}

export function manualPlaceName(value) {
  return cleanText(value, 180);
}
