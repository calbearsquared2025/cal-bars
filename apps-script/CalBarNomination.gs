/**
 * Private Cal Bar nomination workflow.
 * Nominations are stored for owner review and never modify public Venue data automatically.
 */

const CGB_CAL_BAR_NOMINATION_APPEND_HEADERS = Object.freeze([
  'alumni_group_affiliation', 'alumni_owned', 'cal_memorabilia', 'other_cal_connection',
  'source_response_key', 'processing_status', 'processing_error', 'processed_at',
  'duplicate_submission_id'
]);

const CGB_CAL_BAR_NOMINATION_FORM_TITLES = Object.freeze({
  venueName: 'Venue name',
  reason: 'What makes this a Cal Bar?',
  gatheringFrequency: 'How often do Cal fans gather here?',
  alumniGroupAffiliation: 'Is an alumni association or Cal group affiliated with this venue?',
  alumniOwned: 'Is the venue Cal alumni-owned or operated?',
  calMemorabilia: 'Does the venue display Cal memorabilia or other visible Cal identity?',
  otherCalConnection: 'Other Cal connection or supporting context',
  submitterRole: 'Your relationship to this venue',
  submitterName: 'Your name',
  submitterEmail: 'Your email',
  venueId: 'Selected Venue ID'
});

function prepareCalBarNominationWorkbook() {
  const workbook = getWorkbook_();
  const sheet = getRequiredSheet_(workbook, 'Cal_Bar_Nominations_Raw');
  const inspection = inspectAppendableHeaders_(sheet, CGB_CAL_BAR_NOMINATION_APPEND_HEADERS);
  appendApprovedHeaders_(sheet, CGB_CAL_BAR_NOMINATION_APPEND_HEADERS, inspection);
  return verifyCalBarNominationWorkbook_(workbook);
}

function verifyCalBarNominationWorkbook() {
  return verifyCalBarNominationWorkbook_(getWorkbook_());
}

function verifyCalBarNominationWorkbook_(workbook) {
  const required = CGB_TABS.Cal_Bar_Nominations_Raw.concat(CGB_CAL_BAR_NOMINATION_APPEND_HEADERS);
  return verifyRequiredHeaders_(workbook, 'Cal_Bar_Nominations_Raw', required);
}

/** Install as an owner-authorized From spreadsheet / On form submit trigger. */
function processCalBarNominationFormSubmit(event) {
  const workbook = getWorkbook_();
  const sheet = getRequiredSheet_(workbook, 'Cal_Bar_Nominations_Raw');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const row = normalizeCalBarNominationEvent_(event, sheet);
    const validationErrors = validateCalBarNomination_(row, workbook);
    const duplicate = findCalBarNominationDuplicate_(sheet, row);

    row.processing_status = duplicate
      ? 'duplicate'
      : validationErrors.length
        ? 'error'
        : 'needs_review';
    row.review_status = row.processing_status === 'duplicate' ? 'duplicate' : 'pending';
    row.processing_error = validationErrors.join(',');
    row.duplicate_submission_id = duplicate ? duplicate.submission_id : '';
    row.processed_at = new Date().toISOString();

    writeCalBarNominationRow_(sheet, row);
    return {
      ok: row.processing_status !== 'error',
      submission_id: row.submission_id,
      processing_status: row.processing_status,
      duplicate_submission_id: row.duplicate_submission_id,
      errors: validationErrors
    };
  } finally {
    lock.releaseLock();
  }
}

function normalizeCalBarNominationEvent_(event, sheet) {
  const named = event && event.namedValues ? event.namedValues : {};
  const value = function(title) {
    const entry = named[title];
    return cleanCalBarNominationText_(Array.isArray(entry) ? entry[0] : entry, 2000);
  };
  return {
    response_timestamp: event && event.values && event.values[0]
      ? cleanCalBarNominationText_(event.values[0], 100)
      : new Date().toISOString(),
    submission_id: 'cal_bar_nomination_' + Utilities.getUuid(),
    venue_id: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.venueId),
    venue_name: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.venueName),
    reason: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.reason),
    gathering_frequency: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.gatheringFrequency),
    supporting_url: '',
    submitter_role: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.submitterRole),
    submitter_name: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.submitterName),
    submitter_email: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.submitterEmail),
    photo_link: '',
    review_status: 'pending',
    reviewer_note: '',
    reviewed_at: '',
    alumni_group_affiliation: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.alumniGroupAffiliation),
    alumni_owned: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.alumniOwned),
    cal_memorabilia: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.calMemorabilia),
    other_cal_connection: value(CGB_CAL_BAR_NOMINATION_FORM_TITLES.otherCalConnection),
    source_response_key: buildCalBarNominationSourceKey_(event, sheet),
    processing_status: 'new',
    processing_error: '',
    processed_at: '',
    duplicate_submission_id: ''
  };
}

function validateCalBarNomination_(row, workbook) {
  const errors = [];
  if (!row.venue_name) errors.push('missing_venue_name');
  if (!row.reason) errors.push('missing_reason');
  if (!row.gathering_frequency) errors.push('missing_gathering_frequency');
  if (!row.submitter_role) errors.push('missing_submitter_role');
  if (!row.submitter_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.submitter_email)) {
    errors.push('invalid_submitter_email');
  }
  if (row.venue_id) {
    const venues = readSheetObjects_(workbook, 'Venues');
    if (!venues.some(function(venue) { return String(venue.venue_id) === row.venue_id; })) {
      errors.push('unknown_venue_id');
    }
  }
  return Array.from(new Set(errors));
}

function findCalBarNominationDuplicate_(sheet, row) {
  const rows = readSheetObjects_(getWorkbook_(), 'Cal_Bar_Nominations_Raw');
  return rows.find(function(existing) {
    if (existing.source_response_key && existing.source_response_key === row.source_response_key) return true;
    if (existing.processing_status === 'rejected') return false;
    if (row.venue_id && existing.venue_id === row.venue_id) return true;
    return normalizeCalBarNominationMatch_(existing.venue_name) === normalizeCalBarNominationMatch_(row.venue_name) &&
      normalizeCalBarNominationMatch_(existing.submitter_email) === normalizeCalBarNominationMatch_(row.submitter_email);
  }) || null;
}

function writeCalBarNominationRow_(sheet, row) {
  const headers = readHeaderRow_(sheet);
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([
    headers.map(function(header) { return row[header] === undefined ? '' : row[header]; })
  ]);
}

function buildCalBarNominationSourceKey_(event, sheet) {
  const range = event && event.range;
  if (range && typeof range.getRow === 'function') {
    return 'sheet:' + sheet.getSheetId() + ':row:' + range.getRow();
  }
  const values = event && event.values ? event.values.join('|') : new Date().toISOString();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, values);
  return 'digest:' + digest.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function normalizeCalBarNominationMatch_(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function cleanCalBarNominationText_(value, maxLength) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength || 1000);
}
