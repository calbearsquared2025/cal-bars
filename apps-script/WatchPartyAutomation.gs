/**
 * Existing-Venue Watch Party Form automation.
 *
 * One private Form response may publish one canonical Watch Party per selected
 * Game. Script locking and submission/Game idempotency make trigger redelivery
 * safe without activating the dormant discovery architecture.
 */

const CGB_MINIMAL_WATCH_PARTY_RAW_TAB = 'Watch_Party_Submissions_Raw';
const CGB_MINIMAL_WATCH_PARTY_LOCK_WAIT_MS = 30000;
const CGB_MINIMAL_WATCH_PARTY_ADMIN_HEADERS = Object.freeze([
  'submission_id',
  'processing_status',
  'created_watch_party_ids',
  'created_venue_id',
  'processing_error',
  'processed_at'
]);

const CGB_MINIMAL_WATCH_PARTY_MONTHS = Object.freeze([
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]);

const CGB_MINIMAL_WATCH_PARTY_FORM_ALIASES = Object.freeze({
  response_timestamp: Object.freeze(['Timestamp', 'response_timestamp']),
  venue_id: Object.freeze(['Venue ID (existing)', 'Venue ID', 'venue_id']),
  venue_name: Object.freeze(['Venue Name', 'venue_name_submitted']),
  game_ids: Object.freeze([
    'Which game or games will have a Watch Party here?',
    'Game IDs',
    'Game(s)',
    'game_ids_submitted'
  ]),
  organizer_name: Object.freeze([
    'Organizer or host name',
    'Organizer or host',
    'Organizer Name',
    'organizer_name'
  ]),
  organizer_type: Object.freeze([
    'Who is organizing or hosting this Watch Party?',
    'Organizer Type',
    'organizer_type'
  ]),
  official_event_url: Object.freeze([
    'Official event or RSVP link',
    'Official Event URL',
    'Official Event Website',
    'Event Website',
    'Website',
    'official_event_url'
  ]),
  age_policy: Object.freeze(['Are there age restrictions?', 'Age Policy', 'age_policy']),
  sound_status: Object.freeze(['Will the game audio be on?', 'Sound Status', 'sound_status']),
  restrictions_note: Object.freeze([
    'Restrictions or reservation information',
    'Restrictions Note',
    'restrictions_note'
  ]),
  game_day_note: Object.freeze([
    'Anything else fans should know?',
    'Game-day details',
    'Game Day Note',
    'game_day_note'
  ]),
  submitter_role: Object.freeze([
    'What is your relationship to this Watch Party?',
    'Submitter Relationship',
    'Submitter Role',
    'submitter_role'
  ]),
  submitter_email: Object.freeze(['Contact Email', 'Submitter Email', 'submitter_email'])
});

const CGB_MINIMAL_WATCH_PARTY_ORGANIZER_TYPE_MAP = Object.freeze({
  alumni_group: 'alumni_group',
  'alumni group': 'alumni_group',
  venue: 'venue',
  other_organization: 'other_organization',
  'other organization': 'other_organization',
  individual: 'individual',
  'individual or group of fans': 'individual',
  unknown: 'unknown',
  'not sure': 'unknown'
});

const CGB_MINIMAL_WATCH_PARTY_AGE_POLICY_MAP = Object.freeze({
  all_ages: 'all_ages',
  'all ages': 'all_ages',
  '21_plus': '21_plus',
  '21+': '21_plus',
  '21 plus': '21_plus',
  '21+ only': '21_plus',
  unknown: 'unknown'
});

const CGB_MINIMAL_WATCH_PARTY_SOUND_STATUS_MAP = Object.freeze({
  confirmed_on: 'confirmed_on',
  'confirmed on': 'confirmed_on',
  on: 'confirmed_on',
  yes: 'confirmed_on',
  confirmed_off: 'confirmed_off',
  'confirmed off': 'confirmed_off',
  off: 'confirmed_off',
  no: 'confirmed_off',
  unknown: 'unknown'
});

const CGB_MINIMAL_WATCH_PARTY_SOURCE_TYPE_MAP = Object.freeze({
  fan: 'fan_submitted',
  individual: 'fan_submitted',
  'i am organizing it as an individual or group of fans': 'fan_submitted',
  'i am sharing a public event organized by someone else': 'fan_submitted',
  venue: 'venue_submitted',
  'venue owner or manager': 'venue_submitted',
  'venue owner': 'venue_submitted',
  'venue manager': 'venue_submitted',
  'i represent the venue hosting it': 'venue_submitted',
  alumni: 'alumni_group_submitted',
  'alumni group': 'alumni_group_submitted',
  'alumni organizer': 'alumni_group_submitted',
  'i represent the alumni group or organization hosting it': 'alumni_group_submitted'
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
  let headers = null;
  let submissionId = '';
  let lock = null;
  let previousStatus = '';

  try {
    context = parseMinimalWatchPartyFormEvent_(event);
    lock = acquireMinimalWatchPartyLock_();
    headers = ensureMinimalWatchPartyAdminHeaders_(context.sheet);

    submissionId = readMinimalWatchPartyRawField_(
      context.sheet,
      context.rowNumber,
      headers,
      'submission_id'
    );
    previousStatus = readMinimalWatchPartyRawField_(
      context.sheet,
      context.rowNumber,
      headers,
      'processing_status'
    );

    if (submissionId && !isCanonicalEntityId_('watch_party_submission', submissionId)) {
      throw minimalWatchPartyError_('invalid_submission_id');
    }

    if (!submissionId) {
      submissionId = createMinimalWatchPartySubmissionId_();
      updateMinimalWatchPartyRawFields_(context.sheet, context.rowNumber, headers, {
        submission_id: submissionId,
        processing_status: 'new',
        created_watch_party_ids: '',
        created_venue_id: '',
        processing_error: '',
        processed_at: ''
      });
      previousStatus = 'new';
    }

    const submission = normalizeMinimalWatchPartySubmission_(context.namedValues, context.workbook);
    const requestedRows = buildMinimalWatchPartyRows_(context.workbook, submission, submissionId);
    const existingRows = readMinimalWatchPartyRowsForSubmission_(context.workbook, submissionId);
    const plan = buildMinimalWatchPartyPublicationPlan_(requestedRows, existingRows);

    appendMinimalWatchPartyRows_(context.workbook, plan.rowsToCreate);

    const watchPartyIds = plan.orderedRows.map(function(row) { return row.watch_party_id; });
    const processedAt = new Date().toISOString();
    updateMinimalWatchPartyRawFields_(context.sheet, context.rowNumber, headers, {
      processing_status: 'processed',
      created_watch_party_ids: JSON.stringify(watchPartyIds),
      created_venue_id: '',
      processing_error: '',
      processed_at: processedAt
    });

    const recoveredPriorWrite = plan.existingRequestedRows.length > 0 && previousStatus !== 'processed';
    if (plan.rowsToCreate.length || recoveredPriorWrite) clearPublicSnapshotCache_();

    return {
      ok: true,
      processing_status: 'processed',
      submission_id: submissionId,
      created_watch_party_ids: watchPartyIds,
      newly_created_watch_party_ids: plan.rowsToCreate.map(function(row) { return row.watch_party_id; })
    };
  } catch (error) {
    const errorCode = minimalWatchPartyErrorCode_(error);
    console.error(error && error.stack ? error.stack : error);

    if (context && errorCode !== 'watch_party_processing_busy' &&
        errorCode !== 'watch_party_lock_unavailable') {
      try {
        headers = headers || ensureMinimalWatchPartyAdminHeaders_(context.sheet);
        const rawSubmissionId = submissionId || readMinimalWatchPartyRawField_(
          context.sheet,
          context.rowNumber,
          headers,
          'submission_id'
        );
        if (!submissionId && isCanonicalEntityId_('watch_party_submission', rawSubmissionId)) {
          submissionId = rawSubmissionId;
        }
        if (!submissionId && !rawSubmissionId) {
          submissionId = createMinimalWatchPartySubmissionId_();
        }

        const recoveredIds = isCanonicalEntityId_('watch_party_submission', submissionId)
          ? readMinimalWatchPartyRowsForSubmission_(context.workbook, submissionId)
            .map(function(row) { return row.watch_party_id; })
          : [];
        const updates = {
          processing_status: 'error',
          created_watch_party_ids: recoveredIds.length ? JSON.stringify(recoveredIds) : '',
          created_venue_id: '',
          processing_error: errorCode,
          processed_at: new Date().toISOString()
        };
        if (isCanonicalEntityId_('watch_party_submission', submissionId)) {
          updates.submission_id = submissionId;
        }
        updateMinimalWatchPartyRawFields_(context.sheet, context.rowNumber, headers, updates);
      } catch (rawUpdateError) {
        console.error(rawUpdateError && rawUpdateError.stack ? rawUpdateError.stack : rawUpdateError);
      }
    }

    return {
      ok: false,
      processing_status: 'error',
      error: errorCode,
      submission_id: isCanonicalEntityId_('watch_party_submission', submissionId) ? submissionId : ''
    };
  } finally {
    releaseMinimalWatchPartyLock_(lock);
  }
}

function acquireMinimalWatchPartyLock_() {
  // Node VM harnesses used by repository tests do not provide Apps Script globals.
  if (typeof LockService === 'undefined') {
    return { releaseLock: function() {} };
  }
  if (!LockService || typeof LockService.getScriptLock !== 'function') {
    throw minimalWatchPartyError_('watch_party_lock_unavailable');
  }
  const lock = LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== 'function' || typeof lock.releaseLock !== 'function') {
    throw minimalWatchPartyError_('watch_party_lock_unavailable');
  }
  if (!lock.tryLock(CGB_MINIMAL_WATCH_PARTY_LOCK_WAIT_MS)) {
    throw minimalWatchPartyError_('watch_party_processing_busy');
  }
  return lock;
}

function releaseMinimalWatchPartyLock_(lock) {
  if (!lock || typeof lock.releaseLock !== 'function') return;
  try {
    lock.releaseLock();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
  }
}

function readMinimalWatchPartyRawField_(sheet, rowNumber, headers, header) {
  const columnIndex = headers.indexOf(header);
  if (columnIndex < 0) throw minimalWatchPartyError_('raw_admin_header_missing');
  return cleanMinimalWatchPartyText_(
    sheet.getRange(rowNumber, columnIndex + 1, 1, 1).getDisplayValues()[0][0],
    3000
  );
}

function readMinimalWatchPartyRowsForSubmission_(workbook, submissionId) {
  if (!submissionId) return [];
  return readSheetObjects_(workbook, 'Watch_Parties').filter(function(row) {
    return String(row.source_submission_id || '') === submissionId &&
      String(row.watch_party_id || '') &&
      String(row.game_id || '');
  });
}

function buildMinimalWatchPartyPublicationPlan_(requestedRows, existingRows) {
  const existingByGame = new Map();
  (existingRows || []).forEach(function(row) {
    const gameId = String(row.game_id || '');
    if (gameId && !existingByGame.has(gameId)) existingByGame.set(gameId, row);
  });

  const rowsToCreate = [];
  const existingRequestedRows = [];
  const orderedRows = (requestedRows || []).map(function(row) {
    const existing = existingByGame.get(String(row.game_id || ''));
    if (existing) {
      existingRequestedRows.push(existing);
      return existing;
    }
    rowsToCreate.push(row);
    return row;
  });

  return {
    orderedRows: orderedRows,
    existingRequestedRows: existingRequestedRows,
    rowsToCreate: rowsToCreate
  };
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

function normalizeMinimalWatchPartySubmission_(namedValues, workbook) {
  const organizerName = cleanMinimalWatchPartyText_(
    readMinimalWatchPartyFormField_(namedValues, 'organizer_name'),
    180
  );
  const submittedVenueId = cleanMinimalWatchPartyText_(
    readMinimalWatchPartyFormField_(namedValues, 'venue_id'),
    80
  );
  const venueId = resolveCanonicalId_(workbook, 'venue', submittedVenueId);
  const gameIds = resolveMinimalWatchPartyGameIds_(
    workbook,
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
    ''
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
  const officialEventUrl = normalizeMinimalWatchPartyHttpUrl_(
    readMinimalWatchPartyFormField_(namedValues, 'official_event_url')
  );
  if (!venueId) throw minimalWatchPartyError_('missing_venue_id');
  if (!gameIds.length) throw minimalWatchPartyError_('missing_game_ids');
  if (!organizerName) throw minimalWatchPartyError_('missing_organizer_name');
  if (!organizerType) throw minimalWatchPartyError_('invalid_organizer_type');
  if (!sourceType) throw minimalWatchPartyError_('invalid_submitter_role');
  if (!agePolicy) throw minimalWatchPartyError_('invalid_age_policy');
  if (!soundStatus) throw minimalWatchPartyError_('invalid_sound_status');

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

  const gamesById = new Map();
  readSheetObjects_(workbook, 'Games').forEach(function(row) {
    const gameId = String(row.game_id || '');
    if (gameId) gamesById.set(gameId, row);
  });
  submission.game_ids.forEach(function(gameId) {
    const game = gamesById.get(gameId);
    if (!game) throw minimalWatchPartyError_('unknown_game_id');
    if (cleanMinimalWatchPartyText_(game.game_status, 40).toLowerCase() !== 'upcoming') {
      throw minimalWatchPartyError_('game_not_open');
    }
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
  if (!rows || !rows.length) return 0;
  const sheet = workbook.getSheetByName('Watch_Parties');
  if (!sheet) throw minimalWatchPartyError_('missing_watch_parties_tab');
  const headers = readMinimalWatchPartyHeaders_(sheet);
  CGB_TABS.Watch_Parties.forEach(function(header) {
    if (headers.indexOf(header) < 0) throw minimalWatchPartyError_('watch_party_header_mismatch');
  });
  const values = rows.map(function(row) {
    return headers.map(function(header) {
      const value = Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
      return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'" + value : value;
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  return values.length;
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

function resolveMinimalWatchPartyGameIds_(workbook, value) {
  const selections = parseMinimalWatchPartyGameSelections_(value);
  if (!selections.length) return [];

  const games = readSheetObjects_(workbook, 'Games');
  const gameIds = new Map();
  const gameLabels = new Map();
  games.forEach(function(game) {
    const gameId = cleanMinimalWatchPartyText_(game && game.game_id, 80);
    if (!gameId) return;
    gameIds.set(gameId, gameId);
    const label = buildMinimalWatchPartyGameLabel_(game);
    if (label) gameLabels.set(normalizeMinimalWatchPartyGameLabel_(label), gameId);
  });

  const seen = new Set();
  return selections.map(function(selection) {
    const canonicalSelection = resolveCanonicalId_(workbook, 'game', selection);
    const directGameId = gameIds.get(canonicalSelection);
    const mappedGameId = directGameId || gameLabels.get(normalizeMinimalWatchPartyGameLabel_(selection));
    if (!mappedGameId) throw minimalWatchPartyError_('unknown_game_id');
    return mappedGameId;
  }).filter(function(gameId) {
    if (seen.has(gameId)) return false;
    seen.add(gameId);
    return true;
  });
}

function parseMinimalWatchPartyGameSelections_(value) {
  const text = cleanMinimalWatchPartyText_(value, 3000);
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
    return cleanMinimalWatchPartyText_(item, 240);
  }).filter(function(item) {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function buildMinimalWatchPartyGameLabel_(game) {
  const gameDate = formatMinimalWatchPartyGameDate_(game && game.game_date);
  const opponentName = cleanMinimalWatchPartyText_(game && game.opponent_name, 180);
  if (!gameDate || !opponentName) return '';
  const relationship = normalizeMinimalWatchPartyGameLabel_(game && game.home_away) === 'away'
    ? 'Cal at '
    : 'Cal vs. ';
  return gameDate + ' — ' + relationship + opponentName;
}

function formatMinimalWatchPartyGameDate_(value) {
  const text = cleanMinimalWatchPartyText_(value, 80);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!CGB_MINIMAL_WATCH_PARTY_MONTHS[monthIndex] || !Number.isInteger(day) || day < 1 || day > 31) {
    return '';
  }
  return CGB_MINIMAL_WATCH_PARTY_MONTHS[monthIndex] + ' ' + day;
}

function normalizeMinimalWatchPartyGameLabel_(value) {
  return cleanMinimalWatchPartyText_(value, 240)
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeMinimalWatchPartyEnum_(value, mapping, defaultValue) {
  const normalized = cleanMinimalWatchPartyText_(value, 240).toLowerCase();
  if (!normalized) return defaultValue;
  return mapping[normalized] || '';
}

function normalizeMinimalWatchPartyHttpUrl_(value) {
  const raw = cleanMinimalWatchPartyText_(value, 2000);
  if (!raw) return '';
  if (/\s/.test(raw)) throw minimalWatchPartyError_('invalid_official_event_url');

  const normalized = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  if (normalized.length > 2000 || !/^https?:\/\/[^/?#\s]+(?:[/?#]\S*)?$/i.test(normalized)) {
    throw minimalWatchPartyError_('invalid_official_event_url');
  }

  const authority = normalized.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
  if (!authority || authority.indexOf('@') >= 0) {
    throw minimalWatchPartyError_('invalid_official_event_url');
  }

  if (authority.charAt(0) === '[') {
    const closingBracket = authority.indexOf(']');
    const remainder = closingBracket >= 0 ? authority.slice(closingBracket + 1) : '';
    if (closingBracket < 0 || (remainder && !/^:\d+$/.test(remainder))) {
      throw minimalWatchPartyError_('invalid_official_event_url');
    }
  } else {
    const hostAndPort = authority.split(':');
    const hostname = hostAndPort[0];
    if (hostAndPort.length > 2 || !hostname ||
        !/^[a-z0-9.-]+$/i.test(hostname) || hostname.charAt(0) === '.' ||
        hostname.charAt(hostname.length - 1) === '.' || hostname.indexOf('..') >= 0 ||
        (hostAndPort.length === 2 && !/^\d+$/.test(hostAndPort[1]))) {
      throw minimalWatchPartyError_('invalid_official_event_url');
    }
  }

  return normalized;
}

function cleanMinimalWatchPartyText_(value, maxLength) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

function createMinimalWatchPartySubmissionId_() {
  return createCanonicalEntityId_('watch_party_submission');
}

function createMinimalWatchPartyId_() {
  return createCanonicalEntityId_('watch_party');
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
