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

function comparableStreet(value) {
  return cleanText(value, 240)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^\d+[a-z]?(?:-\d+[a-z]?)?\s+/i, '')
    .replace(/\b(?:suite|ste|unit|apt|apartment)\b.*$/g, '')
    .replace(/\b(north)\b/g, 'n')
    .replace(/\b(south)\b/g, 's')
    .replace(/\b(east)\b/g, 'e')
    .replace(/\b(west)\b/g, 'w')
    .replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave')
    .replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(lane)\b/g, 'ln')
    .replace(/\b(highway)\b/g, 'hwy')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function submittedStreetLine(value) {
  return cleanText(String(value ?? '').split(',')[0], 220);
}

function addressDisplay(place, addressLine1) {
  return cleanText([
    addressLine1,
    place.city,
    [place.region, place.postalCode].filter(Boolean).join(' '),
    place.countryCode
  ].filter(Boolean).join(', '), 600);
}

export function buildMapTilerAddressSearchUrl(address, key, { limit = 5, proximity = null } = {}) {
  const url = baseGeocodingUrl(address, key);
  url.searchParams.set('key', cleanText(key, 500));
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 5))));
  url.searchParams.set('autocomplete', 'false');
  url.searchParams.set('fuzzyMatch', 'false');
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

export function resolvedManualPlace(payload, venueName, submittedAddress = '') {
  const name = cleanText(venueName, 180);
  if (!name) return null;

  const places = normalizeMapTilerResults(payload, 10)
    .filter((place) => place.placeType === 'address');
  if (!places.length) return null;

  const submitted = cleanText(submittedAddress, 600);
  if (!submitted) {
    return Object.freeze({
      ...places[0],
      name,
      placeType: 'address',
      preserveUserSuppliedName: true
    });
  }

  const streetLine = submittedStreetLine(submitted);
  const street = comparableStreet(streetLine);
  if (!streetLine || !street) return null;

  const exact = places.find((place) => cleanText(place.addressLine1, 220).toLowerCase() === streetLine.toLowerCase());
  const address = exact || places.find((place) => comparableStreet(place.addressLine1) === street);
  if (!address) return null;

  return Object.freeze({
    ...address,
    name,
    addressLine1: streetLine,
    address: addressDisplay(address, streetLine),
    submittedAddress: submitted,
    placeType: 'address',
    preserveUserSuppliedName: true
  });
}

export function manualPlaceName(value) {
  return cleanText(value, 180);
}
