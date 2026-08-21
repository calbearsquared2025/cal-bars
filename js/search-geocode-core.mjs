function clean(value, maximum = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function normalizedCountryCode(value) {
  const raw = clean(value, 32).toUpperCase();
  if (!raw) return '';
  const parts = raw.split(/[-_]/).filter(Boolean);
  const candidate = parts.at(-1)?.replace(/[^A-Z]/g, '') || '';
  if (candidate === 'USA') return 'US';
  return candidate.length === 2 ? candidate : '';
}

function countryCode(feature) {
  const direct = [
    feature?.properties?.country_code,
    feature?.country_code,
    feature?.properties?.short_code,
    feature?.short_code
  ].map(normalizedCountryCode).find(Boolean);
  if (direct) return direct;

  const country = (feature?.context || []).find((item) => {
    const id = clean(item?.id, 120).toLowerCase();
    const type = [item?.type, item?.place_type].flat().map((value) => clean(value, 40).toLowerCase());
    return id.startsWith('country.') || type.includes('country');
  });
  return normalizedCountryCode(
    country?.short_code || country?.properties?.short_code || country?.country_code || country?.properties?.country_code
  );
}

function featureCoordinates(feature) {
  const coordinates = Array.isArray(feature?.center)
    ? feature.center
    : feature?.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates)
      ? feature.geometry.coordinates
      : null;
  if (!coordinates || coordinates.length < 2) return null;
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  return { lon, lat };
}

export function buildUsAreaSearchUrl(query, key, { language = 'en', limit = 5 } = {}) {
  const normalizedQuery = clean(query, 240);
  const normalizedKey = clean(key, 240);
  if (!normalizedQuery || !normalizedKey) throw new Error('maptiler_not_configured');

  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(normalizedQuery)}.json`);
  url.searchParams.set('key', normalizedKey);
  url.searchParams.set('language', language);
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 5))));
  url.searchParams.set('autocomplete', 'false');
  url.searchParams.set('country', 'us');
  return url.toString();
}

export function normalizeUsAreaOrigin(payload, query = '') {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  for (const feature of features) {
    if (countryCode(feature) !== 'US') continue;
    const coordinates = featureCoordinates(feature);
    if (!coordinates) continue;
    return Object.freeze({
      ...coordinates,
      label: clean(feature?.place_name || feature?.matching_place_name || feature?.text || feature?.name || query, 300)
    });
  }
  return null;
}
