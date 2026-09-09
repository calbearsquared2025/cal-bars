export const ADMIN_VENUE_TAGS = Object.freeze([
  ['21_plus', '21+'],
  ['all_ages', 'All ages'],
  ['audio_on', 'Audio on'],
  ['food', 'Food'],
  ['cal_beer', 'Cal beer'],
  ['large_crowd', 'Large crowd'],
  ['cal_memorabilia', 'Cal memorabilia']
]);

export const ADMIN_VENUE_TYPES = Object.freeze(['cal_bar', 'community_location']);
export const ADMIN_VERIFICATION_STATUSES = Object.freeze(['cgb_reviewed', 'user_added']);
export const ADMIN_ALUMNI_OWNED = Object.freeze(['yes', 'no', 'unknown']);
export const ADMIN_PUBLICATION_STATUSES = Object.freeze(['published', 'draft', 'archived']);

const VENUE_ID = /^venue_[a-f0-9]{24}$/;
const WATCH_PARTY_ID = /^wp_[a-f0-9]{24}$/;
const EXPERIENCE_KEY = /^fx_[a-f0-9]{24}$/;
const GAME_ID = /^game_[a-f0-9]{24}$/;
const ACCEPTED_VENUE_KEYS = new Set([
  'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
  'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
  'verification_status', 'alumni_owned', 'short_description', 'publication_status',
  'venue_tags', 'source', 'photo', 'fanExperiences', 'watchParties'
]);
const EDITABLE_FIELDS = Object.freeze([
  'name', 'address_line_1', 'address_line_2', 'city', 'region', 'postal_code',
  'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
  'verification_status', 'alumni_owned', 'short_description', 'publication_status',
  'venue_tags'
]);
const PRIVATE_KEYS = new Set([
  'idToken', 'firebaseUid', 'firebase_uid', 'browser_id', 'browserId',
  'fan_intent_id', 'fanIntentId', 'contact_email', 'contactEmail',
  'submitter_email', 'submitterEmail', 'workbook_id', 'workbookId'
]);

function clean(value, maximum = 1000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function containsPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(containsPrivateKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => PRIVATE_KEYS.has(key) || containsPrivateKeys(child));
}

function validDateLike(value) {
  return value === '' || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function validVenue(venue) {
  if (!venue || typeof venue !== 'object' || Array.isArray(venue)) return false;
  if (Object.keys(venue).some((key) => !ACCEPTED_VENUE_KEYS.has(key))) return false;
  if (!VENUE_ID.test(venue.venue_id) || !clean(venue.slug, 120) || !clean(venue.name, 180)) return false;
  if (!ADMIN_VENUE_TYPES.includes(venue.venue_type)) return false;
  if (!ADMIN_VERIFICATION_STATUSES.includes(venue.verification_status)) return false;
  if (!ADMIN_ALUMNI_OWNED.includes(venue.alumni_owned)) return false;
  if (!ADMIN_PUBLICATION_STATUSES.includes(venue.publication_status)) return false;
  if (!Array.isArray(venue.venue_tags) || venue.venue_tags.some((tag) => !ADMIN_VENUE_TAGS.some(([value]) => value === tag))) return false;
  if (!venue.source || typeof venue.source !== 'object') return false;
  if (!validDateLike(venue.source.created_at || '') || !validDateLike(venue.source.updated_at || '')) return false;
  if (venue.photo !== null && venue.photo !== undefined && typeof venue.photo !== 'object') return false;
  if (!Array.isArray(venue.fanExperiences) || !Array.isArray(venue.watchParties)) return false;
  if (venue.watchParties.some((party) => !party || !WATCH_PARTY_ID.test(String(party.watch_party_id || '')))) return false;
  return true;
}

function validRelatedExperience(item) {
  return Boolean(item && EXPERIENCE_KEY.test(clean(item.experience_key, 80)) && clean(item.text, 500));
}

function validFanIntentAggregate(item) {
  return Boolean(
    item && GAME_ID.test(clean(item.game_id, 80)) &&
    ['attending', 'withdrawn', 'archived'].every((field) => Number.isInteger(Number(item[field])) && Number(item[field]) >= 0) &&
    validDateLike(item.game_date || '')
  );
}

export function buildAdminVenuesRequest() {
  return Object.freeze({ action: 'adminVenues' });
}

export function buildAdminVenueRelatedRequest(venueId) {
  const id = clean(venueId, 80);
  if (!VENUE_ID.test(id)) throw new Error('admin_invalid_venue');
  return Object.freeze({ action: 'adminVenueRelated', venueId: id });
}

export function buildSaveAdminVenueRequest(venueId, changes) {
  const id = clean(venueId, 80);
  if (!VENUE_ID.test(id) || !changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('admin_invalid_venue');
  }
  const output = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!EDITABLE_FIELDS.includes(key)) throw new Error('admin_invalid_venue');
    output[key] = key === 'venue_tags' ? [...value] : value;
  }
  if (!Object.keys(output).length) throw new Error('admin_invalid_venue');
  return Object.freeze({ action: 'saveAdminVenue', venueId: id, changes: Object.freeze(output) });
}

export function buildSaveAdminFanExperienceRequest(venueId, experienceKey, publicText) {
  const id = clean(venueId, 80);
  const key = clean(experienceKey, 80);
  const text = clean(publicText, 500);
  if (!VENUE_ID.test(id) || !EXPERIENCE_KEY.test(key) || !text) throw new Error('admin_invalid_fan_experience');
  return Object.freeze({ action: 'saveAdminFanExperience', venueId: id, experienceKey: key, publicText: text });
}

export function buildAddAdminVenueRequest(place) {
  const source = clean(place?.source, 40).toLowerCase();
  const placeId = clean(place?.placeId, 220);
  const name = clean(place?.name, 180);
  if (source !== 'maptiler' || !/^\S+\.[0-9]+$/.test(placeId)) {
    throw new Error('admin_invalid_external_place');
  }
  return Object.freeze({
    action: 'addAdminVenue',
    externalPlace: Object.freeze({ source, placeId, name })
  });
}

export function validateAdminVenuesResponse(response) {
  if (!response || typeof response !== 'object' || containsPrivateKeys(response)) return false;
  if (response.ok !== true || response.action !== 'adminVenues' || !Array.isArray(response.venues)) return false;
  if (!response.venues.every(validVenue)) return false;
  if (!response.counts || response.counts.total !== response.venues.length) return false;
  return true;
}

export function validateAdminVenueWriteResponse(response, action) {
  if (!response || typeof response !== 'object' || containsPrivateKeys(response)) return false;
  if (response.ok !== true || response.action !== action || !validVenue(response.venue)) return false;
  if (action === 'addAdminVenue' && typeof response.created !== 'boolean') return false;
  return true;
}

export function validateAdminVenueRelatedResponse(response, action = 'adminVenueRelated') {
  if (!response || typeof response !== 'object' || containsPrivateKeys(response)) return false;
  if (response.ok !== true || response.action !== action || !VENUE_ID.test(clean(response.venueId, 80))) return false;
  if (!Array.isArray(response.fanExperiences) || !response.fanExperiences.every(validRelatedExperience)) return false;
  if (!Array.isArray(response.fanIntent) || !response.fanIntent.every(validFanIntentAggregate)) return false;
  return true;
}

function validOrigin(origin) {
  const latitude = Number(origin?.latitude);
  const longitude = Number(origin?.longitude);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function adminVenueDistanceMiles(venue, origin) {
  if (!validOrigin(origin)) return null;
  const latitude = Number(venue?.latitude);
  const longitude = Number(venue?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;

  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(latitude - Number(origin.latitude));
  const dLon = radians(longitude - Number(origin.longitude));
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(Number(origin.latitude))) * Math.cos(radians(latitude)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterAdminVenues(venues, {
  query = '',
  status = 'active',
  type = 'all',
  sort = 'az',
  origin = null
} = {}) {
  const words = clean(query, 240).toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = (Array.isArray(venues) ? venues : []).filter((venue) => {
    if (status === 'active' && venue.publication_status === 'archived') return false;
    if (status === 'archived' && venue.publication_status !== 'archived') return false;
    if (type !== 'all' && venue.venue_type !== type) return false;
    const haystack = [
      venue.name, venue.city, venue.region, venue.address_line_1, venue.slug, venue.venue_type
    ].map((value) => clean(value, 300).toLowerCase()).join(' ');
    return words.every((word) => haystack.includes(word));
  });

  return filtered.sort((a, b) => {
    if (sort === 'nearest' && validOrigin(origin)) {
      const aDistance = adminVenueDistanceMiles(a, origin);
      const bDistance = adminVenueDistanceMiles(b, origin);
      if (aDistance !== null || bDistance !== null) {
        if (aDistance === null) return 1;
        if (bDistance === null) return -1;
        if (aDistance !== bDistance) return aDistance - bDistance;
      }
    }
    return String(a.name || '').localeCompare(String(b.name || '')) ||
      String(a.city || '').localeCompare(String(b.city || ''));
  });
}

export function venueFormChanges(formData) {
  const data = Object.fromEntries(formData.entries());
  const tags = ADMIN_VENUE_TAGS
    .map(([value]) => value)
    .filter((tag) => formData.getAll('venue_tags').includes(tag));
  return {
    name: clean(data.name, 180),
    address_line_1: clean(data.address_line_1, 220),
    address_line_2: clean(data.address_line_2, 120),
    city: clean(data.city, 140),
    region: clean(data.region, 80),
    postal_code: clean(data.postal_code, 40),
    country_code: clean(data.country_code, 8).toUpperCase(),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    website_url: clean(data.website_url, 500),
    venue_type: clean(data.venue_type, 40),
    verification_status: clean(data.verification_status, 40),
    alumni_owned: clean(data.alumni_owned, 20),
    short_description: clean(data.short_description, 1000),
    publication_status: clean(data.publication_status, 40),
    venue_tags: tags
  };
}

export function adminVenueErrorCopy(error) {
  const code = String(error?.code || error?.message || error || '');
  if (code.includes('admin_venue_not_found')) return 'That venue no longer exists.';
  if (code.includes('admin_invalid_venue')) return 'Check the venue fields and try again.';
  if (code.includes('admin_invalid_fan_experience')) return 'Check the Fan Experience text and try again.';
  if (code.includes('admin_fan_experience_not_found')) return 'That Fan Experience no longer exists.';
  if (code.includes('admin_maptiler_not_configured')) return 'Admin MapTiler verification is not configured yet.';
  if (code.includes('admin_external_place_unavailable')) return 'CGB could not verify that MapTiler place. Try another result.';
  if (code.includes('admin_invalid_external_place')) return 'Choose a valid MapTiler place result.';
  return '';
}
