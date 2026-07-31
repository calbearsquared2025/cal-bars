/**
 * Minimal Watch Party form automation for product testing.
 *
 * This intentionally implements only the direct, existing-venue workflow:
 * Google Form response row -> validation -> canonical Watch_Parties row(s).
 * Advanced idempotency, discovery processing, locking, retries, duplicate
 * detection, and free-text venue creation are outside this milestone.
 */

const CGB_MINIMAL_WATCH_PARTY_RAW_TAB = 'Watch_Party_Submissions_Raw';
const CGB_MINIMAL_WATCH_PARTY_ADMIN_HEADERS = Object.freeze([
  'submission_id',
  'processing_status',
  'created_watch_party_ids',
  'created_venue_id',
  'processing_error',
  'processed_at'
]);

const CGB_MINIMAL_WATCH_PARTY_FORM_ALIASES = Object.freeze({
  response_timestamp: Object.freeze(['Timestamp', 'response_timestamp']),
  venue_id: Object.freeze(['Venue ID', 'Venue ID (existing)', 'venue_id']),
  game_ids: Object.freeze(['Game IDs', 'Game(s)', 'game_ids_submitted']),
  organizer_name: Object.freeze(['Organizer or host', 'Organizer Name', 'organizer_name']),
  organizer_type: Object.freeze(['Organizer Type', 'organizer_type']),
  official_event_url: Object.freeze(['Official Event URL', 'official_event_url']),
  age_policy: Object.freeze(['Age Policy', 'age_policy']),
  sound_status: Object.freeze(['Sound Status', 'sound_status']),
  restrictions_note: Object.freeze(['Restrictions or reservation information', 'Restrictions Note', 'restrictions_note']),
  game_day_note: Object.freeze(['Game-day details', 'Game Day Note', 'game_day_note']),
  submitter_role: Object.freeze(['Submitter Relationship', 'Submitter Role', 'submitter_role'])
});

const CGB_MINIMAL_WATCH_PARTY_ORGANIZER_TYPE_MAP = Object.freeze({
  alumni_group: 'alumni_group',
  'alumni group': 'alumni_group',
  venue: 'venue',
  other_organization: 'other_organization',
  'other organization': 'other_organization',
  individual: 'individual',
  unknown: 'unknown'
});

const CGB_MINIMAL_WATCH_PARTY_AGE_POLICY_MAP = Object.freeze({
  all_ages: 'all_ages',
  'all ages': 'all_ages',
  '21_plus': '21_plus',
  '21+': '21_plus',
  '21 plus': '21_plus',
  unknown: 'unknown'
});

const CGB_MINIMAL_WATCH_PARTY_SOUND_STATUS_MAP = Object.freeze({
  confirmed_on: 'confirmed_on',
  'confirmed on': 'confirmed_on',
  on: 'confirmed_on',
  confirmed_off: 'confirmed_off',
  'confirmed off': 'confirmed_off',
  off: 'confirmed_off',
  unknown: 'unknown'
});

const CGB_MINIMAL_WATCH_PARTY_SOURCE_TYPE_MAP = Object.freeze({
  fan: 'fan_submitted',
  individual: 'fan_submitted',
  venue: 'venue_submitted',
  'venue owner or manager': 'venue_submitted',
  'venue owner': 'venue_submitted',
  'venue manager': 'venue_submitted',
  alumni: 'alumni_group_submitted',
  'alumni group': 'alumni_group_submitted',
  'alumni organizer': 'alumni_group_submitted'
});

/**
 * Owner-only setup helper. Run once after the Google Form response tab has been
 * renamed to Watch_Party_Submissions_Raw.
 */
function prepareMinimalWatchPartyAutomation() {
  const workbook = getWorkbook_();
  const sheet = workbook.getSheetByName(CGB_MINIMAL_WATCH_PARTY_RAW_TAB);
  if (!sheet) {
    throw new Error('Missing tab: ' + CGB_MINIMAL_WATCH_PARTY_RAW_TAB);
  }
  const headers = ensureMinimalWatchPartyAdminHeaders_(sheet);
  return {
    ok: true,
    responseTab: CGB_MINIMAL_WATCH_PARTY_RAW_TAB,
    triggerFunction: 'onWatchPartyFormSubmit',
    adminHeaders: CGB_MINIMAL_WATCH_PARTY_ADMIN_HEADERS.slice(),
    headerCount: headers.length
  };
}

/** Install as a spreadsheet-bound "On form submit" trigger. */
function onWatchPartyFormSubmit(event) {
  return processMinimalWatchPartyFormSubmission_(event);
}

function processMinimalWatchPartyFormSubmission_(event) {
  let context = null;
  let submissionId = '';
  try {
    context = parseMinimalWatchPartyFormEvent_(event);
    const headers = ensureMinimalWatchPartyAdminHeaders_(context.sheet);
    submissionId = createMinimalWatchPartySubmissionId_();
    updateMinimalWatchPartyRawFields_(context.sheet, context.rowNumber, headers, {
      submission_id: submissionId,
      processing_status: 'new',
      created_watch_party_ids: '',
      created_venue_id: '',
      processing_error: '',
      processed_at: ''
    });

    const submission = normalizeMinimalWatchPartySubmission_(context.namedValues);
    const canonicalRows = buildMinimalWatchPartyRows_(context.workbook, submission, submissionId);
    appendMinimalWatchPartyRows_(context.workbook, canonicalRows);

    const watchPartyIds = canonicalRows.map(function(row) { return row.watch_party_id; });
    const processedAt = new Date().toISOString();
    updateMinimalWatchPartyRawFields_(context.sheet, context.rowNumber, headers, {
      processing_status: 'processed',
      created_watch_party_ids: JSON.stringify(watchPartyIds),
      created_venue_id: '',
      processing_error: '',
      processed_at: processedAt
    });
    clearPublicSnapshotCache_();

    return {
      ok: true,
      processing_status: 'processed',
      submission_id: submissionId,
      created_watch_party_ids: watchPartyIds
    };
  } catch (error) {
    const errorCode = minimalWatchPartyErrorCode_(error);
    console.error(error && error.stack ? error.stack : error);
    if (context) {
      try {
        const headers = ensureMinimalWatchPartyAdminHeaders_(context.sheet);
        updateMinimalWatchPartyRawFields_(context.sheet, context.rowNumber, headers, {
          submission_id: submissionId || createMinimalWatchPartySubmissionId_(),
          processing_status: 'error',
          created_watch_party_ids: '',
          created_venue_id: '',
          processing_error: errorCode,
          processed_at: new Date().toISOString()
        });
      } catch (rawUpdateError) {
        console.error(rawUpdateError && rawUpdateError.stack ? rawUpdateError.stack : rawUpdateError);
      }
    }
    return { ok: false, processing_status: 'error', error: errorCode };
  }
}

function parseMinimalWatchPartyFormEvent_(event) {
  if (!event || !event.range || typeof event.range.getSheet !== 'function' ||
      typeof event.range.getRow !== 'function') {
    throw minimalWatchPartyError_('invalid_form_event');
  }
  const sheet = event.range.getSheet();
  const rowNumber = Number(event.range.getRow());
  if (!sheet || sheet.getName() !== CGB_MINIMAL_WATCH_PARTY_RAW_TAB ||
      !Number.isFinite(rowNumber) || rowNumber < 2) {
    throw minimalWatchPartyError_('invalid_form_event');
  }
  return {
    workbook: getWorkbook_(),
    sheet: sheet,
    rowNumber: rowNumber,
    namedValues: event.namedValues || {}
  };
}

function normalizeMinimalWatchPartySubmission_(namedValues) {
  const organizerName = cleanMinimalWatchPartyText_(
    readMinimalWatchPartyFormField_(namedValues, 'organizer_name'),
    180
  );
  const venueId = cleanMinimalWatchPartyText_(
    readMinimalWatchPartyFormField_(namedValues, 'venue_id'),
    80
  );
  const gameIds = parseMinimalWatchPartyGameIds_(
    readMinimalWatchPartyFormField_(namedValues, 'game_ids')
  );
  const sourceType = normalizeMinimalWatchPartyEnum_(
    readMinimalWatchPartyFormField_(namedValues, 'submitter_role'),
    CGB_MINIMAL_WATCH_PARTY_SOURCE_TYPE_MAP,
    ''
  );
  const organizerType = normalizeMinimalWatchPartyEnum_(
    readMinimalWatchPartyFormField_(namedValues, 'organizer_type'),
    CGB_MINIMAL_WATCH_PARTY_ORGANIZER_TYPE_MAP,
    'unknown'
  );
  const agePolicy = normalizeMinimalWatchPartyEnum_(
    readMinimalWatchPartyFormField_(namedValues, 'age_policy'),
    CGB_MINIMAL_WATCH_PARTY_AGE_POLICY_MAP,
    'unknown'
  );
  const soundStatus = normalizeMinimalWatchPartyEnum_(
    readMinimalWatchPartyFormField_(namedValues, 'sound_status'),
    CGB_MINIMAL_WATCH_PARTY_SOUND_STATUS_MAP,
    'unknown'
  );
  const officialEventUrl = cleanMinimalWatchPartyText_(
    readMinimalWatchPartyFormField_(namedValues, 'official_event_url'),
    2000
  );
  if (!venueId) throw minimalWatchPartyError_('missing_venue_id');
  if (!gameIds.length) throw minimalWatchPartyError_('missing_game_ids');
  if (!organizerName) throw minimalWatchPartyError_('missing_organizer_name');
  if (!sourceType) throw minimalWatchPartyError_('invalid_submitter_role');
  if (officialEventUrl && !/^https?:\/\/\S+$/i.test(officialEventUrl)) {
    throw minimalWatchPartyError_('invalid_official_event_url');
  }

  return {
    venue_id: venueId,
    game_ids: gameIds,
    organizer_name: organizerName,
    organizer_type: organizerType,
    official_event_url: officialEventUrl,
    source_type: sourceType,
    age_policy: agePolicy,
    sound_status: soundStatus,
    restrictions_note: cleanMinimalWatchPartyText_(
      readMinimalWatchPartyFormField_(namedValues, 'restrictions_note'),
      1200
    ),
    game_day_note: cleanMinimalWatchPartyText_(
      readMinimalWatchPartyFormField_(namedValues, 'game_day_note'),
      1200
    )
  };
}

function buildMinimalWatchPartyRows_(workbook, submission, submissionId) {
  const venues = readSheetObjects_(workbook, 'Venues');
  const venue = venues.find(function(row) { return String(row.venue_id) === submission.venue_id; });
  if (!venue || venue.publication_status !== 'published' || !hasValidVenueCoordinates_(venue)) {
    throw minimalWatchPartyError_('venue_not_publishable');
  }

  const gameIdSet = new Set(readSheetObjects_(workbook, 'Games').map(function(row) {
    return String(row.game_id || '');
  }).filter(Boolean));
  submission.game_ids.forEach(function(gameId) {
    if (!gameIdSet.has(gameId)) throw minimalWatchPartyError_('unknown_game_id');
  });

  const now = new Date().toISOString();
  return submission.game_ids.map(function(gameId) {
    return {
      watch_party_id: createMinimalWatchPartyId_(),
      venue_id: submission.venue_id,
      game_id: gameId,
      organizer_name: submission.organizer_name,
      organizer_type: submission.organizer_type,
      official_event_url: submission.official_event_url,
      source_type: submission.source_type,
      event_start_at: '',
      age_policy: submission.age_policy,
      sound_status: submission.sound_status,
      restrictions_note: submission.restrictions_note,
      game_day_note: submission.game_day_note,
      event_status: 'active',
      publication_status: 'published',
      source_submission_id: submissionId,
      created_at: now,
      updated_at: now
    };
  });
}

function appendMinimalWatchPartyRows_(workbook, rows) {
  const sheet = workbook.getSheetByName('Watch_Parties');
  if (!sheet) throw minimalWatchPartyError_('missing_watch_parties_tab');
  const headers = readMinimalWatchPartyHeaders_(sheet);
  CGB_TABS.Watch_Parties.forEach(function(header) {
    if (headers.indexOf(header) < 0) throw minimalWatchPartyError_('watch_party_header_mismatch');
  });
  const values = rows.map(function(row) {
    return headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function ensureMinimalWatchPartyAdminHeaders_(sheet) {
  const headers = readMinimalWatchPartyHeaders_(sheet);
  const duplicates = headers.filter(function(header, index) {
    return header && headers.indexOf(header) !== index;
  });
  if (duplicates.length) throw minimalWatchPartyError_('duplicate_raw_headers');
  const missing = CGB_MINIMAL_WATCH_PARTY_ADMIN_HEADERS.filter(function(header) {
    return headers.indexOf(header) < 0;
  });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    sheet.setFrozenRows(1);
  }
  return headers.concat(missing);
}

function updateMinimalWatchPartyRawFields_(sheet, rowNumber, headers, updates) {
  Object.keys(updates).forEach(function(header) {
    const columnIndex = headers.indexOf(header);
    if (columnIndex < 0) throw minimalWatchPartyError_('raw_admin_header_missing');
    sheet.getRange(rowNumber, columnIndex + 1, 1, 1).setValues([[updates[header]]]);
  });
}

function readMinimalWatchPartyHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); });
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  return headers;
}

function readMinimalWatchPartyFormField_(namedValues, field) {
  const aliases = CGB_MINIMAL_WATCH_PARTY_FORM_ALIASES[field] || [];
  const available = Object.keys(namedValues || {});
  for (let i = 0; i < aliases.length; i += 1) {
    const normalizedAlias = String(aliases[i]).trim().toLowerCase();
    const matched = available.find(function(header) {
      return String(header).trim().toLowerCase() === normalizedAlias;
    });
    if (matched) return firstMinimalWatchPartyFormValue_(namedValues[matched]);
  }
  return '';
}

function firstMinimalWatchPartyFormValue_(value) {
  if (Array.isArray(value)) return value.map(String).join(', ');
  return value === null || value === undefined ? '' : String(value);
}

function parseMinimalWatchPartyGameIds_(value) {
  const text = cleanMinimalWatchPartyText_(value, 1000);
  if (!text) return [];
  let candidates = [];
  if (text.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) candidates = parsed;
    } catch (_) {}
  }
  if (!candidates.length) candidates = text.split(/[,;\n]+/);
  const seen = new Set();
  return candidates.map(function(item) {
    return cleanMinimalWatchPartyText_(item, 80);
  }).filter(function(item) {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function normalizeMinimalWatchPartyEnum_(value, mapping, defaultValue) {
  const normalized = cleanMinimalWatchPartyText_(value, 120).toLowerCase();
  if (!normalized) return defaultValue;
  return mapping[normalized] || '';
}

function cleanMinimalWatchPartyText_(value, maxLength) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

function createMinimalWatchPartySubmissionId_() {
  return 'wps_' + String(Utilities.getUuid()).replace(/-/g, '').slice(0, 24);
}

function createMinimalWatchPartyId_() {
  return 'wp_' + String(Utilities.getUuid()).replace(/-/g, '').slice(0, 24);
}

function minimalWatchPartyError_(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function minimalWatchPartyErrorCode_(error) {
  const code = error && error.code ? String(error.code) : 'watch_party_processing_failed';
  return /^[a-z0-9_]+$/.test(code) ? code : 'watch_party_processing_failed';
}
