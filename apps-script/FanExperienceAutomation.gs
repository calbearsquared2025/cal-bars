/**
 * Fan Experience Form processing and public projection.
 *
 * The Google Form owns the original response columns in Fan_Experiences_Raw.
 * This script appends only deliberate publication fields for the public Fan Experience projection.
 * Venue-detail freeform comments may also be copied into Fan_Experiences_Raw and are subjected to
 * the same cleaning and moderation rules before they can enter the public projection.
 */

const CGB_FAN_EXPERIENCE_RAW_TAB = 'Fan_Experiences_Raw';
const CGB_FAN_EXPERIENCE_MAX_LENGTH = 500;
const CGB_FAN_EXPERIENCE_DISPLAY_NAME_MAX_LENGTH = 60;
const CGB_FAN_EXPERIENCE_SOURCE_KEY_HEADER = 'source_contribution_key';
const CGB_FAN_EXPERIENCE_VENUE_DETAIL_TABS = Object.freeze([
  'Venue Details',
  'Cal_Bar_Nominations_Raw'
]);
const CGB_FAN_EXPERIENCE_ADMIN_HEADERS = Object.freeze([
  'public_text',
  'public_display_name',
  'moderation_status',
  'moderation_reason',
  CGB_FAN_EXPERIENCE_SOURCE_KEY_HEADER
]);

const CGB_FAN_EXPERIENCE_FORM_ALIASES = Object.freeze({
  timestamp: Object.freeze(['Timestamp', 'timestamp', 'response_timestamp']),
  venue_name: Object.freeze(['Venue name', 'Venue Name', 'venue_name']),
  experience_text: Object.freeze([
    'What should other Bears know about watching a Cal game here?',
    'Anything else we should know about this venue?',
    'Anything else we should know about this location?',
    'experience_text'
  ]),
  display_name: Object.freeze([
    'Name to Display (Optional!)',
    'Name to display (optional)',
    'Name to display',
    'display_name'
  ]),
  venue_id: Object.freeze(['Venue ID', 'Selected Venue ID', 'venue_id'])
});

const CGB_FAN_EXPERIENCE_MODERATION_RULES = Object.freeze([
  Object.freeze({
    reason: 'profanity_or_slur',
    pattern: /\b(?:fuck(?:ed|er|ers|ing)?|shit(?:ty)?|bullshit|bitch(?:es)?|cunt|motherfucker|nigg(?:er|a)s?|fagg?ot|retard(?:ed)?)\b/i
  }),
  Object.freeze({
    reason: 'threat_or_personal_attack',
    pattern: /\b(?:kill|shoot|stab|hurt|beat\s+up|attack)\b|\b(?:you|owner|staff|bartender|server|manager)\b.{0,36}\b(?:idiot|moron|stupid|loser|scum)\b/i
  }),
  Object.freeze({
    reason: 'serious_allegation',
    pattern: /\b(?:stole|steals|theft|fraud|scam(?:med|mer)?|racist|racism|discriminat(?:e|es|ed|ion|ory)|harass(?:ed|ment)?|assault(?:ed)?|drugged|poisoned|criminal|illegal|dangerous|unsafe)\b/i
  }),
  Object.freeze({
    reason: 'personal_contact_information',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/i
  }),
  Object.freeze({
    reason: 'url_or_solicitation',
    pattern: /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|biz)\b|\b(?:promo\s+code|discount\s+code|buy\s+now|dm\s+me|contact\s+me|whatsapp|telegram|crypto)\b/i
  })
]);

function prepareFanExperienceAutomation() {
  const workbook = getWorkbook_();
  const sheet = workbook.getSheetByName(CGB_FAN_EXPERIENCE_RAW_TAB);
  if (!sheet) throw new Error('Missing tab: ' + CGB_FAN_EXPERIENCE_RAW_TAB);
  const headers = ensureFanExperienceAdminHeaders_(sheet);
  return {
    ok: true,
    responseTab: CGB_FAN_EXPERIENCE_RAW_TAB,
    triggerFunction: 'onFanExperienceFormSubmit',
    adminHeaders: CGB_FAN_EXPERIENCE_ADMIN_HEADERS.slice(),
    headerCount: headers.length
  };
}

/** Install as a spreadsheet-bound "On form submit" trigger. */
function onFanExperienceFormSubmit(event) {
  const eventSheet = event && event.range && typeof event.range.getSheet === 'function'
    ? event.range.getSheet()
    : null;
  const sheetName = eventSheet && typeof eventSheet.getName === 'function'
    ? String(eventSheet.getName())
    : '';

  if (sheetName === CGB_FAN_EXPERIENCE_RAW_TAB || !sheetName) {
    return processFanExperienceRawEvent_(event);
  }
  if (CGB_FAN_EXPERIENCE_VENUE_DETAIL_TABS.indexOf(sheetName) >= 0) {
    return processVenueDetailFanExperienceEvent_(event);
  }
  return {
    ok: true,
    ignored: true,
    reason: 'unrelated_sheet'
  };
}

function processFanExperienceRawEvent_(event) {
  const context = parseFanExperienceFormEvent_(event);
  const headers = ensureFanExperienceAdminHeaders_(context.sheet);
  const venueId = cleanFanExperienceIdentifier_(readFanExperienceFormField_(context.namedValues, 'venue_id'));
  const result = evaluateFanExperienceSubmission_(
    context.workbook,
    venueId,
    readFanExperienceFormField_(context.namedValues, 'experience_text'),
    readFanExperienceFormField_(context.namedValues, 'display_name')
  );

  updateFanExperienceRawFields_(context.sheet, context.rowNumber, headers, {
    public_text: result.public_text,
    public_display_name: result.public_display_name,
    moderation_status: result.moderation_status,
    moderation_reason: result.moderation_reason
  });

  if (result.moderation_status === 'published') clearPublicSnapshotCache_();
  return {
    ok: true,
    moderation_status: result.moderation_status,
    moderation_reason: result.moderation_reason
  };
}

function processVenueDetailFanExperienceEvent_(event) {
  const context = parseVenueDetailFanExperienceEvent_(event);
  const venueId = cleanFanExperienceIdentifier_(readFanExperienceFormField_(context.namedValues, 'venue_id'));
  const rawText = readFanExperienceFormField_(context.namedValues, 'experience_text');
  const cleanedText = cleanFanExperienceText_(rawText);
  if (!cleanedText) {
    return {
      ok: true,
      ignored: true,
      reason: 'empty_experience'
    };
  }

  const timestamp = cleanFanExperienceIdentifier_(
    readFanExperienceFormField_(context.namedValues, 'timestamp')
  ) || new Date().toISOString();
  const sourceKey = buildVenueDetailFanExperienceSourceKey_(
    context.sheet.getName(),
    context.rowNumber,
    timestamp
  );
  const targetSheet = context.workbook.getSheetByName(CGB_FAN_EXPERIENCE_RAW_TAB);
  if (!targetSheet) throw new Error('Missing tab: ' + CGB_FAN_EXPERIENCE_RAW_TAB);
  const targetHeaders = ensureFanExperienceAdminHeaders_(targetSheet);
  const existing = findFanExperienceSourceKey_(targetSheet, targetHeaders, sourceKey);
  if (existing) {
    return {
      ok: true,
      redelivery: true,
      source: 'venue_details',
      moderation_status: existing.moderation_status,
      moderation_reason: existing.moderation_reason
    };
  }

  const result = evaluateFanExperienceSubmission_(context.workbook, venueId, cleanedText, '');
  const canonicalVenueName = fanExperienceCanonicalVenueName_(context.workbook, venueId);
  const venueName = cleanFanExperienceText_(
    readFanExperienceFormField_(context.namedValues, 'venue_name') || canonicalVenueName
  );
  appendFanExperienceRawRow_(targetSheet, targetHeaders, {
    timestamp: timestamp,
    venue_name: venueName,
    experience_text: cleanedText,
    venue_id: venueId,
    public_text: result.public_text,
    public_display_name: '',
    moderation_status: result.moderation_status,
    moderation_reason: result.moderation_reason,
    source_contribution_key: sourceKey
  });

  if (result.moderation_status === 'published') clearPublicSnapshotCache_();
  return {
    ok: true,
    source: 'venue_details',
    created_fan_experience: true,
    moderation_status: result.moderation_status,
    moderation_reason: result.moderation_reason
  };
}

function parseFanExperienceFormEvent_(event) {
  if (!event || !event.range || typeof event.range.getSheet !== 'function' ||
      typeof event.range.getRow !== 'function') {
    throw new Error('invalid_fan_experience_form_event');
  }
  const sheet = event.range.getSheet();
  const rowNumber = Number(event.range.getRow());
  if (!sheet || typeof sheet.getName !== 'function' ||
      sheet.getName() !== CGB_FAN_EXPERIENCE_RAW_TAB ||
      !Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new Error('invalid_fan_experience_form_event');
  }
  return {
    workbook: getWorkbook_(),
    sheet: sheet,
    rowNumber: rowNumber,
    namedValues: event.namedValues || {}
  };
}

function parseVenueDetailFanExperienceEvent_(event) {
  if (!event || !event.range || typeof event.range.getSheet !== 'function' ||
      typeof event.range.getRow !== 'function') {
    throw new Error('invalid_venue_detail_fan_experience_event');
  }
  const sheet = event.range.getSheet();
  const rowNumber = Number(event.range.getRow());
  const sheetName = sheet && typeof sheet.getName === 'function' ? String(sheet.getName()) : '';
  if (CGB_FAN_EXPERIENCE_VENUE_DETAIL_TABS.indexOf(sheetName) < 0 ||
      !Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new Error('invalid_venue_detail_fan_experience_event');
  }
  return {
    workbook: getWorkbook_(),
    sheet: sheet,
    rowNumber: rowNumber,
    namedValues: event.namedValues || {}
  };
}

function evaluateFanExperienceSubmission_(workbook, venueId, text, displayName) {
  const cleanedText = cleanFanExperienceText_(text);
  const cleanedDisplayName = cleanFanExperienceDisplayName_(displayName);
  let moderationStatus = 'held';
  let moderationReason = '';

  if (!isKnownCanonicalFanExperienceVenue_(workbook, venueId)) {
    moderationReason = 'unknown_venue';
  } else if (!cleanedText) {
    moderationReason = 'empty_experience';
  } else {
    const textModeration = moderateFanExperienceText_(cleanedText);
    if (textModeration.status === 'held') {
      moderationStatus = textModeration.status;
      moderationReason = textModeration.reason;
    } else {
      const displayNameModeration = moderateFanExperienceDisplayName_(cleanedDisplayName);
      moderationStatus = displayNameModeration.status;
      moderationReason = displayNameModeration.reason;
    }
  }

  return {
    public_text: cleanedText,
    public_display_name: cleanedDisplayName,
    moderation_status: moderationStatus,
    moderation_reason: moderationReason
  };
}

function ensureFanExperienceAdminHeaders_(sheet) {
  const lastColumn = Math.max(Number(sheet.getLastColumn()) || 0, 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(value) { return String(value || '').trim(); });
  const missing = CGB_FAN_EXPERIENCE_ADMIN_HEADERS.filter(function(header) {
    return headers.indexOf(header) < 0;
  });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    Array.prototype.push.apply(headers, missing);
  }
  return headers;
}

function updateFanExperienceRawFields_(sheet, rowNumber, headers, updates) {
  Object.keys(updates).forEach(function(header) {
    const index = headers.indexOf(header);
    if (index < 0) throw new Error('fan_experience_admin_header_missing:' + header);
    sheet.getRange(rowNumber, index + 1, 1, 1).setValue(updates[header]);
  });
}

function appendFanExperienceRawRow_(sheet, headers, values) {
  const row = headers.map(function() { return ''; });
  setFanExperienceLogicalRowValue_(row, headers, 'timestamp', values.timestamp, true);
  setFanExperienceLogicalRowValue_(row, headers, 'venue_name', values.venue_name, false);
  setFanExperienceLogicalRowValue_(row, headers, 'experience_text', values.experience_text, true);
  setFanExperienceLogicalRowValue_(row, headers, 'venue_id', values.venue_id, true);

  ['public_text', 'public_display_name', 'moderation_status', 'moderation_reason', CGB_FAN_EXPERIENCE_SOURCE_KEY_HEADER]
    .forEach(function(header) {
      const index = headers.indexOf(header);
      if (index < 0) throw new Error('fan_experience_admin_header_missing:' + header);
      row[index] = values[header] || '';
    });

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
}

function setFanExperienceLogicalRowValue_(row, headers, logicalField, value, required) {
  const aliases = CGB_FAN_EXPERIENCE_FORM_ALIASES[logicalField] || [];
  for (let index = 0; index < aliases.length; index += 1) {
    const columnIndex = headers.indexOf(aliases[index]);
    if (columnIndex >= 0) {
      row[columnIndex] = value || '';
      return;
    }
  }
  if (required) throw new Error('fan_experience_form_header_missing:' + logicalField);
}

function findFanExperienceSourceKey_(sheet, headers, sourceKey) {
  const columnIndex = headers.indexOf(CGB_FAN_EXPERIENCE_SOURCE_KEY_HEADER);
  if (columnIndex < 0 || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0] || '') !== sourceKey) continue;
    const rowNumber = index + 2;
    return {
      rowNumber: rowNumber,
      moderation_status: readFanExperienceSheetField_(sheet, rowNumber, headers, 'moderation_status'),
      moderation_reason: readFanExperienceSheetField_(sheet, rowNumber, headers, 'moderation_reason')
    };
  }
  return null;
}

function readFanExperienceSheetField_(sheet, rowNumber, headers, header) {
  const index = headers.indexOf(header);
  if (index < 0) return '';
  return String(sheet.getRange(rowNumber, index + 1, 1, 1).getDisplayValues()[0][0] || '').trim();
}

function buildVenueDetailFanExperienceSourceKey_(sheetName, rowNumber, timestamp) {
  return ['venue_details', String(sheetName || ''), String(rowNumber || ''), String(timestamp || '')].join('|');
}

function fanExperienceCanonicalVenueName_(workbook, venueId) {
  const row = readSheetObjects_(workbook, 'Venues').find(function(candidate) {
    return String(candidate.venue_id || '').trim() === String(venueId || '').trim();
  });
  return row ? String(row.name || '').trim() : '';
}

function readFanExperienceFormField_(namedValues, logicalField) {
  const aliases = CGB_FAN_EXPERIENCE_FORM_ALIASES[logicalField] || [];
  for (let index = 0; index < aliases.length; index += 1) {
    const value = namedValues && namedValues[aliases[index]];
    const resolved = Array.isArray(value) ? value.join(', ') : value;
    if (String(resolved || '').trim()) return resolved;
  }
  return '';
}

function cleanFanExperienceIdentifier_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function cleanFanExperienceText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CGB_FAN_EXPERIENCE_MAX_LENGTH)
    .trim();
}

function cleanFanExperienceDisplayName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CGB_FAN_EXPERIENCE_DISPLAY_NAME_MAX_LENGTH)
    .trim();
}

function moderateFanExperienceText_(value) {
  const text = cleanFanExperienceText_(value);
  if (!text) return { status: 'held', reason: 'empty_experience' };

  for (let index = 0; index < CGB_FAN_EXPERIENCE_MODERATION_RULES.length; index += 1) {
    const rule = CGB_FAN_EXPERIENCE_MODERATION_RULES[index];
    if (rule.pattern.test(text)) return { status: 'held', reason: rule.reason };
  }

  if (/(.)\1{7,}/i.test(text) || /\b([a-z0-9]+)(?:\s+\1){4,}\b/i.test(text)) {
    return { status: 'held', reason: 'junk_or_repetition' };
  }
  const letters = text.match(/[a-z]/gi) || [];
  if (letters.length < 3) return { status: 'held', reason: 'junk_or_repetition' };
  return { status: 'published', reason: '' };
}

function moderateFanExperienceDisplayName_(value) {
  const displayName = cleanFanExperienceDisplayName_(value);
  if (!displayName) return { status: 'published', reason: '' };

  for (let index = 0; index < CGB_FAN_EXPERIENCE_MODERATION_RULES.length; index += 1) {
    const rule = CGB_FAN_EXPERIENCE_MODERATION_RULES[index];
    if (rule.pattern.test(displayName)) {
      return { status: 'held', reason: 'display_name_' + rule.reason };
    }
  }
  if (/(.)\1{7,}/i.test(displayName) || /\b([a-z0-9]+)(?:\s+\1){4,}\b/i.test(displayName)) {
    return { status: 'held', reason: 'display_name_junk_or_repetition' };
  }
  return { status: 'published', reason: '' };
}

function isKnownCanonicalFanExperienceVenue_(workbook, venueId) {
  if (!/^venue_[a-f0-9]{24}$/.test(String(venueId || ''))) return false;
  return readSheetObjects_(workbook, 'Venues').some(function(row) {
    return String(row.venue_id || '').trim() === venueId;
  });
}

/**
 * One-time, idempotent migration helper for venue-detail responses submitted before this routing existed.
 * Run manually after deploying this version if historical freeform venue comments should enter Fan Experiences.
 */
function backfillVenueDetailFanExperiences() {
  const workbook = getWorkbook_();
  const summary = { ok: true, created: 0, published: 0, held: 0, skipped: 0, errors: 0 };

  CGB_FAN_EXPERIENCE_VENUE_DETAIL_TABS.forEach(function(sheetName) {
    const sheet = workbook.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0].map(function(value) { return String(value || '').trim(); });

    for (let index = 1; index < values.length; index += 1) {
      const namedValues = {};
      headers.forEach(function(header, columnIndex) {
        if (!header) return;
        namedValues[header] = [values[index][columnIndex] || ''];
      });
      const rowNumber = index + 1;
      const event = {
        range: {
          getSheet: function() { return sheet; },
          getRow: function() { return rowNumber; }
        },
        namedValues: namedValues
      };

      try {
        const result = processVenueDetailFanExperienceEvent_(event);
        if (result.created_fan_experience) {
          summary.created += 1;
          if (result.moderation_status === 'published') summary.published += 1;
          else summary.held += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (error) {
        summary.errors += 1;
        console.error(error && error.stack ? error.stack : error);
      }
    }
  });

  return summary;
}
