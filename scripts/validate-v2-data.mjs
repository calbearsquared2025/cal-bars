#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REQUIRED_TOP_LEVEL = [
  'schemaVersion', 'venues', 'games', 'watchParties',
  'fanCounts', 'venueHistoryCounts', 'generatedAt'
];

const FORBIDDEN_KEYS = new Set([
  'browser_id', 'fan_intent_id', 'external_source', 'external_place_id',
  'source_submission_id', 'publication_status', 'created_at',
  'submitter_name', 'submitter_email', 'reviewer_note', 'permission_confirmed',
  'file_reference', 'caption', 'review_status', 'reviewed_at',
  'workbook_id', 'workbook_url', 'spreadsheet_id', 'spreadsheet_url',
  'opponent_short_name', 'idAliases'
]);

const RELEASE_FIXTURE_MARKERS = Object.freeze([
  'golden bear test pub',
  'oski test taproom',
  'bear territory test cafe',
  'california test grill',
  'test plaza',
  'sample street',
  'fixture avenue',
  'mockup road',
  'synthetic test record',
  'example.com/golden-bear-test-pub'
]);

const CANONICAL_ID_PATTERNS = Object.freeze({
  venue: /^venue_[a-f0-9]{24}$/,
  game: /^game_[a-f0-9]{24}$/,
  watchParty: /^wp_[a-f0-9]{24}$/
});
const VENUE_TYPES = new Set(['cal_bar', 'community_location']);
const VERIFICATION_STATUSES = new Set(['cgb_reviewed', 'user_added']);
const ALUMNI_OWNED = new Set(['yes', 'no', 'unknown']);
const HOME_AWAY = new Set(['home', 'away', 'neutral']);
const KICKOFF_STATUSES = new Set(['confirmed', 'tbd']);
const GAME_STATUSES = new Set(['upcoming', 'completed', 'postponed', 'cancelled']);
const ORGANIZER_TYPES = new Set(['alumni_group', 'venue', 'other_organization', 'individual', 'unknown']);
const SOURCE_TYPES = new Set(['fan_submitted', 'venue_submitted', 'alumni_group_submitted', 'cgb_added']);
const AGE_POLICIES = new Set(['all_ages', '21_plus', 'unknown']);
const SOUND_STATUSES = new Set(['confirmed_on', 'confirmed_off', 'unknown']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isIsoDateTime(value) {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isOptionalUrl(value) {
  if (value === '' || value === null || value === undefined) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function requireString(record, field, path, errors, { allowEmpty = false } = {}) {
  const value = record[field];
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    errors.push(`${path}.${field} must be ${allowEmpty ? 'a string' : 'a non-empty string'}`);
  }
}

function validateOptionalString(record, field, path, errors) {
  const value = record[field];
  if (value !== undefined && value !== null && typeof value !== 'string') {
    errors.push(`${path}.${field} must be a string when present`);
  }
}

function requireEnum(record, field, allowed, path, errors) {
  if (!allowed.has(record[field])) {
    errors.push(`${path}.${field} has unsupported value: ${JSON.stringify(record[field])}`);
  }
}

function checkForbiddenKeys(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkForbiddenKeys(item, `${path}[${index}]`, errors));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path}.${key} is forbidden in public data`);
    checkForbiddenKeys(child, `${path}.${key}`, errors);
  }
}

function assertUnique(records, field, path, errors) {
  const seen = new Map();
  records.forEach((record, index) => {
    const value = record[field];
    if (seen.has(value)) {
      errors.push(`${path}[${index}].${field} duplicates ${path}[${seen.get(value)}].${field}: ${value}`);
    } else {
      seen.set(value, index);
    }
  });
}

function validateVenue(venue, index, errors) {
  const path = `venues[${index}]`;
  if (!isObject(venue)) return errors.push(`${path} must be an object`);
  for (const field of ['venue_id', 'slug', 'name', 'address_line_1', 'city', 'region', 'country_code', 'updated_at']) {
    requireString(venue, field, path, errors);
  }
  if (!CANONICAL_ID_PATTERNS.venue.test(venue.venue_id || '')) {
    errors.push(`${path}.venue_id must match venue_<24 lowercase hex>`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(venue.slug || '')) errors.push(`${path}.slug must use lowercase kebab case`);
  if (!/^[A-Z]{2}$/.test(venue.country_code || '')) errors.push(`${path}.country_code must be an uppercase ISO two-letter code`);
  if (typeof venue.latitude !== 'number' || venue.latitude < -90 || venue.latitude > 90) errors.push(`${path}.latitude must be between -90 and 90`);
  if (typeof venue.longitude !== 'number' || venue.longitude < -180 || venue.longitude > 180) errors.push(`${path}.longitude must be between -180 and 180`);
  requireEnum(venue, 'venue_type', VENUE_TYPES, path, errors);
  requireEnum(venue, 'verification_status', VERIFICATION_STATUSES, path, errors);
  requireEnum(venue, 'alumni_owned', ALUMNI_OWNED, path, errors);
  if (!isOptionalUrl(venue.website_url)) errors.push(`${path}.website_url must be empty or http(s)`);
  if (!isOptionalUrl(venue.photo_url)) errors.push(`${path}.photo_url must be empty or http(s)`);
  if (!isOptionalUrl(venue.photo_credit_url)) errors.push(`${path}.photo_credit_url must be empty or http(s)`);
  validateOptionalString(venue, 'photo_caption', path, errors);
  validateOptionalString(venue, 'photo_credit', path, errors);
  if (!isIsoDateTime(venue.updated_at)) errors.push(`${path}.updated_at must be an ISO-8601 datetime`);
}

function validateGame(game, index, errors) {
  const path = `games[${index}]`;
  if (!isObject(game)) return errors.push(`${path} must be an object`);
  for (const field of ['game_id', 'opponent_name', 'home_away', 'game_date', 'kickoff_status', 'game_status', 'updated_at']) {
    requireString(game, field, path, errors);
  }
  if (!CANONICAL_ID_PATTERNS.game.test(game.game_id || '')) {
    errors.push(`${path}.game_id must match game_<24 lowercase hex>`);
  }
  if (!Number.isInteger(game.season) || game.season < 2000) errors.push(`${path}.season must be a four-digit integer`);
  if (!Number.isInteger(game.schedule_order) || game.schedule_order < 1) errors.push(`${path}.schedule_order must be a positive integer`);
  requireEnum(game, 'home_away', HOME_AWAY, path, errors);
  requireEnum(game, 'kickoff_status', KICKOFF_STATUSES, path, errors);
  requireEnum(game, 'game_status', GAME_STATUSES, path, errors);
  if (!isIsoDate(game.game_date)) errors.push(`${path}.game_date must use YYYY-MM-DD`);
  if (game.kickoff_status === 'confirmed' && !isIsoDateTime(game.kickoff_at)) errors.push(`${path}.kickoff_at is required when kickoff_status is confirmed`);
  if (game.kickoff_status === 'tbd' && !['', null, undefined].includes(game.kickoff_at)) errors.push(`${path}.kickoff_at must be empty when kickoff_status is tbd`);
  if (!isIsoDateTime(game.updated_at)) errors.push(`${path}.updated_at must be an ISO-8601 datetime`);
}

function validateWatchParty(party, index, venueIds, gameIds, errors) {
  const path = `watchParties[${index}]`;
  if (!isObject(party)) return errors.push(`${path} must be an object`);
  for (const field of ['watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type', 'source_type', 'age_policy', 'sound_status', 'event_status', 'updated_at']) {
    requireString(party, field, path, errors);
  }
  if (!CANONICAL_ID_PATTERNS.watchParty.test(party.watch_party_id || '')) {
    errors.push(`${path}.watch_party_id must match wp_<24 lowercase hex>`);
  }
  if (!venueIds.has(party.venue_id)) errors.push(`${path}.venue_id does not reference a public venue`);
  if (!gameIds.has(party.game_id)) errors.push(`${path}.game_id does not reference a public game`);
  requireEnum(party, 'organizer_type', ORGANIZER_TYPES, path, errors);
  requireEnum(party, 'source_type', SOURCE_TYPES, path, errors);
  requireEnum(party, 'age_policy', AGE_POLICIES, path, errors);
  requireEnum(party, 'sound_status', SOUND_STATUSES, path, errors);
  if (party.event_status !== 'active') errors.push(`${path}.event_status must be active in the public snapshot`);
  if (!isOptionalUrl(party.official_event_url)) errors.push(`${path}.official_event_url must be empty or http(s)`);
  if (!["", null, undefined].includes(party.event_start_at) && !isIsoDateTime(party.event_start_at)) errors.push(`${path}.event_start_at must be empty or an ISO-8601 datetime`);
  if (!isIsoDateTime(party.updated_at)) errors.push(`${path}.updated_at must be an ISO-8601 datetime`);
}

export function validateSnapshot(snapshot) {
  const errors = [];
  if (!isObject(snapshot)) return ['snapshot must be an object'];

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in snapshot)) errors.push(`missing top-level key: ${key}`);
  }
  if (snapshot.schemaVersion !== '2.0') errors.push('schemaVersion must equal "2.0"');
  for (const key of ['venues', 'games', 'watchParties', 'fanCounts', 'venueHistoryCounts']) {
    if (!Array.isArray(snapshot[key])) errors.push(`${key} must be an array`);
  }
  if (snapshot.venueSeasonCounts !== undefined && !Array.isArray(snapshot.venueSeasonCounts)) {
    errors.push('venueSeasonCounts must be an array');
  }
  if (!isIsoDateTime(snapshot.generatedAt)) errors.push('generatedAt must be an ISO-8601 datetime');

  checkForbiddenKeys(snapshot, '$', errors);
  if (errors.some((error) => error.includes('must be an array'))) return errors;

  snapshot.venues.forEach((venue, index) => validateVenue(venue, index, errors));
  snapshot.games.forEach((game, index) => validateGame(game, index, errors));
  assertUnique(snapshot.venues, 'venue_id', 'venues', errors);
  assertUnique(snapshot.venues, 'slug', 'venues', errors);
  assertUnique(snapshot.games, 'game_id', 'games', errors);

  const venueIds = new Set(snapshot.venues.map((venue) => venue.venue_id));
  const gameIds = new Set(snapshot.games.map((game) => game.game_id));
  snapshot.watchParties.forEach((party, index) => validateWatchParty(party, index, venueIds, gameIds, errors));
  assertUnique(snapshot.watchParties, 'watch_party_id', 'watchParties', errors);

  const fanPairs = new Set();
  snapshot.fanCounts.forEach((row, index) => {
    const path = `fanCounts[${index}]`;
    if (!isObject(row)) return errors.push(`${path} must be an object`);
    if (!gameIds.has(row.game_id)) errors.push(`${path}.game_id does not reference a public game`);
    if (!venueIds.has(row.venue_id)) errors.push(`${path}.venue_id does not reference a public venue`);
    if (!Number.isInteger(row.count) || row.count < 0) errors.push(`${path}.count must be a non-negative integer`);
    const pair = `${row.game_id}::${row.venue_id}`;
    if (fanPairs.has(pair)) errors.push(`${path} duplicates game/venue pair ${pair}`);
    fanPairs.add(pair);
  });

  const historyVenues = new Set();
  snapshot.venueHistoryCounts.forEach((row, index) => {
    const path = `venueHistoryCounts[${index}]`;
    if (!isObject(row)) return errors.push(`${path} must be an object`);
    if (!venueIds.has(row.venue_id)) errors.push(`${path}.venue_id does not reference a public venue`);
    if (!Number.isInteger(row.past_game_count) || row.past_game_count < 0) errors.push(`${path}.past_game_count must be a non-negative integer`);
    if (historyVenues.has(row.venue_id)) errors.push(`${path} duplicates venue_id ${row.venue_id}`);
    historyVenues.add(row.venue_id);
  });

  const seasonPairs = new Set();
  (snapshot.venueSeasonCounts || []).forEach((row, index) => {
    const path = `venueSeasonCounts[${index}]`;
    if (!isObject(row)) return errors.push(`${path} must be an object`);
    if (!Number.isInteger(row.season) || row.season < 2000 || row.season > 2100) {
      errors.push(`${path}.season must be a four-digit integer`);
    }
    if (!venueIds.has(row.venue_id)) errors.push(`${path}.venue_id does not reference a public venue`);
    if (!Number.isInteger(row.count) || row.count < 0) errors.push(`${path}.count must be a non-negative integer`);
    const pair = `${row.season}::${row.venue_id}`;
    if (seasonPairs.has(pair)) errors.push(`${path} duplicates season/venue pair ${pair}`);
    seasonPairs.add(pair);
  });

  return errors;
}

export function validateReleaseFallback(snapshot) {
  const errors = validateSnapshot(snapshot);

  const serialized = JSON.stringify(snapshot).toLowerCase();
  for (const marker of RELEASE_FIXTURE_MARKERS) {
    if (serialized.includes(marker)) {
      errors.push(`release fallback contains synthetic fixture marker: ${marker}`);
    }
  }
  return [...new Set(errors)];
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node scripts/validate-v2-data.mjs <snapshot.json>');
    process.exitCode = 2;
    return;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    console.error(`Could not read JSON: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const errors = validateReleaseFallback(snapshot);
  if (errors.length) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Valid CGB v2 public release fallback: ${path}`);
  console.log(`${snapshot.venues.length} venues, ${snapshot.games.length} games, ${snapshot.watchParties.length} watch parties`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
