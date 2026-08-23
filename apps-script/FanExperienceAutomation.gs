/**
 * Fan Experience Form processing and public projection.
 *
 * The Google Form owns the original response columns in Fan_Experiences_Raw.
 * This script appends only publication fields and exposes only venue_id + text.
 */

const CGB_FAN_EXPERIENCE_RAW_TAB = 'Fan_Experiences_Raw';
const CGB_FAN_EXPERIENCE_MAX_LENGTH = 500;
const CGB_FAN_EXPERIENCE_ADMIN_HEADERS = Object.freeze([
  'public_text',
  'moderation_status',
  'moderation_reason'
]);

const CGB_FAN_EXPERIENCE_FORM_ALIASES = Object.freeze({
  timestamp: Object.freeze(['Timestamp', 'timestamp', 'response_timestamp']),
  venue_name: Object.freeze(['Venue name', 'Venue Name', 'venue_name']),
  experience_text: Object.freeze([
    'What should other Bears know about watching a Cal game here?',
    'experience_text'
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
  const context = parseFanExperienceFormEvent_(event);
  const headers = ensureFanExperienceAdminHeaders_(context.sheet);
  const venueId = cleanFanExperienceIdentifier_(readFanExperienceFormField_(context.namedValues, 'venue_id'));
  const cleanedText = cleanFanExperienceText_(readFanExperienceFormField_(context.namedValues, 'experience_text'));

  let moderationStatus = 'held';
  let moderationReason = '';
  if (!isKnownCanonicalFanExperienceVenue_(context.workbook, venueId)) {
    moderationReason = 'unknown_venue';
  } else if (!cleanedText) {
    moderationReason = 'empty_experience';
  } else {
    const moderation = moderateFanExperienceText_(cleanedText);
    moderationStatus = moderation.status;
    moderationReason = moderation.reason;
  }

  updateFanExperienceRawFields_(context.sheet, context.rowNumber, headers, {
    public_text: cleanedText,
    moderation_status: moderationStatus,
    moderation_reason: moderationReason
  });

  if (moderationStatus === 'published') clearPublicSnapshotCache_();
  return {
    ok: true,
    moderation_status: moderationStatus,
    moderation_reason: moderationReason
  };
}

function parseFanExperienceFormEvent_(event) {
  if (!event || !event.range || typeof event.range.getSheet !== 'function' ||
      typeof event.range.getRow !== 'function') {
    throw new Error('invalid_fan_experience_form_event');
  }
  const sheet = event.range.getSheet();
  const rowNumber = Number(event.range.getRow());
  if (!sheet || sheet.getName() !== CGB_FAN_EXPERIENCE_RAW_TAB ||
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

function isKnownCanonicalFanExperienceVenue_(workbook, venueId) {
  if (!/^venue_[a-f0-9]{24}$/.test(String(venueId || ''))) return false;
  return readSheetObjects_(workbook, 'Venues').some(function(row) {
    return String(row.venue_id || '').trim() === venueId;
  });
}
