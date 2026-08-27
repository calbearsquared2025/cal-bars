const MAPTILER_PLACE_TYPES = new Set(['poi', 'address']);
const US_REGION_CODES = Object.freeze({
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', missouri: 'MO', montana: 'MT',
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
  'alumni_owned', 'short_description', 'photo_url', 'photo_caption', 'photo_credit',
  'photo_credit_url', 'updated_at'
]);
const ACCEPTED_RESPONSE_VENUE_FIELDS = new Set([...PUBLIC_VENUE_FIELDS, 'verification_status']);

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

function comparableTokens(value) {
  return normalizeComparable(value)
    .split(' ')
    .filter((token) => token && (token.length > 1 || /^\d+$/.test(token)));
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

export function normalizeUserLocationProximity(origin) {
  const latitude = Number(origin?.lat);
  const longitude = Number(origin?.lon);
  if (origin?.label !== 'your location') return null;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return Object.freeze({ lat: latitude, lon: longitude });
}

function venueNameCoverage(place, query) {
  const nameTokens = comparableTokens(place?.name);
  const queryTokens = comparableTokens(query);
  if (!nameTokens.length || !queryTokens.length) return 0;
  const querySet = new Set(queryTokens);
  return nameTokens.filter((token) => querySet.has(token)).length / nameTokens.length;
}

function mapTilerResultScore(place, query, providerRelevance = 0) {
  const normalizedQuery = normalizeComparable(query);
  const normalizedName = normalizeComparable(place?.name);
  const nameTokens = comparableTokens(place?.name);
  const queryTokens = comparableTokens(query);
  const querySet = new Set(queryTokens);
  const overlapCount = nameTokens.filter((token) => querySet.has(token)).length;
  const nameCoverage = nameTokens.length ? overlapCount / nameTokens.length : 0;
  const queryCoverage = queryTokens.length ? overlapCount / queryTokens.length : 0;
  const exactName = normalizedQuery === normalizedName;
  const namePrefix = normalizedName && normalizedQuery.startsWith(`${normalizedName} `);
  const normalizedCity = normalizeComparable(place?.city);
  const normalizedRegion = normalizeComparable(place?.region);
  const normalizedPostalCode = normalizeComparable(place?.postalCode);
  const cityMatch = normalizedCity && (` ${normalizedQuery} `).includes(` ${normalizedCity} `);
  const queryComparableTokens = comparableTokens(query);
  const regionMatch = normalizedRegion && queryComparableTokens.includes(normalizedRegion);
  const postalCodeMatch = normalizedPostalCode && queryComparableTokens.includes(normalizedPostalCode);
  const relevance = Number.isFinite(Number(providerRelevance))
    ? Math.max(0, Math.min(1, Number(providerRelevance)))
    : 0;

  return (
    nameCoverage * 55 +
    queryCoverage * 10 +
    relevance * 20 +
    (cityMatch ? 30 : 0) +
    (regionMatch ? 5 : 0) +
    (postalCodeMatch ? 20 : 0) +
    (exactName ? 30 : namePrefix ? 20 : 0) +
    (place?.placeType === 'poi' ? 5 : 0)
  );
}

export function rankMapTilerResults(payloads, query, { maximum = 6, filterWeak = false } = {}) {
  const sourcePayloads = Array.isArray(payloads) ? payloads : [payloads];
  const queryTokenCount = comparableTokens(query).length;
  const byPlaceId = new Map();
  let sourceOrder = 0;

  for (const payload of sourcePayloads) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    for (const feature of features) {
      const place = normalizeMapTilerFeature(feature);
      if (!place) continue;
      const providerRelevance = Number(feature?.relevance) || 0;
      const score = mapTilerResultScore(place, query, providerRelevance);
      const existing = byPlaceId.get(place.placeId);
      if (!existing || score > existing.score) {
        byPlaceId.set(place.placeId, { place, score, providerRelevance, sourceOrder });
      }
      sourceOrder += 1;
    }
  }

  const minimumScore = filterWeak && queryTokenCount >= 3 ? 50 : -Infinity;
  return [...byPlaceId.values()]
    .filter((entry) => entry.score >= minimumScore)
    .sort((a, b) =>
      b.score - a.score ||
      b.providerRelevance - a.providerRelevance ||
      a.sourceOrder - b.sourceOrder
    )
    .slice(0, Math.max(1, Math.min(10, Number(maximum) || 6)))
    .map((entry) => entry.place);
}

export function hasStrongMapTilerVenueMatch(results, query) {
  const first = Array.isArray(results) ? results[0] : null;
  if (!first) return false;
  const normalizedQuery = normalizeComparable(query);
  const normalizedName = normalizeComparable(first.name);
  if (normalizedName && (normalizedQuery === normalizedName || normalizedQuery.startsWith(`${normalizedName} `))) {
    return true;
  }
  return venueNameCoverage(first, query) >= 0.75;
}

export function buildMapTilerFinalSearchQueries(query, { maximumRetries = 3 } = {}) {
  const normalizedQuery = cleanText(query, 240);
  if (!normalizedQuery) return [];
  const words = normalizedQuery.split(' ').filter(Boolean);
  const variants = [normalizedQuery];
  const maximumDrop = Math.min(
    Math.max(0, Number(maximumRetries) || 0),
    Math.max(0, words.length - 1)
  );

  for (let drop = 1; drop <= maximumDrop; drop += 1) {
    const candidate = words.slice(0, -drop).join(' ').trim();
    if (candidate.length >= 3 && !variants.includes(candidate)) variants.push(candidate);
  }
  return variants;
}

function mapTilerProximityValue(proximity) {
  const longitude = Number(Array.isArray(proximity)
    ? proximity[0]
    : proximity?.lon ?? proximity?.longitude);
  const latitude = Number(Array.isArray(proximity)
    ? proximity[1]
    : proximity?.lat ?? proximity?.latitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return '';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return '';
  return `${longitude},${latitude}`;
}

export function buildMapTilerSearchUrl(
  query,
  key,
  { limit = 6, language = 'en', autocomplete = true, fuzzyMatch = true, proximity = null } = {}
) {
  const normalizedQuery = cleanText(query, 240);
  const normalizedKey = cleanText(key, 240);
  if (!normalizedQuery || !normalizedKey) throw new Error('maptiler_not_configured');
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(normalizedQuery)}.json`);
  url.searchParams.set('key', normalizedKey);
  url.searchParams.set('language', language);
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, Number(limit) || 6))));
  url.searchParams.set('autocomplete', String(Boolean(autocomplete)));
  url.searchParams.set('fuzzyMatch', String(Boolean(fuzzyMatch)));
  url.searchParams.set('country', 'us');
  url.searchParams.set('types', 'poi,address');
  const proximityValue = mapTilerProximityValue(proximity);
  if (proximityValue) url.searchParams.set('proximity', proximityValue);
  return url.toString();
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
  if (Object.keys(response.venue).some((key) => !ACCEPTED_RESPONSE_VENUE_FIELDS.has(key))) return false;
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
