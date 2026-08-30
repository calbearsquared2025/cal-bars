/**
 * Structured contribution automation for persistent Venue observations and
 * Watch Party detail updates.
 *
 * Privacy boundary:
 * - Form-owned response rows remain the private source record.
 * - Only controlled positive tags and an unambiguous event start time may be
 *   applied automatically.
 * - Freeform text, names, email addresses, identity corrections, closures,
 *   cancellations, organizer changes, and event-link replacements never flow
 *   into the public model through this automation.
 */

const CGB_CONTRIBUTION_LOCK_WAIT_MS = 30000;
const CGB_CONTRIBUTION_ADMIN_HEADERS = Object.freeze([
  'processing_status',
  'processing_error',
  'processed_at'
]);

const CGB_CONTRIBUTION_VENUE_TAGS = Object.freeze([
  '21_plus',
  'audio_on',
  'food',
  'cal_beer',
  'large_crowd',
  'cal_memorabilia'
]);

const CGB_CONTRIBUTION_WATCH_PARTY_TAGS = Object.freeze([
  'rsvp_requested',
  'cal_specials'
]);

const CGB_CONTRIBUTION_FORM_ALIASES = Object.freeze({
  venue_id: Object.freeze([
    'Venue ID', 'Venue ID (existing)', 'Selected Venue ID', 'related_venue_id', 'venue_id'
  ]),
  watch_party_id: Object.freeze([
    'Watch Party ID', 'related_watch_party_id', 'watch_party_id'
  ]),
  structured_tags: Object.freeze([
    'Which of these describe this location?',
    'Which of these details apply?',
    'Structured details',
    'Game-day details',
    'What makes this venue feel like a Cal destination?',
    'What should Bears know about this Watch Party?'
  ]),
  event_start: Object.freeze([
    'Event start or suggested arrival time',
    'Event start / arrival time',
    'Start or arrival time',
    'event_start_information',
    'event_start_at'
  ]),
  update_category: Object.freeze([
    'What are you sharing?', 'Update category', 'update_category'
  ])
});

const CGB_CONTRIBUTION_TAG_LABEL_ALIASES = Object.freeze({
  '21_plus': Object.freeze(['21+']),
  audio_on: Object.freeze([
    'AUDIO ON — game sound is usually on',
    'AUDIO ON — game sound is expected/on',
    'AUDIO ON - game sound is usually on',
    'AUDIO ON - game sound is expected/on',
    'AUDIO ON'
  ]),
  food: Object.freeze(['FOOD AVAILABLE', 'FOOD']),
  cal_beer: Object.freeze([
    "Serves Cal beer (Oski's Gold, Coach Ron Golden Ale)",
    'CAL BEER'
  ]),
  large_crowd: Object.freeze([
    'LARGE CROWD — typically 10+ Cal fans',
    'LARGE CROWD - typically 10+ Cal fans',
    'LARGE CROWD'
  ]),
  cal_memorabilia: Object.freeze([
    'CAL MEMORABILIA — Cal flags, signs, memorabilia, or similar',
    'CAL MEMORABILIA - Cal flags, signs, memorabilia, or similar',
    'CAL MEMORABILIA'
  ]),
  rsvp_requested: Object.freeze(['RSVP REQUESTED']),
  cal_specials: Object.freeze([
    'CAL SPECIALS — special food, drink, or pricing for the Cal group',
    'CAL SPECIALS - special food, drink, or pricing for the Cal group',
    'CAL SPECIALS'
  ])
});

const CGB_CONTRIBUTION_TIMEZONES = Object.freeze({
  PT: 'America/Los_Angeles', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles',
  MT: 'America/Denver', MST: 'America/Denver', MDT: 'America/Denver',
  CT: 'America/Chicago', CST: 'America/Chicago', CDT: 'America/Chicago',
  ET: 'America/New_York', EST: 'America/New_York', EDT: 'America/New_York',
  AKT: 'America/Anchorage', AKST: 'America/Anchorage', AKDT: 'America/Anchorage',
  HT: 'Pacific/Honolulu', HST: 'Pacific/Honolulu'
});

/**
 * One spreadsheet-bound form-submit trigger may serve the four structured
 * contribution Forms. Unrelated Form tabs are deliberately ignored so their
 * focused processors can retain ownership.
 */
function onContributionFormSubmit(event) {
  const sheet = event && event.range && typeof event.range.getSheet === 'function'
    ? event.range.getSheet()
    : null;
  const sheetName = sheet && typeof sheet.getName === 'function' ? String(sheet.getName()) : '';

  if (sheetName === CGB_MINIMAL_WATCH_PARTY_RAW_TAB) {
    const baseResult = processMinimalWatchPartyFormSubmission_(event);
    if (!baseResult || baseResult.ok !== true) return baseResult;
    return enhanceWatchPartySubmissionContribution_(event, baseResult);
  }

  if (sheetName === 'Venue Details' || sheetName === 'Cal_Bar_Nominations_Raw') {
    return processVenueStructuredContribution_(event, 'venue_details');
  }

  if (sheetName === 'Venue Problem Submission') {
    return processVenueStructuredContribution_(event, 'venue_update');
  }

  if (sheetName === 'Watch Party Problem Submission') {
    return processWatchPartyStructuredUpdate_(event);
  }

  if (sheetName === 'Listing_Updates_Raw') {
    const watchPartyId = cleanContributionText_(
      readContributionFormField_(event && event.namedValues, 'watch_party_id'),
      80
    );
    return watchPartyId
      ? processWatchPartyStructuredUpdate_(event)
      : processVenueStructuredContribution_(event, 'venue_update');
  }

  return { ok: true, ignored: true, sheet: sheetName };
}

function processVenueStructuredContribution_(event, source) {
  return processContributionRawEvent_(event, function(context) {
    const venueId = cleanContributionText_(
      readContributionFormField_(context.namedValues, 'venue_id'),
      80
    );
    if (!isCanonicalEntityId_('venue', venueId)) {
      throw contributionError_('invalid_venue_id');
    }

    const selected = parseContributionStructuredTags_(
      readContributionFormField_(context.namedValues, 'structured_tags')
    );
    const venueTags = selected.filter(function(tag) {
      return CGB_CONTRIBUTION_VENUE_TAGS.indexOf(tag) >= 0;
    });
    const result = mergeVenueContributionTags_(context.workbook, venueId, venueTags);

    return {
      ok: true,
      source: source,
      venue_id: venueId,
      added_venue_tags: result.added,
      changed: result.changed
    };
  });
}

function processWatchPartyStructuredUpdate_(event) {
  return processContributionRawEvent_(event, function(context) {
    const watchPartyId = cleanContributionText_(
      readContributionFormField_(context.namedValues, 'watch_party_id'),
      80
    );
    if (!isCanonicalEntityId_('watch_party', watchPartyId)) {
      throw contributionError_('invalid_watch_party_id');
    }

    const selected = parseContributionStructuredTags_(
      readContributionFormField_(context.namedValues, 'structured_tags')
    );
    const startValue = cleanContributionText_(
      readContributionFormField_(context.namedValues, 'event_start'),
      240
    );
    const result = applyWatchPartyStructuredContribution_(
      context.workbook,
      watchPartyId,
      selected,
      startValue
    );

    return {
      ok: true,
      watch_party_id: watchPartyId,
      changed: result.changed,
      added_venue_tags: result.addedVenueTags,
      added_watch_party_tags: result.addedWatchPartyTags,
      event_start_at: result.eventStartAt,
      manual_review_reasons: result.manualReviewReasons
    };
  });
}

function enhanceWatchPartySubmissionContribution_(event, baseResult) {
  let lock = null;
  try {
    lock = acquireContributionLock_();
    const workbook = getWorkbook_();
    const selected = parseContributionStructuredTags_(
      readContributionFormField_(event && event.namedValues, 'structured_tags')
    );
    const startValue = cleanContributionText_(
      readContributionFormField_(event && event.namedValues, 'event_start'),
      240
    );
    const watchPartyIds = Array.isArray(baseResult.created_watch_party_ids)
      ? baseResult.created_watch_party_ids
      : [];
    const aggregate = {
      changed: false,
      addedVenueTags: [],
      addedWatchPartyTags: [],
      eventStartAt: [],
      manualReviewReasons: []
    };

    watchPartyIds.forEach(function(watchPartyId) {
      if (!isCanonicalEntityId_('watch_party', watchPartyId)) return;
      const result = applyWatchPartyStructuredContribution_(
        workbook,
        watchPartyId,
        selected,
        startValue
      );
      aggregate.changed = aggregate.changed || result.changed;
      aggregate.addedVenueTags = aggregate.addedVenueTags.concat(result.addedVenueTags);
      aggregate.addedWatchPartyTags = aggregate.addedWatchPartyTags.concat(result.addedWatchPartyTags);
      if (result.eventStartAt) aggregate.eventStartAt.push(result.eventStartAt);
      aggregate.manualReviewReasons = aggregate.manualReviewReasons.concat(result.manualReviewReasons);
    });

    if (aggregate.changed) clearPublicSnapshotCache_();
    return Object.assign({}, baseResult, {
      added_venue_tags: uniqueContributionValues_(aggregate.addedVenueTags),
      added_watch_party_tags: uniqueContributionValues_(aggregate.addedWatchPartyTags),
      event_start_at: uniqueContributionValues_(aggregate.eventStartAt),
      manual_review_reasons: uniqueContributionValues_(aggregate.manualReviewReasons)
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return Object.assign({}, baseResult, {
      contribution_enhancement_error: contributionErrorCode_(error)
    });
  } finally {
    releaseContributionLock_(lock);
  }
}

function applyWatchPartyStructuredContribution_(workbook, watchPartyId, selectedTags, startValue) {
  const reference = findContributionCanonicalRow_(workbook, 'Watch_Parties', 'watch_party_id', watchPartyId);
  if (!reference) throw contributionError_('unknown_watch_party_id');

  const party = reference.row;
  const venueTags = selectedTags.filter(function(tag) {
    return CGB_CONTRIBUTION_VENUE_TAGS.indexOf(tag) >= 0;
  });
  const watchPartyTags = selectedTags.filter(function(tag) {
    return CGB_CONTRIBUTION_WATCH_PARTY_TAGS.indexOf(tag) >= 0;
  });
  const manualReviewReasons = [];
  const updates = {};

  if (venueTags.indexOf('21_plus') >= 0) {
    const currentAge = cleanContributionText_(party.age_policy, 40).toLowerCase();
    if (!currentAge || currentAge === 'unknown' || currentAge === '21_plus') {
      if (currentAge !== '21_plus') updates.age_policy = '21_plus';
    } else {
      manualReviewReasons.push('age_policy_conflict');
    }
  }

  if (venueTags.indexOf('audio_on') >= 0) {
    const currentSound = cleanContributionText_(party.sound_status, 40).toLowerCase();
    if (!currentSound || currentSound === 'unknown' || currentSound === 'confirmed_on') {
      if (currentSound !== 'confirmed_on') updates.sound_status = 'confirmed_on';
    } else {
      manualReviewReasons.push('sound_status_conflict');
    }
  }

  const currentPartyTags = parseContributionCanonicalTagCell_(
    party.feature_tags,
    CGB_CONTRIBUTION_WATCH_PARTY_TAGS
  );
  const mergedPartyTags = mergeContributionTagLists_(
    currentPartyTags,
    watchPartyTags,
    CGB_CONTRIBUTION_WATCH_PARTY_TAGS
  );
  if (serializeContributionTagList_(currentPartyTags, CGB_CONTRIBUTION_WATCH_PARTY_TAGS) !==
      serializeContributionTagList_(mergedPartyTags, CGB_CONTRIBUTION_WATCH_PARTY_TAGS)) {
    updates.feature_tags = serializeContributionTagList_(
      mergedPartyTags,
      CGB_CONTRIBUTION_WATCH_PARTY_TAGS
    );
  }

  let eventStartAt = '';
  if (startValue) {
    const game = findContributionCanonicalRow_(workbook, 'Games', 'game_id', String(party.game_id || ''));
    eventStartAt = normalizeContributionEventStart_(startValue, game && game.row && game.row.game_date);
    if (eventStartAt) {
      const currentStart = cleanContributionText_(party.event_start_at, 120);
      if (!currentStart) updates.event_start_at = eventStartAt;
      else if (currentStart !== eventStartAt) manualReviewReasons.push('event_start_conflict');
    } else {
      manualReviewReasons.push('event_start_needs_timezone');
    }
  }

  let partyChanged = Object.keys(updates).length > 0;
  if (partyChanged) {
    updates.updated_at = new Date().toISOString();
    writeContributionCanonicalUpdates_(reference, updates);
  }

  const venueTagsSafeToSeed = venueTags.filter(function(tag) {
    if (tag === '21_plus' && manualReviewReasons.indexOf('age_policy_conflict') >= 0) return false;
    if (tag === 'audio_on' && manualReviewReasons.indexOf('sound_status_conflict') >= 0) return false;
    return true;
  });
  const venueResult = mergeVenueContributionTags_(
    workbook,
    String(party.venue_id || ''),
    venueTagsSafeToSeed
  );
  partyChanged = partyChanged || venueResult.changed;

  return {
    changed: partyChanged,
    addedVenueTags: venueResult.added,
    addedWatchPartyTags: mergedPartyTags.filter(function(tag) {
      return currentPartyTags.indexOf(tag) < 0;
    }),
    eventStartAt: updates.event_start_at || '',
    manualReviewReasons: manualReviewReasons
  };
}

function mergeVenueContributionTags_(workbook, venueId, additions) {
  if (!isCanonicalEntityId_('venue', venueId)) throw contributionError_('invalid_venue_id');
  const reference = findContributionCanonicalRow_(workbook, 'Venues', 'venue_id', venueId);
  if (!reference) throw contributionError_('unknown_venue_id');

  const current = parseContributionCanonicalTagCell_(
    reference.row.venue_tags,
    CGB_CONTRIBUTION_VENUE_TAGS
  );
  const merged = mergeContributionTagLists_(current, additions, CGB_CONTRIBUTION_VENUE_TAGS);
  const added = merged.filter(function(tag) { return current.indexOf(tag) < 0; });
  if (!added.length) return { changed: false, added: [], tags: current };

  writeContributionCanonicalUpdates_(reference, {
    venue_tags: serializeContributionTagList_(merged, CGB_CONTRIBUTION_VENUE_TAGS),
    updated_at: new Date().toISOString()
  });
  return { changed: true, added: added, tags: merged };
}

function processContributionRawEvent_(event, processor) {
  let context = null;
  let lock = null;
  try {
    context = parseContributionEvent_(event);
    lock = acquireContributionLock_();
    const headers = ensureContributionAdminHeaders_(context.sheet);
    const currentStatus = readContributionRawField_(
      context.sheet,
      context.rowNumber,
      headers,
      'processing_status'
    );
    if (currentStatus === 'processed') {
      return { ok: true, processing_status: 'processed', redelivery: true };
    }

    const result = processor(context) || { ok: true, changed: false };
    updateContributionRawFields_(context.sheet, context.rowNumber, headers, {
      processing_status: 'processed',
      processing_error: '',
      processed_at: new Date().toISOString()
    });
    if (result.changed) clearPublicSnapshotCache_();
    return Object.assign({ processing_status: 'processed' }, result);
  } catch (error) {
    const code = contributionErrorCode_(error);
    console.error(error && error.stack ? error.stack : error);
    if (context) {
      try {
        const headers = ensureContributionAdminHeaders_(context.sheet);
        updateContributionRawFields_(context.sheet, context.rowNumber, headers, {
          processing_status: 'error',
          processing_error: code,
          processed_at: new Date().toISOString()
        });
      } catch (rawError) {
        console.error(rawError && rawError.stack ? rawError.stack : rawError);
      }
    }
    return { ok: false, processing_status: 'error', error: code };
  } finally {
    releaseContributionLock_(lock);
  }
}

function parseContributionEvent_(event) {
  if (!event || !event.range || typeof event.range.getSheet !== 'function' ||
      typeof event.range.getRow !== 'function') {
    throw contributionError_('invalid_form_event');
  }
  const sheet = event.range.getSheet();
  const rowNumber = Number(event.range.getRow());
  if (!sheet || !Number.isFinite(rowNumber) || rowNumber < 2) {
    throw contributionError_('invalid_form_event');
  }
  return {
    workbook: getWorkbook_(),
    sheet: sheet,
    rowNumber: rowNumber,
    namedValues: event.namedValues || {}
  };
}

function acquireContributionLock_() {
  if (typeof LockService === 'undefined') return { releaseLock: function() {} };
  const lock = LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== 'function' || !lock.tryLock(CGB_CONTRIBUTION_LOCK_WAIT_MS)) {
    throw contributionError_('contribution_processing_busy');
  }
  return lock;
}

function releaseContributionLock_(lock) {
  if (!lock || typeof lock.releaseLock !== 'function') return;
  try { lock.releaseLock(); } catch (error) { console.error(error); }
}

function ensureContributionAdminHeaders_(sheet) {
  const headers = readContributionHeaders_(sheet);
  const normalized = headers.map(function(header) { return String(header).trim().toLowerCase(); });
  const duplicates = normalized.filter(function(header, index) {
    return header && normalized.indexOf(header) !== index;
  });
  if (duplicates.length) throw contributionError_('duplicate_raw_headers');

  const missing = CGB_CONTRIBUTION_ADMIN_HEADERS.filter(function(header) {
    return normalized.indexOf(header.toLowerCase()) < 0;
  });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    if (typeof sheet.setFrozenRows === 'function') sheet.setFrozenRows(1);
  }
  return headers.concat(missing);
}

function readContributionHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); });
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  return headers;
}

function readContributionRawField_(sheet, rowNumber, headers, header) {
  const index = headers.map(function(value) { return String(value).trim().toLowerCase(); })
    .indexOf(String(header).toLowerCase());
  if (index < 0) throw contributionError_('raw_admin_header_missing');
  return cleanContributionText_(
    sheet.getRange(rowNumber, index + 1, 1, 1).getDisplayValues()[0][0],
    3000
  );
}

function updateContributionRawFields_(sheet, rowNumber, headers, updates) {
  const normalized = headers.map(function(value) { return String(value).trim().toLowerCase(); });
  Object.keys(updates).forEach(function(header) {
    const index = normalized.indexOf(String(header).toLowerCase());
    if (index < 0) throw contributionError_('raw_admin_header_missing');
    sheet.getRange(rowNumber, index + 1, 1, 1).setValues([[updates[header]]]);
  });
}

function readContributionFormField_(namedValues, field) {
  const aliases = CGB_CONTRIBUTION_FORM_ALIASES[field] || [];
  const available = Object.keys(namedValues || {});
  for (let i = 0; i < aliases.length; i += 1) {
    const normalizedAlias = normalizeContributionLabel_(aliases[i]);
    const matched = available.find(function(header) {
      return normalizeContributionLabel_(header) === normalizedAlias;
    });
    if (matched) return flattenContributionFormValue_(namedValues[matched]);
  }
  return '';
}

function flattenContributionFormValue_(value) {
  if (Array.isArray(value)) return value.map(String).join('\n');
  return value === null || value === undefined ? '' : String(value);
}

function normalizeContributionLabel_(value) {
  return cleanContributionText_(value, 500)
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseContributionStructuredTags_(value) {
  const text = normalizeContributionLabel_(value);
  if (!text) return [];
  const selected = [];
  Object.keys(CGB_CONTRIBUTION_TAG_LABEL_ALIASES).forEach(function(tag) {
    const aliases = CGB_CONTRIBUTION_TAG_LABEL_ALIASES[tag];
    const matched = aliases.some(function(alias) {
      return text.indexOf(normalizeContributionLabel_(alias)) >= 0;
    });
    if (matched) selected.push(tag);
  });
  return selected;
}

function parseContributionCanonicalTagCell_(value, allowed) {
  const raw = cleanContributionText_(value, 2000);
  if (!raw) return [];
  let candidates = [];
  if (raw.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) candidates = parsed;
    } catch (_) {}
  }
  if (!candidates.length) candidates = raw.split(/[|;\n,]+/);
  const selected = new Set(candidates.map(function(item) {
    return cleanContributionText_(item, 80).toLowerCase();
  }));
  return allowed.filter(function(tag) { return selected.has(tag); });
}

function mergeContributionTagLists_(current, additions, allowed) {
  const selected = new Set([].concat(current || [], additions || []));
  return allowed.filter(function(tag) { return selected.has(tag); });
}

function serializeContributionTagList_(tags, allowed) {
  return allowed.filter(function(tag) {
    return Array.isArray(tags) && tags.indexOf(tag) >= 0;
  }).join('|');
}

function uniqueContributionValues_(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function findContributionCanonicalRow_(workbook, tabName, idField, idValue) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value).trim(); });
  const idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw contributionError_('canonical_header_missing');
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idIndex] || '').trim() !== String(idValue || '').trim()) continue;
    const row = {};
    headers.forEach(function(header, index) {
      row[header] = normalizeCellValue_(values[rowIndex][index]);
    });
    return { sheet: sheet, headers: headers, rowNumber: rowIndex + 1, row: row };
  }
  return null;
}

function writeContributionCanonicalUpdates_(reference, updates) {
  Object.keys(updates).forEach(function(header) {
    const index = reference.headers.indexOf(header);
    if (index < 0) throw contributionError_('canonical_header_missing');
    reference.sheet.getRange(reference.rowNumber, index + 1, 1, 1).setValues([[updates[header]]]);
    reference.row[header] = updates[header];
  });
}

function normalizeContributionEventStart_(value, gameDate) {
  const raw = cleanContributionText_(value, 240);
  const dateMatch = cleanContributionText_(gameDate, 40).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!raw || !dateMatch) return '';

  if (/^\d{4}-\d{2}-\d{2}T/i.test(raw) && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const direct = Date.parse(raw);
    return Number.isFinite(direct) ? new Date(direct).toISOString() : '';
  }

  const numericOffset = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*([+-]\d{2}:?\d{2})$/i);
  if (numericOffset) {
    const clock = contributionClockParts_(numericOffset[1], numericOffset[2], numericOffset[3]);
    if (!clock) return '';
    const offset = numericOffset[4].replace(/^(\+|-)(\d{2})(\d{2})$/, '$1$2:$3');
    const iso = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3] + 'T' +
      String(clock.hour).padStart(2, '0') + ':' + String(clock.minute).padStart(2, '0') + ':00' + offset;
    const parsed = Date.parse(iso);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : '';
  }

  const zoned = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(PT|PST|PDT|MT|MST|MDT|CT|CST|CDT|ET|EST|EDT|AKT|AKST|AKDT|HT|HST|UTC|GMT)$/i);
  if (!zoned) return '';
  const clock = contributionClockParts_(zoned[1], zoned[2], zoned[3]);
  if (!clock) return '';
  const zoneCode = String(zoned[4]).toUpperCase();
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (zoneCode === 'UTC' || zoneCode === 'GMT') {
    return new Date(Date.UTC(year, month - 1, day, clock.hour, clock.minute, 0)).toISOString();
  }
  const timeZone = CGB_CONTRIBUTION_TIMEZONES[zoneCode];
  return timeZone
    ? contributionZonedDateTimeToIso_(year, month, day, clock.hour, clock.minute, timeZone)
    : '';
}

function contributionClockParts_(hourValue, minuteValue, meridiemValue) {
  let hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  const meridiem = String(meridiemValue || '').toUpperCase();
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === 'PM') hour += 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return { hour: hour, minute: minute };
}

function contributionZonedDateTimeToIso_(year, month, day, hour, minute, timeZone) {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return '';
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = contributionTimezoneOffsetMinutes_(new Date(utc), timeZone);
    if (!Number.isFinite(offset)) return '';
    utc = Date.UTC(year, month - 1, day, hour, minute, 0) - offset * 60000;
  }
  return new Date(utc).toISOString();
}

function contributionTimezoneOffsetMinutes_(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = {};
  formatter.formatToParts(date).forEach(function(part) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  });
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

function setupContributionTagSchema_() {
  const workbook = getWorkbook_();
  const venueColumn = ensureContributionCanonicalColumn_(workbook, 'Venues', 'venue_tags');
  const partyColumn = ensureContributionCanonicalColumn_(workbook, 'Watch_Parties', 'feature_tags');
  applyContributionTagValidation_(venueColumn.sheet, venueColumn.column, CGB_CONTRIBUTION_VENUE_TAGS);
  applyContributionTagValidation_(partyColumn.sheet, partyColumn.column, CGB_CONTRIBUTION_WATCH_PARTY_TAGS);
  return {
    venueTagsColumn: venueColumn.column,
    watchPartyTagsColumn: partyColumn.column
  };
}

function ensureContributionCanonicalColumn_(workbook, tabName, header) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet) throw contributionError_('missing_' + tabName.toLowerCase() + '_tab');
  const headers = readContributionHeaders_(sheet);
  const existing = headers.indexOf(header);
  if (existing >= 0) return { sheet: sheet, column: existing + 1, added: false };
  const column = headers.length + 1;
  sheet.getRange(1, column, 1, 1).setValues([[header]]);
  if (typeof sheet.setFrozenRows === 'function') sheet.setFrozenRows(1);
  return { sheet: sheet, column: column, added: true };
}

function contributionSerializedTagOptions_(allowed) {
  const options = [];
  const count = Math.pow(2, allowed.length);
  for (let mask = 1; mask < count; mask += 1) {
    const tags = allowed.filter(function(_, index) { return (mask & (1 << index)) !== 0; });
    options.push(tags.join('|'));
  }
  return options;
}

function applyContributionTagValidation_(sheet, column, allowed) {
  if (typeof SpreadsheetApp === 'undefined' || typeof SpreadsheetApp.newDataValidation !== 'function') return;
  const maxRows = typeof sheet.getMaxRows === 'function' ? sheet.getMaxRows() : Math.max(sheet.getLastRow(), 2);
  if (maxRows < 2) return;
  const validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(contributionSerializedTagOptions_(allowed), true)
    .setAllowInvalid(false)
    .setHelpText('Controlled CGB structured tags. Use the contribution automation or an approved dropdown value.')
    .build();
  sheet.getRange(2, column, maxRows - 1, 1).setDataValidation(validation);
}

function cleanContributionText_(value, maxLength) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

function contributionError_(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function contributionErrorCode_(error) {
  const code = error && error.code ? String(error.code) : 'contribution_processing_failed';
  return /^[a-z0-9_]+$/.test(code) ? code : 'contribution_processing_failed';
}
