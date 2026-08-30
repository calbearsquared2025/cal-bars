/**
 * Cal Golden Bars v2 controlled public read/write foundation.
 *
 * Security boundary:
 * - Workbook ID is stored only in Script Properties.
 * - Public responses are field-whitelisted.
 * - Fan Intent writes are implemented in FanIntent.gs.
 */

const CGB_SCHEMA_VERSION = '2.0';
const CGB_WORKBOOK_PROPERTY = 'CGB_WORKBOOK_ID';
const CGB_PUBLIC_CACHE_KEY = 'cgb_v2_public_snapshot';
const CGB_PUBLIC_CACHE_SECONDS = 300;
const CGB_PUBLIC_VENUE_TAGS = Object.freeze([
  '21_plus', 'audio_on', 'food', 'cal_beer', 'large_crowd', 'cal_memorabilia'
]);
const CGB_PUBLIC_WATCH_PARTY_TAGS = Object.freeze([
  'rsvp_requested', 'cal_specials'
]);

const CGB_TABS = Object.freeze({
  Venues: [
    'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
    'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
    'verification_status', 'alumni_owned', 'external_source', 'external_place_id',
    'short_description', 'publication_status', 'source_submission_id', 'created_at',
    'updated_at'
  ],
  Games: [
    'game_id', 'season', 'schedule_order', 'opponent_name', 'home_away',
    'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'
  ],
  Watch_Parties: [
    'watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type',
    'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status',
    'restrictions_note', 'game_day_note', 'event_status', 'publication_status',
    'source_submission_id', 'created_at', 'updated_at'
  ],
  Fan_Intent: [
    'fan_intent_id', 'browser_id', 'game_id', 'venue_id', 'status',
    'created_at', 'updated_at', 'archived_at'
  ],
  Venue_Photos: [
    'venue_id', 'photo_url', 'photo_caption', 'photo_credit', 'photo_credit_url',
    'publication_status', 'updated_at'
  ],
  Cal_Bar_Nominations_Raw: [
    'response_timestamp', 'submission_id', 'venue_id', 'venue_name', 'reason',
    'gathering_frequency', 'supporting_url', 'submitter_role', 'submitter_name',
    'submitter_email', 'photo_link', 'review_status', 'reviewer_note', 'reviewed_at'
  ],
  Watch_Party_Submissions_Raw: [
    'response_timestamp', 'submission_id', 'venue_id', 'venue_name_submitted',
    'address_submitted', 'game_ids_submitted', 'organizer_name', 'organizer_type',
    'official_event_url', 'event_start_information', 'age_policy', 'sound_status',
    'restrictions_note', 'game_day_note', 'submitter_role', 'submitter_name',
    'submitter_email', 'processing_status', 'created_watch_party_ids',
    'created_venue_id', 'processing_error', 'processed_at'
  ],
  Listing_Updates_Raw: [
    'response_timestamp', 'submission_id', 'related_venue_id', 'related_watch_party_id',
    'update_category', 'proposed_change', 'supporting_url', 'submitter_role',
    'submitter_name', 'submitter_email', 'review_status', 'reviewer_note', 'reviewed_at'
  ],
  Missing_Location_Suggestions_Raw: [
    'response_timestamp', 'submission_id', 'venue_name', 'address', 'website_url',
    'selected_game_id', 'note', 'submitter_email', 'review_status',
    'created_venue_id', 'reviewed_at'
  ]
});

const CGB_PUBLIC_FIELDS = Object.freeze({
  Venues: [
    'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
    'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
    'verification_status', 'alumni_owned', 'short_description', 'photo_url',
    'photo_caption', 'photo_credit', 'photo_credit_url', 'venue_tags', 'updated_at'
  ],
  Games: [
    'game_id', 'season', 'schedule_order', 'opponent_name', 'home_away',
    'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'
  ],
  Watch_Parties: [
    'watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type',
    'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status',
    'restrictions_note', 'game_day_note', 'feature_tags', 'event_status', 'updated_at'
  ]
});

function configureBoundWorkbook() {
  const workbook = SpreadsheetApp.getActiveSpreadsheet();
  if (!workbook) {
    throw new Error('Open this script from the confirmed private v2 workbook before running configureBoundWorkbook().');
  }
  PropertiesService.getScriptProperties().setProperty(CGB_WORKBOOK_PROPERTY, workbook.getId());
  clearPublicSnapshotCache_();
}

function setupWorkbook() {
  const workbook = getWorkbook_();
  Object.keys(CGB_TABS).forEach(function(tabName) {
    let sheet = workbook.getSheetByName(tabName);
    if (!sheet) sheet = workbook.insertSheet(tabName);
    ensureHeaderRow_(sheet, CGB_TABS[tabName]);
  });
  clearPublicSnapshotCache_();
}

function doGet(event) {
  try {
    const action = String((event && event.parameter && event.parameter.action) || 'publicSnapshot');
    if (action === 'health') {
      return jsonResponse_({ ok: true, schemaVersion: CGB_SCHEMA_VERSION });
    }
    if (action !== 'publicSnapshot') {
      return jsonResponse_({ ok: false, error: 'unsupported_action' });
    }
    return jsonResponse_(getPublicSnapshot_());
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: 'snapshot_unavailable',
      schemaVersion: CGB_SCHEMA_VERSION
    });
  }
}

function buildPublicSnapshotForReview() {
  clearPublicSnapshotCache_();
  const snapshot = buildPublicSnapshot_();
  console.log(JSON.stringify(snapshot, null, 2));
  return snapshot;
}

function archiveCompletedFanIntentScheduled() {
  return archiveCompletedFanIntent_(getWorkbook_());
}

function getPublicSnapshot_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CGB_PUBLIC_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const snapshot = buildPublicSnapshot_();
  const serialized = JSON.stringify(snapshot);
  if (serialized.length < 95000) {
    cache.put(CGB_PUBLIC_CACHE_KEY, serialized, CGB_PUBLIC_CACHE_SECONDS);
  }
  return snapshot;
}

function buildPublicSnapshot_() {
  const workbook = getWorkbook_();
  const venuesRaw = readSheetObjects_(workbook, 'Venues');
  const venuePhotosRaw = readSheetObjects_(workbook, 'Venue_Photos');
  const gamesRaw = readSheetObjects_(workbook, 'Games');
  const partiesRaw = readSheetObjects_(workbook, 'Watch_Parties');
  const intentRaw = readSheetObjects_(workbook, 'Fan_Intent');
  const fanExperiencesRaw = readSheetObjects_(workbook, 'Fan_Experiences_Raw');

  const venues = mergePublishedVenuePhotos_(venuesRaw, venuePhotosRaw)
    .filter(function(row) {
      return row.publication_status === 'published' && hasValidVenueCoordinates_(row);
    })
    .map(function(row) {
      const output = whitelist_(row, CGB_PUBLIC_FIELDS.Venues);
      output.venue_tags = normalizePublicControlledTags_(row.venue_tags, CGB_PUBLIC_VENUE_TAGS);
      return output;
    });

  const games = gamesRaw.map(function(row) {
    return whitelist_(row, CGB_PUBLIC_FIELDS.Games);
  });

  const publishedVenueIds = new Set(venues.map(function(row) { return row.venue_id; }));
  const gameIds = new Set(games.map(function(row) { return row.game_id; }));

  const watchParties = partiesRaw
    .filter(function(row) {
      return row.publication_status === 'published' &&
        row.event_status === 'active' &&
        publishedVenueIds.has(row.venue_id) &&
        gameIds.has(row.game_id);
    })
    .map(function(row) {
      const output = whitelist_(row, CGB_PUBLIC_FIELDS.Watch_Parties);
      output.feature_tags = normalizePublicControlledTags_(row.feature_tags, CGB_PUBLIC_WATCH_PARTY_TAGS);
      return output;
    });

  return {
    schemaVersion: CGB_SCHEMA_VERSION,
    venues: venues,
    games: games,
    watchParties: watchParties,
    fanCounts: buildFanCounts_(intentRaw, publishedVenueIds, gameIds),
    venueHistoryCounts: buildVenueHistoryCounts_(intentRaw, publishedVenueIds, gameIds),
    venueSeasonCounts: buildVenueSeasonCounts_(intentRaw, publishedVenueIds, games),
    fanExperiences: buildPublishedFanExperiences_(fanExperiencesRaw, publishedVenueIds),
    generatedAt: new Date().toISOString()
  };
}

function normalizePublicControlledTags_(value, allowed) {
  if (!Array.isArray(allowed)) return [];
  let candidates = [];
  if (Array.isArray(value)) {
    candidates = value;
  } else {
    const raw = String(value === null || value === undefined ? '' : value).trim();
    if (!raw) return [];
    if (raw.charAt(0) === '[') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) candidates = parsed;
      } catch (_) {}
    }
    if (!candidates.length) candidates = raw.split(/[|;,\n]+/);
  }
  const selected = new Set(candidates.map(function(item) {
    return String(item === null || item === undefined ? '' : item).trim().toLowerCase();
  }).filter(Boolean));
  return allowed.filter(function(tag) { return selected.has(tag); });
}

function mergePublishedVenuePhotos_(venues, photoRows) {
  const venueIds = new Set(venues.map(function(row) {
    return String((row && row.venue_id) || '').trim();
  }).filter(Boolean));
  const seenPublishedVenueIds = new Set();
  const duplicateVenueIds = new Set();
  const photosByVenueId = Object.create(null);

  photoRows.forEach(function(row) {
    if (String((row && row.publication_status) || '').trim() !== 'published') return;

    const venueId = String((row && row.venue_id) || '').trim();
    if (!/^venue_[a-f0-9]{24}$/.test(venueId) || !venueIds.has(venueId)) {
      console.warn('Skipping published Venue_Photos row for unknown venue_id: ' + (venueId || '(missing venue_id)'));
      return;
    }
    if (seenPublishedVenueIds.has(venueId)) {
      duplicateVenueIds.add(venueId);
      delete photosByVenueId[venueId];
      console.warn('Skipping duplicate published Venue_Photos rows for venue_id: ' + venueId);
      return;
    }
    seenPublishedVenueIds.add(venueId);

    if (!hasValidPublishedVenuePhoto_(row)) {
      console.warn('Skipping malformed published Venue_Photos row for venue_id: ' + venueId);
      return;
    }
    photosByVenueId[venueId] = row;
  });

  return venues.map(function(row) {
    const venueId = String((row && row.venue_id) || '').trim();
    const photo = duplicateVenueIds.has(venueId) ? null : photosByVenueId[venueId];
    return Object.assign({}, row, {
      photo_url: photo ? String(photo.photo_url).trim() : '',
      photo_caption: photo ? String(photo.photo_caption || '').trim() : '',
      photo_credit: photo ? String(photo.photo_credit || '').trim() : '',
      photo_credit_url: photo ? String(photo.photo_credit_url || '').trim() : ''
    });
  });
}

function hasValidPublishedVenuePhoto_(row) {
  if (!row || typeof row.photo_url !== 'string' || !isHttpUrl_(row.photo_url)) return false;
  if (typeof row.photo_caption !== 'string' || typeof row.photo_credit !== 'string') return false;
  if (typeof row.photo_credit_url !== 'string') return false;
  return !String(row.photo_credit_url).trim() || isHttpUrl_(row.photo_credit_url);
}

function isHttpUrl_(value) {
  const raw = String(value || '').trim();
  return /^https?:\/\/(?:[^@\s/]+@)?(?:\[[0-9a-f:.]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(raw);
}

function buildFanCounts_(rows, venueIds, gameIds) {
  const counts = {};
  rows.forEach(function(row) {
    if (row.status !== 'attending') return;
    if (!venueIds.has(row.venue_id) || !gameIds.has(row.game_id)) return;
    const key = row.game_id + '::' + row.venue_id;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).sort().map(function(key) {
    const parts = key.split('::');
    return { game_id: parts[0], venue_id: parts[1], count: counts[key] };
  });
}

function buildVenueHistoryCounts_(rows, venueIds, gameIds) {
  const gamesByVenue = {};
  rows.forEach(function(row) {
    if (row.status !== 'archived') return;
    if (!venueIds.has(row.venue_id) || !gameIds.has(row.game_id)) return;
    if (!gamesByVenue[row.venue_id]) gamesByVenue[row.venue_id] = new Set();
    gamesByVenue[row.venue_id].add(row.game_id);
  });
  return Array.from(venueIds).sort().map(function(venueId) {
    const games = gamesByVenue[venueId];
    return { venue_id: venueId, past_game_count: games ? games.size : 0 };
  });
}

function buildVenueSeasonCounts_(rows, venueIds, games) {
  const completedGameSeasons = {};
  games.forEach(function(game) {
    const season = Number(game.season);
    if (game.game_status !== 'completed' || !Number.isInteger(season)) return;
    completedGameSeasons[String(game.game_id)] = season;
  });

  const counts = {};
  rows.forEach(function(row) {
    if (row.status !== 'archived' || !venueIds.has(row.venue_id)) return;
    const season = completedGameSeasons[String(row.game_id)];
    if (!season) return;
    const key = season + '::' + row.venue_id;
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.keys(counts).sort().map(function(key) {
    const separator = key.indexOf('::');
    return {
      season: Number(key.slice(0, separator)),
      venue_id: key.slice(separator + 2),
      count: counts[key]
    };
  });
}

function fanExperienceSnapshotValue_(row, aliases) {
  for (let index = 0; index < aliases.length; index += 1) {
    const value = row && row[aliases[index]];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function cleanFanExperienceSnapshotText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
    .trim();
}

function cleanFanExperienceSnapshotDisplayName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
}

function fanExperienceSubmissionYear_(timestamp, parsedTimestamp) {
  const match = String(timestamp || '').match(/\b(20\d{2})\b/);
  if (match) return Number(match[1]);
  if (!Number.isFinite(parsedTimestamp)) return null;
  const year = new Date(parsedTimestamp).getUTCFullYear();
  return year >= 2000 && year <= 2100 ? year : null;
}

function buildPublishedFanExperiences_(rows, publishedVenueIds) {
  const timestampAliases = ['Timestamp', 'timestamp', 'response_timestamp'];
  const venueIdAliases = ['Venue ID', 'Selected Venue ID', 'venue_id'];

  return (rows || []).map(function(row, index) {
    const venueId = String(fanExperienceSnapshotValue_(row, venueIdAliases) || '').trim();
    const text = cleanFanExperienceSnapshotText_(row && row.public_text);
    const timestamp = fanExperienceSnapshotValue_(row, timestampAliases);
    const parsedTimestamp = Date.parse(String(timestamp || ''));
    return {
      venue_id: venueId,
      text: text,
      display_name: cleanFanExperienceSnapshotDisplayName_(row && row.public_display_name),
      year: fanExperienceSubmissionYear_(timestamp, parsedTimestamp),
      moderation_status: String((row && row.moderation_status) || '').trim(),
      timestamp_sort: Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0,
      row_sort: index
    };
  }).filter(function(row) {
    return row.moderation_status === 'published' &&
      /^venue_[a-f0-9]{24}$/.test(row.venue_id) &&
      publishedVenueIds.has(row.venue_id) &&
      Number.isInteger(row.year) && row.year >= 2000 && row.year <= 2100 &&
      row.text.length > 0 && row.text.length <= 500;
  }).sort(function(a, b) {
    return b.timestamp_sort - a.timestamp_sort || b.row_sort - a.row_sort;
  }).map(function(row) {
    return { venue_id: row.venue_id, text: row.text, display_name: row.display_name, year: row.year };
  });
}

function getWorkbook_() {
  const workbookId = PropertiesService.getScriptProperties().getProperty(CGB_WORKBOOK_PROPERTY);
  if (!workbookId) {
    throw new Error('Missing private Script Property: ' + CGB_WORKBOOK_PROPERTY);
  }
  return SpreadsheetApp.openById(workbookId);
}

function ensureHeaderRow_(sheet, expectedHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); });
  while (existing.length && !existing[existing.length - 1]) existing.pop();

  if (!existing.length) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    return;
  }

  const duplicates = existing.filter(function(header, index) {
    return header && existing.indexOf(header) !== index;
  });
  if (duplicates.length) {
    throw new Error('Duplicate headers in tab ' + sheet.getName() + ': ' + duplicates.join(', '));
  }

  const missing = expectedHeaders.filter(function(header) {
    return existing.indexOf(header) < 0;
  });
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
}

function readSheetObjects_(workbook, tabName) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value).trim(); });
  return values.slice(1).filter(function(row) {
    return row.some(function(value) { return value !== '' && value !== null; });
  }).map(function(row) {
    const object = {};
    headers.forEach(function(header, index) {
      object[header] = normalizeCellValue_(row[index]);
    });
    return object;
  });
}

function normalizeCellValue_(value) {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? '' : value;
}

function hasValidVenueCoordinates_(row) {
  const latitudeValue = row && row.latitude;
  const longitudeValue = row && row.longitude;
  if (latitudeValue === null || latitudeValue === undefined || String(latitudeValue).trim() === '') return false;
  if (longitudeValue === null || longitudeValue === undefined || String(longitudeValue).trim() === '') return false;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  const valid = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

  if (!valid) {
    console.warn('Skipping published venue with invalid coordinates: ' + String((row && row.venue_id) || '(missing venue_id)'));
  }
  return valid;
}

function whitelist_(row, fields) {
  const output = {};
  fields.forEach(function(field) {
    if (field === 'venue_tags' || field === 'feature_tags') return;
    output[field] = Object.prototype.hasOwnProperty.call(row, field) ? row[field] : '';
  });
  return output;
}

function clearPublicSnapshotCache_() {
  CacheService.getScriptCache().remove(CGB_PUBLIC_CACHE_KEY);
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
