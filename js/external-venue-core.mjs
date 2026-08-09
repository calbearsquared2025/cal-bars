const MAPTILER_PLACE_TYPES = new Set(['poi', 'address']);
const US_REGION_CODES = Object.freeze({
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC', 'puerto rico': 'PR', guam: 'GU',
  'american samoa': 'AS', 'northern mariana islands': 'MP',
  'united states virgin islands': 'VI', 'u s virgin islands': 'VI'
});

export const PUBLIC_VENUE_FIELDS = Object.freeze([
  'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
  'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
  'verification_status', 'alumni_owned', 'short_description', 'photo_url',
  'photo_credit', 'updated_at'
]);

const PRIVATE_RESPONSE_KEYS = new Set([
  'browserId', 'browser_id', 'fan_intent_id', 'external_source', 'external_place_id',
  'publication_status', 'source_submission_id', 'created_at', 'archived_at',
  'workbook_id', 'workbook_url', 'spreadsheet_id', 'spreadsheet_url',
  'reviewer_note', 'submitter_email', 'submitter_name'
]);

function cleanText(value, maximum = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function normalizeComparable(value) {
  return cleanText(value, 600)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function featureTypes(feature) {
  return Array.isArray(feature?.place_type)
    ? feature.place_type.map((value) => cleanText(value, 40).toLowerCase())
    : [];
}

function hierarchyItems(feature) {
  const items = [];
  if (feature && typeof feature === 'object') items.push(feature);
  if (Array.isArray(feature?.context)) items.push(...feature.context);
  return items;
}

function hierarchyItemMatches(item, prefix) {
  const idPrefix = cleanText(item?.id, 120).split('.')[0].toLowerCase();
  const typeValues = [item?.place_type, item?.type]
    .flat()
    .filter(Boolean)
    .map((value) => cleanText(value, 40).toLowerCase());
  return idPrefix === prefix || typeValues.includes(prefix);
}

function hierarchyMatch(feature, prefixes) {
  const items = hierarchyItems(feature);
  for (const prefix of prefixes) {
    const match = items.find((item) => hierarchyItemMatches(item, prefix));
    if (match) return match;
  }
  return null;
}

function hierarchyText(feature, prefixes) {
  const item = hierarchyMatch(feature, prefixes);
  return cleanText(item?.text || item?.place_name || item?.name, 160);
}

function countryCode(feature) {
  const country = hierarchyMatch(feature, ['country']);
  const raw = cleanText(
    country?.short_code || country?.properties?.short_code || country?.country_code ||
    feature?.properties?.country_code || feature?.properties?.country || '',
    20
  );
  const code = raw.split('-').pop().replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  return code.length === 2 ? code : '';
}

function cityFor(feature, code) {
  const cityLikeTypes = ['municipality', 'joint_municipality', 'place', 'locality'];
  const designated = hierarchyItems(feature).find((item) => {
    const designation = cleanText(item?.place_designation || item?.properties?.place_designation, 40).toLowerCase();
    return ['city', 'town', 'village'].includes(designation) &&
      cityLikeTypes.some((type) => hierarchyItemMatches(item, type));
  });
  if (designated) return cleanText(designated.text || designated.place_name || designated.name, 160);

  const priorities = code === 'US'
    ? ['municipality', 'joint_municipality', 'place', 'locality']
    : ['place', 'municipality', 'joint_municipality', 'locality'];
  return hierarchyText(feature, priorities);
}

function regionFor(feature, code) {
  if (code !== 'US') {
    const region = hierarchyMatch(feature, ['region', 'subregion', 'county']);
    return cleanText(region?.text || region?.place_name || region?.name, 160);
  }

  const administrativeItems = hierarchyItems(feature).filter((item) =>
    ['region', 'subregion', 'county'].some((prefix) => hierarchyItemMatches(item, prefix))
  );
  for (const item of administrativeItems) {
    const text = cleanText(item?.text || item?.place_name || item?.name, 160);
    const mapped = US_REGION_CODES[normalizeComparable(text)];
    if (mapped) return mapped;
  }
  return '';
}

function coordinatesFor(feature) {
  const coordinates = Array.isArray(feature?.center)
    ? feature.center
    : feature?.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates)
      ? feature.geometry.coordinates
      : null;
  if (!coordinates || coordinates.length < 2) return null;
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function addressLineFor(feature, name, placeNameParts, types) {
  const explicit = cleanText(
    feature?.properties?.address_line_1 || feature?.properties?.street_address || '',
    220
  );
  if (explicit) return explicit;

  if (types.includes('address')) {
    const number = cleanText(feature?.address, 40);
    const street = cleanText(feature?.text || feature?.name, 180);
    const combined = cleanText([number, street].filter(Boolean).join(' '), 220);
    if (combined) return combined;
  }

  const candidates = placeNameParts.filter((part) => normalizeComparable(part) !== normalizeComparable(name));
  return cleanText(candidates[0], 220);
}

export function normalizeMapTilerFeature(feature) {
  if (!feature || typeof feature !== 'object') return null;
  const types = featureTypes(feature);
  if (!types.some((type) => MAPTILER_PLACE_TYPES.has(type))) return null;

  const placeId = cleanText(feature.id, 200);
  const coordinates = coordinatesFor(feature);
  const placeName = cleanText(feature.place_name || feature.matching_place_name, 600);
  if (!placeId || !coordinates || !placeName) return null;

  const placeNameParts = placeName.split(',').map((part) => cleanText(part, 240)).filter(Boolean);
  const rawText = cleanText(feature.text || feature.name, 180);
  const name = types.includes('address')
    ? cleanText([feature.address, rawText].filter(Boolean).join(' '), 180)
    : rawText || placeNameParts[0];
  if (!name) return null;

  const code = countryCode(feature);
  const city = cityFor(feature, code);
  const region = regionFor(feature, code);
  const postalCode = hierarchyText(feature, ['postal_code', 'postcode']);
  const country = hierarchyText(feature, ['country']);
  const addressLine1 = addressLineFor(feature, name, placeNameParts, types);

  if (!addressLine1 || !city || !region || !code) return null;

  const address = cleanText([
    addressLine1,
    city,
    [region, postalCode].filter(Boolean).join(' '),
    country || code
  ].filter(Boolean).join(', '), 600);
  const locationContext = cleanText([city, region, country || code].filter(Boolean).join(', '), 300);

  return Object.freeze({
    source: 'maptiler',
    placeId,
    name,
    address,
    addressLine1,
    addressLine2: '',
    city,
    region,
    postalCode,
    countryCode: code,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    locationContext,
    placeType: types[0] || 'poi'
  });
}

export function normalizeMapTilerResults(payload, maximum = 6) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const seen = new Set();
  const results = [];
  for (const feature of features) {
    const place = normalizeMapTilerFeature(feature);
    if (!place || seen.has(place.placeId)) continue;
    seen.add(place.placeId);
    results.push(place);
    if (results.length >= maximum) break;
  }
  return results;
}

export function mappedLocationFieldMatches(snapshot, query) {
  const normalizedQuery = normalizeComparable(query);
  if (!normalizedQuery) return [];
  return (snapshot?.venues || []).filter((venue) => {
    const candidates = [
      venue?.postal_code,
      venue?.city,
      [venue?.city, venue?.region].filter(Boolean).join(' ')
    ];
    return candidates.some((value) => normalizeComparable(value) === normalizedQuery);
  });
}

export function buildMapTilerSearchUrl(query, key, { limit = 6, language = 'en' } = {}) {
  const normalizedQuery = cleanText(query, 240);
  const normalizedKey = cleanText(key, 240);
  if (!normalizedQuery || !normalizedKey) throw new Error('maptiler_not_configured');
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(normalizedQuery)}.json`);
  url.searchParams.set('key', normalizedKey);
  url.searchParams.set('language', language);
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 6))));
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('types', 'poi,address');
  return url.toString();
}

export function buildMapTilerPostalSearchUrl(query, key, { language = 'en' } = {}) {
  const normalizedQuery = cleanText(query, 20);
  const normalizedKey = cleanText(key, 240);
  if (!/^\d{5}(?:-\d{4})?$/.test(normalizedQuery) || !normalizedKey) {
    throw new Error('maptiler_not_configured');
  }
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(normalizedQuery)}.json`);
  url.searchParams.set('key', normalizedKey);
  url.searchParams.set('language', language);
  url.searchParams.set('limit', '5');
  url.searchParams.set('autocomplete', 'false');
  url.searchParams.set('country', 'us');
  url.searchParams.set('types', 'postal_code');
  return url.toString();
}

export function normalizeMapTilerPostalOrigin(payload, query) {
  const normalizedQuery = normalizeComparable(query);
  const features = Array.isArray(payload?.features) ? payload.features : [];
  for (const feature of features) {
    if (!featureTypes(feature).includes('postal_code') || countryCode(feature) !== 'US') continue;
    const resultPostalCode = cleanText(
      feature?.text || feature?.name || hierarchyText(feature, ['postal_code', 'postcode']),
      20
    );
    if (normalizeComparable(resultPostalCode) !== normalizedQuery) continue;
    const coordinates = coordinatesFor(feature);
    if (!coordinates) continue;
    return Object.freeze({
      lat: coordinates.latitude,
      lon: coordinates.longitude,
      label: cleanText(feature.place_name || resultPostalCode, 300)
    });
  }
  return null;
}

export function responseContainsPrivateExternalFields(value) {
  if (Array.isArray(value)) return value.some(responseContainsPrivateExternalFields);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    PRIVATE_RESPONSE_KEYS.has(key) || responseContainsPrivateExternalFields(child)
  );
}

export function validateJoinExternalVenueResponse(response) {
  if (!response || typeof response !== 'object' || responseContainsPrivateExternalFields(response)) return false;
  if (response.ok !== true || response.action !== 'joinExternalVenue') return false;
  if (!response.venue || typeof response.venue !== 'object') return false;
  if (Object.keys(response.venue).some((key) => !PUBLIC_VENUE_FIELDS.includes(key))) return false;
  if (typeof response.venue.venue_id !== 'string' || typeof response.venue.slug !== 'string') return false;
  if (response.venue.venue_type !== 'community_location' && response.venue.venue_type !== 'cal_bar') return false;
  if (!response.selection || response.selection.status !== 'attending') return false;
  if (response.selection.venue_id !== response.venue.venue_id) return false;
  return Array.isArray(response.fanCounts) && Array.isArray(response.venueHistoryCounts);
}

export function upsertCanonicalVenue(snapshot, venue) {
  if (!snapshot || !Array.isArray(snapshot.venues) || !venue?.venue_id) {
    throw new Error('invalid_canonical_venue');
  }
  const canonical = Object.fromEntries(PUBLIC_VENUE_FIELDS.map((field) => [field, venue[field] ?? '']));
  const index = snapshot.venues.findIndex((item) => item.venue_id === canonical.venue_id);
  if (index >= 0) snapshot.venues[index] = canonical;
  else snapshot.venues.push(canonical);
  return canonical;
}

export function externalSearchFailureCopy(error) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('maptiler_not_configured')) return 'External place search is not configured.';
  if (code.includes('AbortError') || code.includes('timeout')) return 'External place search timed out. Existing CGB locations are still available.';
  return 'External place search is temporarily unavailable. Existing CGB locations are still available.';
}

export function externalCreationFailureCopy(error) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('game_not_open')) return 'This game is no longer open for selections.';
  if (code.includes('invalid_external')) return 'This place result is incomplete. Choose another result.';
  if (code.includes('not_configured')) return 'Location creation is temporarily unavailable.';
  return 'Could not add this location. Nothing was created; try again.';
}
