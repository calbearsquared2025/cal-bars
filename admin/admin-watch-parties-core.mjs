import { adminVenueDistanceMiles } from './admin-venues-core.mjs';

export const ADMIN_WATCH_PARTY_ORGANIZER_TYPES = Object.freeze([
  'alumni_group', 'venue', 'other_organization', 'individual', 'unknown'
]);
export const ADMIN_WATCH_PARTY_AGE_POLICIES = Object.freeze(['all_ages', '21_plus', 'unknown']);
export const ADMIN_WATCH_PARTY_SOUND_STATUSES = Object.freeze(['confirmed_on', 'confirmed_off', 'unknown']);
export const ADMIN_WATCH_PARTY_FEATURE_TAGS = Object.freeze(['rsvp_requested', 'cal_specials']);
export const ADMIN_WATCH_PARTY_EVENT_STATUSES = Object.freeze(['active', 'cancelled']);
export const ADMIN_WATCH_PARTY_PUBLICATION_STATUSES = Object.freeze(['published', 'draft', 'archived']);
export const ADMIN_WATCH_PARTY_SOURCE_TYPES = Object.freeze([
  'fan_submitted', 'venue_submitted', 'alumni_group_submitted', 'cgb_added'
]);
export const ADMIN_WATCH_PARTY_SORTS = Object.freeze(['game_date', 'date_added', 'nearest']);

const WATCH_PARTY_ID = /^wp_[a-f0-9]{24}$/;
const VENUE_ID = /^venue_[a-f0-9]{24}$/;
const GAME_ID = /^game_[a-f0-9]{24}$/;
const EDITABLE_FIELDS = Object.freeze([
  'venue_id', 'game_id', 'organizer_name', 'organizer_type', 'official_event_url',
  'event_start_at', 'age_policy', 'sound_status', 'feature_tags', 'game_day_note'
]);
const PRIVATE_KEYS = new Set([
  'idToken', 'firebaseUid', 'firebase_uid', 'browser_id', 'browserId',
  'fan_intent_id', 'fanIntentId', 'contact_email', 'contactEmail',
  'submitter_email', 'submitterEmail', 'workbook_id', 'workbookId',
  'source_submission_id', 'sourceSubmissionId', 'discovery_id', 'discoveryId',
  'publication_key', 'publicationKey', 'processing_status', 'processingStatus',
  'processing_error', 'processingError'
]);

function clean(value, maximum = 1200) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function cleanNote(value, maximum = 1200) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maximum);
}

function normalizeEventStart(value) {
  const text = clean(value, 100);
  if (!text) return '';
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : text;
}

function normalizeFeatureTags(value) {
  const candidates = Array.isArray(value)
    ? value
    : String(value ?? '').split(/[|;,\n]+/);
  const selected = new Set(candidates.map((item) => clean(item, 80).toLowerCase()).filter(Boolean));
  return ADMIN_WATCH_PARTY_FEATURE_TAGS.filter((tag) => selected.has(tag));
}

function containsPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(containsPrivateKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => PRIVATE_KEYS.has(key) || containsPrivateKeys(child));
}

function validDateLike(value) {
  return value === '' || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function validCoordinate(value, minimum, maximum) {
  if (value === '' || value === null || value === undefined) return true;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

function validVenueOption(venue) {
  return Boolean(
    venue && VENUE_ID.test(clean(venue.venue_id, 80)) && clean(venue.name, 180) &&
    ['published', 'draft', 'archived'].includes(venue.publication_status) &&
    validCoordinate(venue.latitude, -90, 90) && validCoordinate(venue.longitude, -180, 180)
  );
}

function validGameOption(game) {
  return Boolean(
    game && GAME_ID.test(clean(game.game_id, 80)) && clean(game.opponent_name, 180) &&
    ['upcoming', 'completed', 'postponed', 'cancelled'].includes(game.game_status) &&
    validDateLike(game.game_date || '') && validDateLike(game.kickoff_at || '')
  );
}

function validFeatureTags(value) {
  return Array.isArray(value) &&
    value.every((tag) => ADMIN_WATCH_PARTY_FEATURE_TAGS.includes(tag)) &&
    new Set(value).size === value.length;
}

function validWatchParty(item) {
  return Boolean(
    item && WATCH_PARTY_ID.test(clean(item.watch_party_id, 80)) &&
    VENUE_ID.test(clean(item.venue_id, 80)) && GAME_ID.test(clean(item.game_id, 80)) &&
    clean(item.venue_name, 180) && clean(item.opponent_name, 180) && clean(item.organizer_name, 180) &&
    ADMIN_WATCH_PARTY_ORGANIZER_TYPES.includes(item.organizer_type) &&
    ADMIN_WATCH_PARTY_SOURCE_TYPES.includes(item.source_type) &&
    ADMIN_WATCH_PARTY_AGE_POLICIES.includes(item.age_policy) &&
    ADMIN_WATCH_PARTY_SOUND_STATUSES.includes(item.sound_status) &&
    validFeatureTags(item.feature_tags) &&
    ADMIN_WATCH_PARTY_EVENT_STATUSES.includes(item.event_status) &&
    ADMIN_WATCH_PARTY_PUBLICATION_STATUSES.includes(item.publication_status) &&
    validDateLike(item.game_date || '') && validDateLike(item.kickoff_at || '') &&
    validDateLike(item.event_start_at || '') && validDateLike(item.created_at || '') && validDateLike(item.updated_at || '') &&
    validCoordinate(item.venue_latitude, -90, 90) && validCoordinate(item.venue_longitude, -180, 180)
  );
}

function validateBaseResponse(response, action) {
  if (!response || typeof response !== 'object' || containsPrivateKeys(response)) return false;
  return response.ok === true && response.action === action;
}

export function buildAdminWatchPartiesRequest() {
  return Object.freeze({ action: 'adminWatchParties' });
}

export function buildAddAdminWatchPartyRequest(fields) {
  return Object.freeze({ action: 'addAdminWatchParty', fields: Object.freeze(normalizeEditorFields(fields)) });
}

export function buildSaveAdminWatchPartyRequest(watchPartyId, changes) {
  const id = clean(watchPartyId, 80);
  if (!WATCH_PARTY_ID.test(id) || !changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('admin_invalid_watch_party');
  }
  const output = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!EDITABLE_FIELDS.includes(key)) throw new Error('admin_invalid_watch_party');
    output[key] = value;
  }
  if (!Object.keys(output).length) throw new Error('admin_invalid_watch_party');
  return Object.freeze({ action: 'saveAdminWatchParty', watchPartyId: id, changes: Object.freeze(output) });
}

export function buildSetAdminWatchPartyEventStatusRequest(watchPartyId, eventStatus) {
  const id = clean(watchPartyId, 80);
  const status = clean(eventStatus, 40);
  if (!WATCH_PARTY_ID.test(id) || !ADMIN_WATCH_PARTY_EVENT_STATUSES.includes(status)) {
    throw new Error('admin_invalid_watch_party');
  }
  return Object.freeze({ action: 'setAdminWatchPartyEventStatus', watchPartyId: id, eventStatus: status });
}

export function buildSetAdminWatchPartyPublicationRequest(watchPartyId, publicationStatus) {
  const id = clean(watchPartyId, 80);
  const status = clean(publicationStatus, 40);
  if (!WATCH_PARTY_ID.test(id) || !ADMIN_WATCH_PARTY_PUBLICATION_STATUSES.includes(status)) {
    throw new Error('admin_invalid_watch_party');
  }
  return Object.freeze({ action: 'setAdminWatchPartyPublication', watchPartyId: id, publicationStatus: status });
}

export function validateAdminWatchPartiesResponse(response) {
  if (!validateBaseResponse(response, 'adminWatchParties')) return false;
  if (!Array.isArray(response.watchParties) || !response.watchParties.every(validWatchParty)) return false;
  if (!Array.isArray(response.venues) || !response.venues.every(validVenueOption)) return false;
  if (!Array.isArray(response.games) || !response.games.every(validGameOption)) return false;
  if (!response.counts || Number(response.counts.total) !== response.watchParties.length) return false;
  return true;
}

export function validateAdminWatchPartyWriteResponse(response, action) {
  if (!validateBaseResponse(response, action) || !validWatchParty(response.watchParty)) return false;
  if (action === 'addAdminWatchParty' && response.created !== true) return false;
  return true;
}

export function adminWatchPartyDistanceMiles(item, origin) {
  if (item?.venue_latitude === '' || item?.venue_latitude === null || item?.venue_latitude === undefined ||
      item?.venue_longitude === '' || item?.venue_longitude === null || item?.venue_longitude === undefined) return null;
  return adminVenueDistanceMiles({ latitude: item.venue_latitude, longitude: item.venue_longitude }, origin);
}

export function filterAdminWatchParties(watchParties, {
  query = '',
  gameId = 'all',
  venueId = 'all',
  sort = 'game_date',
  origin = null
} = {}) {
  const selectedSort = ADMIN_WATCH_PARTY_SORTS.includes(sort) ? sort : 'game_date';
  const words = clean(query, 240).toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = (Array.isArray(watchParties) ? watchParties : []).filter((item) => {
    if (gameId !== 'all' && item.game_id !== gameId) return false;
    if (venueId !== 'all' && item.venue_id !== venueId) return false;
    const haystack = [
      item.venue_name, item.venue_city, item.venue_region, item.opponent_name,
      item.organizer_name, item.organizer_type, item.watch_party_id
    ].map((value) => clean(value, 300).toLowerCase()).join(' ');
    return words.every((word) => haystack.includes(word));
  });

  return filtered.sort((a, b) => {
    if (selectedSort === 'nearest') {
      const aDistance = adminWatchPartyDistanceMiles(a, origin);
      const bDistance = adminWatchPartyDistanceMiles(b, origin);
      if (aDistance !== null || bDistance !== null) {
        if (aDistance === null) return 1;
        if (bDistance === null) return -1;
        if (aDistance !== bDistance) return aDistance - bDistance;
      }
    }
    if (selectedSort === 'date_added') {
      const aCreated = Date.parse(a.created_at || '') || 0;
      const bCreated = Date.parse(b.created_at || '') || 0;
      if (aCreated !== bCreated) return bCreated - aCreated;
    }
    const aTime = Date.parse(a.game_date || a.kickoff_at || '') || Number.MAX_SAFE_INTEGER;
    const bTime = Date.parse(b.game_date || b.kickoff_at || '') || Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return String(a.venue_name || '').localeCompare(String(b.venue_name || '')) ||
      String(a.organizer_name || '').localeCompare(String(b.organizer_name || ''));
  });
}

export function normalizeEditorFields(input) {
  const get = input instanceof FormData
    ? (key) => input.get(key)
    : (key) => input?.[key];
  const getAll = input instanceof FormData
    ? (key) => input.getAll(key)
    : (key) => input?.[key];
  const eventStart = clean(get('event_start_at'), 80);
  return {
    venue_id: clean(get('venue_id'), 80),
    game_id: clean(get('game_id'), 80),
    organizer_name: clean(get('organizer_name'), 180),
    organizer_type: clean(get('organizer_type'), 40),
    official_event_url: clean(get('official_event_url'), 2000),
    event_start_at: normalizeEventStart(eventStart),
    age_policy: clean(get('age_policy'), 40) || 'unknown',
    sound_status: clean(get('sound_status'), 40) || 'unknown',
    feature_tags: normalizeFeatureTags(getAll('feature_tags')),
    game_day_note: cleanNote(get('game_day_note'), 1200)
  };
}

export function adminWatchPartyErrorCopy(error) {
  const code = String(error?.code || error?.message || error || '');
  if (code.includes('admin_watch_party_not_found')) return 'That Watch Party no longer exists.';
  if (code.includes('admin_invalid_watch_party')) return 'Check the Watch Party fields and try again.';
  if (code.includes('admin_watch_party_venue_not_publishable')) return 'Choose a published Venue for this Watch Party.';
  if (code.includes('admin_watch_party_game_not_open')) return 'New Watch Parties can only be added for an upcoming game.';
  if (code.includes('admin_watch_party_game_not_found')) return 'Choose a valid game.';
  return '';
}
