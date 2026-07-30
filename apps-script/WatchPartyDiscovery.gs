/**
 * Cal Golden Bars v2 Watch Party discovery foundation.
 *
 * This file contains private schema constants, owner-only workbook verification
 * and preparation helpers, and pure discovery-domain rules. It intentionally
 * does not install triggers or write canonical Venues or Watch Parties.
 */

const CGB_WATCH_PARTY_DISCOVERY_HEADERS = Object.freeze([
  'discovery_id', 'idempotency_key', 'source_kind', 'source_record_id',
  'source_url', 'source_label', 'raw_submission_id', 'venue_id_candidate',
  'venue_name_candidate', 'address_candidate', 'trusted_place_source',
  'trusted_place_id', 'resolved_venue_id', 'game_ids_candidate',
  'organizer_name_candidate', 'organizer_type_candidate',
  'official_event_url_candidate', 'event_start_candidate',
  'age_policy_candidate', 'sound_status_candidate',
  'restrictions_note_candidate', 'game_day_note_candidate', 'candidate_status',
  'validation_errors', 'research_note', 'created_watch_party_ids',
  'created_venue_id', 'last_error', 'attempt_count', 'created_at', 'updated_at',
  'published_at'
]);

const CGB_WATCH_PARTY_CANONICAL_DISCOVERY_HEADERS = Object.freeze([
  'discovery_id', 'publication_key'
]);

const CGB_WATCH_PARTY_RAW_DISCOVERY_HEADERS = Object.freeze(['discovery_id']);

const CGB_WATCH_PARTY_DISCOVERY_STATUSES = Object.freeze([
  'new', 'needs_research', 'needs_venue_resolution', 'ready_to_publish',
  'publishing', 'partial_failure', 'published', 'error', 'withdrawn'
]);

const CGB_WATCH_PARTY_RAW_PROCESSING_STATUSES = Object.freeze([
  'new', 'discovery_created', 'processing', 'processed', 'needs_research',
  'partial_failure', 'error'
]);

const CGB_WATCH_PARTY_SOURCE_KINDS = Object.freeze([
  'form_submission', 'research', 'import', 'demo'
]);

const CGB_WATCH_PARTY_FORM_LOCK_TIMEOUT_MS = 10000;
const CGB_WATCH_PARTY_FORM_HEADER_LABELS = Object.freeze({
  response_timestamp: 'Timestamp',
  submitter_role: 'Submitter Role',
  organizer_name: 'Organizer Name',
  organizer_type: 'Organizer Type',
  venue_id_submitted: 'Venue ID (existing)',
  venue_name_submitted: 'Venue Name',
  address_submitted: 'Venue Address',
  game_ids_submitted: 'Game(s)',
  official_event_url: 'Official Event URL',
  event_start_information: 'Event Start Information',
  age_policy: 'Age Policy',
  sound_status: 'Sound Status',
  restrictions_note: 'Restrictions Note',
  game_day_note: 'Game Day Note',
  submitter_name: 'Submitter Name',
  submitter_email: 'Submitter Email'
});
const CGB_WATCH_PARTY_FORM_REQUIRED_FIELDS = Object.freeze([
  'response_timestamp', 'submitter_role', 'organizer_name', 'game_ids_submitted'
]);
const CGB_WATCH_PARTY_FORM_SOURCE_TYPE_MAP = Object.freeze({
  fan: 'fan_submitted',
  venue: 'venue_submitted',
  alumni: 'alumni_group_submitted',
  alumni_group: 'alumni_group_submitted',
  cgb: 'cgb_added',
  staff: 'cgb_added',
  owner: 'cgb_added',
  admin: 'cgb_added'
});
const CGB_WATCH_PARTY_FORM_ORGANIZER_TYPE_MAP = Object.freeze({
  fan: 'individual',
  venue: 'venue',
  alumni: 'alumni_group',
  alumni_group: 'alumni_group',
  cgb: 'other_organization',
  staff: 'other_organization',
  owner: 'other_organization',
  admin: 'other_organization'
});

const CGB_WATCH_PARTY_ORGANIZER_TYPES = Object.freeze([
  'alumni_group', 'venue', 'other_organization', 'individual', 'unknown'
]);

const CGB_WATCH_PARTY_AGE_POLICIES = Object.freeze([
  'all_ages', '21_plus', 'unknown'
]);

const CGB_WATCH_PARTY_SOUND_STATUSES = Object.freeze([
  'confirmed_on', 'confirmed_off', 'unknown'
]);

const CGB_WATCH_PARTY_TRUSTED_PLACE_SOURCES = Object.freeze(['maptiler']);

const CGB_WATCH_PARTY_STATUS_TRANSITIONS = Object.freeze({
  new: Object.freeze(['new', 'needs_research', 'needs_venue_resolution', 'ready_to_publish', 'error', 'withdrawn']),
  needs_research: Object.freeze(['needs_research', 'needs_venue_resolution', 'ready_to_publish', 'error', 'withdrawn']),
  needs_venue_resolution: Object.freeze(['needs_venue_resolution', 'needs_research', 'ready_to_publish', 'error', 'withdrawn']),
  ready_to_publish: Object.freeze(['ready_to_publish', 'publishing', 'needs_research', 'needs_venue_resolution', 'error', 'withdrawn']),
  publishing: Object.freeze(['publishing', 'published', 'partial_failure', 'error']),
  partial_failure: Object.freeze(['partial_failure', 'ready_to_publish', 'publishing', 'published', 'error', 'withdrawn']),
  published: Object.freeze(['published']),
  error: Object.freeze(['error', 'needs_research', 'needs_venue_resolution', 'ready_to_publish', 'publishing', 'published', 'withdrawn']),
  withdrawn: Object.freeze(['withdrawn'])
});

/** Owner-only, read-only schema inspection. */
function verifyWatchPartyDiscoveryWorkbook() {
  return verifyWatchPartyDiscoveryWorkbook_(getWorkbook_());
}

/**
 * Owner-only preparation helper. Do not run until the foundation PR is accepted
 * and the owner is instructed to update the private workbook.
 */
function prepareWatchPartyDiscoveryWorkbook() {
  const workbook = getWorkbook_();
  const partySheet = getRequiredSheet_(workbook, 'Watch_Parties');
  const rawSheet = getRequiredSheet_(workbook, 'Watch_Party_Submissions_Raw');
  const partyInspection = inspectAppendableHeaders_(partySheet, CGB_WATCH_PARTY_CANONICAL_DISCOVERY_HEADERS);
  const rawInspection = inspectAppendableHeaders_(rawSheet, CGB_WATCH_PARTY_RAW_DISCOVERY_HEADERS);

  let discoverySheet = workbook.getSheetByName('Watch_Party_Discovery');
  if (discoverySheet) {
    const discoveryCheck = verifyExactHeaders_(workbook, 'Watch_Party_Discovery', CGB_WATCH_PARTY_DISCOVERY_HEADERS);
    const hasHeaders = readHeaderRow_(discoverySheet).length > 0;
    if (hasHeaders && !discoveryCheck.ok) {
      throw new Error('Header mismatch in tab Watch_Party_Discovery. Resolve manually before continuing.');
    }
  } else {
    discoverySheet = workbook.insertSheet('Watch_Party_Discovery');
  }
  ensureHeaderRow_(discoverySheet, CGB_WATCH_PARTY_DISCOVERY_HEADERS);
  appendApprovedHeaders_(partySheet, CGB_WATCH_PARTY_CANONICAL_DISCOVERY_HEADERS, partyInspection);
  appendApprovedHeaders_(rawSheet, CGB_WATCH_PARTY_RAW_DISCOVERY_HEADERS, rawInspection);

  return verifyWatchPartyDiscoveryWorkbook_(workbook);
}

function verifyWatchPartyDiscoveryWorkbook_(workbook) {
  const checks = [
    verifyExactHeaders_(workbook, 'Watch_Party_Discovery', CGB_WATCH_PARTY_DISCOVERY_HEADERS),
    verifyRequiredHeaders_(workbook, 'Watch_Parties', CGB_WATCH_PARTY_CANONICAL_DISCOVERY_HEADERS),
    verifyRequiredHeaders_(workbook, 'Watch_Party_Submissions_Raw', CGB_WATCH_PARTY_RAW_DISCOVERY_HEADERS)
  ];
  return {
    ok: checks.every(function(check) { return check.ok; }),
    checks: checks
  };
}

function verifyExactHeaders_(workbook, tabName, expectedHeaders) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet) return { tab: tabName, ok: false, error: 'missing_tab' };
  const actual = readHeaderRow_(sheet);
  return {
    tab: tabName,
    ok: JSON.stringify(actual) === JSON.stringify(expectedHeaders),
    error: JSON.stringify(actual) === JSON.stringify(expectedHeaders) ? '' : 'header_mismatch',
    missing: expectedHeaders.filter(function(header) { return actual.indexOf(header) < 0; }),
    unexpected: actual.filter(function(header) { return expectedHeaders.indexOf(header) < 0; })
  };
}

function verifyRequiredHeaders_(workbook, tabName, requiredHeaders) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet) return { tab: tabName, ok: false, error: 'missing_tab' };
  const actual = readHeaderRow_(sheet);
  const missing = requiredHeaders.filter(function(header) { return actual.indexOf(header) < 0; });
  return { tab: tabName, ok: missing.length === 0, error: missing.length ? 'missing_headers' : '', missing: missing };
}

function readHeaderRow_(sheet) {
  if (sheet.getLastColumn() < 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); });
  while (headers.length && headers[headers.length - 1] === '') headers.pop();
  return headers;
}

function inspectAppendableHeaders_(sheet, headersToAppend) {
  const existing = readHeaderRow_(sheet);
  if (!existing.length) throw new Error('Missing existing headers in tab ' + sheet.getName());
  if (existing.indexOf('') >= 0) throw new Error('Blank header gap in tab ' + sheet.getName());
  const duplicates = existing.filter(function(header, index) { return existing.indexOf(header) !== index; });
  if (duplicates.length) throw new Error('Duplicate headers in tab ' + sheet.getName());
  return {
    existing: existing,
    missing: headersToAppend.filter(function(header) { return existing.indexOf(header) < 0; })
  };
}

function appendApprovedHeaders_(sheet, headersToAppend, inspection) {
  const result = inspection || inspectAppendableHeaders_(sheet, headersToAppend);
  if (!result.missing.length) return;
  sheet.getRange(1, result.existing.length + 1, 1, result.missing.length).setValues([result.missing]);
  sheet.setFrozenRows(1);
}

function requireHeaders_(actual, required, tabName) {
  required.forEach(function(header) {
    if (actual.indexOf(header) < 0) throw new Error('Missing ' + tabName + ' column: ' + header);
  });
}

function normalizeWatchPartyCandidate_(input) {
  const sourceKind = normalizeWatchPartyEnum_(input && input.source_kind);
  const gameIds = normalizeGameIdsCandidate_(input && input.game_ids_candidate);
  const defaultStatus = isPrivateWatchPartySourceKind_(sourceKind) ? 'needs_research' : 'new';
  return {
    discovery_id: cleanWatchPartyText_(input && input.discovery_id, 80),
    idempotency_key: cleanWatchPartyText_(input && input.idempotency_key, 500),
    source_kind: sourceKind,
    source_record_id: cleanWatchPartyText_(input && input.source_record_id, 240),
    source_url: cleanWatchPartyText_(input && input.source_url, 2000),
    source_label: cleanWatchPartyText_(input && input.source_label, 300),
    raw_submission_id: cleanWatchPartyText_(input && input.raw_submission_id, 240),
    venue_id_candidate: cleanWatchPartyText_(input && input.venue_id_candidate, 80),
    venue_name_candidate: cleanWatchPartyText_(input && input.venue_name_candidate, 180),
    address_candidate: cleanWatchPartyText_(input && input.address_candidate, 600),
    trusted_place_source: normalizeWatchPartyEnum_(input && input.trusted_place_source),
    trusted_place_id: cleanWatchPartyText_(input && input.trusted_place_id, 200),
    resolved_venue_id: cleanWatchPartyText_(input && input.resolved_venue_id, 80),
    game_ids_candidate: JSON.stringify(gameIds),
    organizer_name_candidate: cleanWatchPartyText_(input && input.organizer_name_candidate, 180),
    organizer_type_candidate: normalizeWatchPartyEnum_(input && input.organizer_type_candidate),
    official_event_url_candidate: cleanWatchPartyText_(input && input.official_event_url_candidate, 2000),
    event_start_candidate: cleanWatchPartyText_(input && input.event_start_candidate, 120),
    age_policy_candidate: normalizeWatchPartyEnum_(input && input.age_policy_candidate),
    sound_status_candidate: normalizeWatchPartyEnum_(input && input.sound_status_candidate),
    restrictions_note_candidate: cleanWatchPartyText_(input && input.restrictions_note_candidate, 1200),
    game_day_note_candidate: cleanWatchPartyText_(input && input.game_day_note_candidate, 1200),
    candidate_status: normalizeWatchPartyEnum_(input && input.candidate_status) || defaultStatus,
    validation_errors: normalizeJsonListField_(input && input.validation_errors),
    research_note: cleanWatchPartyText_(input && input.research_note, 2000),
    created_watch_party_ids: normalizeJsonListField_(input && input.created_watch_party_ids),
    created_venue_id: cleanWatchPartyText_(input && input.created_venue_id, 80),
    last_error: cleanWatchPartyText_(input && input.last_error, 2000),
    attempt_count: normalizeAttemptCount_(input && input.attempt_count),
    created_at: cleanWatchPartyText_(input && input.created_at, 80),
    updated_at: cleanWatchPartyText_(input && input.updated_at, 80),
    published_at: cleanWatchPartyText_(input && input.published_at, 80)
  };
}

function validateWatchPartySourceKind_(value) {
  return CGB_WATCH_PARTY_SOURCE_KINDS.indexOf(normalizeWatchPartyEnum_(value)) >= 0;
}

function validateWatchPartyCandidate_(candidate, options) {
  const settings = options || {};
  const errors = [];
  const sourceKind = normalizeWatchPartyEnum_(candidate && candidate.source_kind);
  const status = normalizeWatchPartyEnum_(candidate && candidate.candidate_status);
  const gameIds = normalizeGameIdsCandidate_(candidate && candidate.game_ids_candidate);

  if (!validateWatchPartySourceKind_(sourceKind)) errors.push('invalid_source_kind');
  if (CGB_WATCH_PARTY_DISCOVERY_STATUSES.indexOf(status) < 0) errors.push('invalid_candidate_status');
  if (!cleanWatchPartyText_(candidate && candidate.idempotency_key, 500)) errors.push('missing_idempotency_key');
  if (sourceKind === 'form_submission' &&
      !cleanWatchPartyText_(candidate && candidate.source_record_id, 240) &&
      !cleanWatchPartyText_(candidate && candidate.raw_submission_id, 240)) {
    errors.push('missing_form_source_record_id');
  }
  if (candidate && candidate.source_url && !isValidWatchPartyHttpUrl_(candidate.source_url)) {
    errors.push('invalid_source_url');
  }
  if (candidate && candidate.official_event_url_candidate &&
      !isValidWatchPartyHttpUrl_(candidate.official_event_url_candidate)) {
    errors.push('invalid_official_event_url');
  }
  const trustedSource = normalizeWatchPartyEnum_(candidate && candidate.trusted_place_source);
  if (trustedSource && CGB_WATCH_PARTY_TRUSTED_PLACE_SOURCES.indexOf(trustedSource) < 0) {
    errors.push('unsupported_trusted_place_source');
  }
  if (candidate && candidate.source_url && candidate.official_event_url_candidate &&
      candidate.source_url === candidate.official_event_url_candidate && settings.rejectIdenticalUrls) {
    errors.push('source_and_official_url_must_be_reviewed_separately');
  }

  if (settings.forPublication) {
    if (['ready_to_publish', 'publishing', 'partial_failure'].indexOf(status) < 0) {
      errors.push('invalid_publication_status');
    }
    if (settings.automatic && isPrivateWatchPartySourceKind_(sourceKind)) {
      errors.push('source_kind_requires_deliberate_publication');
    }
    if (!isSafeWatchPartyCanonicalId_(candidate && candidate.discovery_id)) errors.push('invalid_discovery_id');
    if (!isSafeWatchPartyCanonicalId_(candidate && candidate.resolved_venue_id)) errors.push('missing_resolved_venue_id');
    errors.push.apply(errors, validateGameIdsForPublication_(gameIds, settings.knownGameIds));
    if (!cleanWatchPartyText_(candidate && candidate.organizer_name_candidate, 180)) errors.push('missing_organizer_name');
    if (CGB_WATCH_PARTY_ORGANIZER_TYPES.indexOf(normalizeWatchPartyEnum_(candidate && candidate.organizer_type_candidate)) < 0) {
      errors.push('invalid_organizer_type');
    }
    if (CGB_WATCH_PARTY_AGE_POLICIES.indexOf(normalizeWatchPartyEnum_(candidate && candidate.age_policy_candidate)) < 0) {
      errors.push('invalid_age_policy');
    }
    if (CGB_WATCH_PARTY_SOUND_STATUSES.indexOf(normalizeWatchPartyEnum_(candidate && candidate.sound_status_candidate)) < 0) {
      errors.push('invalid_sound_status');
    }
    if (candidate && candidate.event_start_candidate && !isValidWatchPartyDatetime_(candidate.event_start_candidate)) {
      errors.push('invalid_event_start');
    }
  }
  return uniqueWatchPartyValues_(errors);
}

function normalizeGameIdsCandidate_(value) {
  let values = value;
  if (typeof values === 'string') {
    const text = values.trim();
    if (!text) return [];
    if (text.charAt(0) === '[') {
      try { values = JSON.parse(text); } catch (_) { values = text.split(/[\n,;]+/); }
    } else {
      values = text.split(/[\n,;]+/);
    }
  }
  if (!Array.isArray(values)) values = [values];
  return uniqueWatchPartyValues_(values.map(function(item) {
    return cleanWatchPartyText_(item, 80);
  }).filter(Boolean));
}

function validateGameIdsForPublication_(gameIds, knownGameIds) {
  const normalized = normalizeGameIdsCandidate_(gameIds);
  const errors = [];
  if (!normalized.length) return ['missing_game_ids'];
  const known = knownGameIds ? new Set(Array.from(knownGameIds).map(String)) : null;
  normalized.forEach(function(gameId) {
    if (!isSafeWatchPartyCanonicalId_(gameId)) errors.push('invalid_game_id:' + gameId);
    else if (known && !known.has(gameId)) errors.push('unknown_game_id:' + gameId);
  });
  return errors;
}

function buildWatchPartyDiscoveryIdempotencyKey_(sourceKind, sourceRecordId) {
  const kind = normalizeWatchPartyEnum_(sourceKind);
  const recordId = cleanWatchPartyText_(sourceRecordId, 240);
  if (!validateWatchPartySourceKind_(kind)) throw watchPartyDiscoveryError_('invalid_source_kind');
  if (!recordId) throw watchPartyDiscoveryError_('missing_source_record_id');
  return 'wpd:' + kind + ':' + encodeURIComponent(recordId);
}

function resolveWatchPartyDiscoveryDelivery_(sourceKind, sourceRecordId, existingCandidates) {
  const idempotencyKey = buildWatchPartyDiscoveryIdempotencyKey_(sourceKind, sourceRecordId);
  const rows = Array.isArray(existingCandidates) ? existingCandidates : [];
  const matches = rows.filter(function(row) {
    return String(row && row.idempotency_key || '') === idempotencyKey;
  });
  if (matches.length > 1) {
    return {
      outcome: 'error',
      error: 'duplicate_idempotency_key',
      idempotency_key: idempotencyKey,
      discovery_id: ''
    };
  }
  if (matches.length === 1) {
    const discoveryId = String(matches[0].discovery_id || '');
    if (!isSafeWatchPartyCanonicalId_(discoveryId)) {
      return {
        outcome: 'error',
        error: 'invalid_existing_discovery_id',
        idempotency_key: idempotencyKey,
        discovery_id: ''
      };
    }
    return {
      outcome: 'return_existing',
      error: '',
      idempotency_key: idempotencyKey,
      discovery_id: discoveryId
    };
  }
  return {
    outcome: 'create_candidate',
    error: '',
    idempotency_key: idempotencyKey,
    discovery_id: ''
  };
}

function buildWatchPartyPublicationKey_(discoveryId, gameId) {
  const discovery = cleanWatchPartyText_(discoveryId, 80);
  const game = cleanWatchPartyText_(gameId, 80);
  if (!isSafeWatchPartyCanonicalId_(discovery)) throw watchPartyDiscoveryError_('invalid_discovery_id');
  if (!isSafeWatchPartyCanonicalId_(game)) throw watchPartyDiscoveryError_('invalid_game_id');
  return 'wpp:' + discovery + ':' + game;
}

function validateWatchPartyCanonicalDiscoveryFields_(row, options) {
  const settings = options || {};
  const discoveryId = cleanWatchPartyText_(row && row.discovery_id, 80);
  const publicationKey = cleanWatchPartyText_(row && row.publication_key, 240);
  const gameId = cleanWatchPartyText_(row && row.game_id, 80);
  const sourceType = normalizeWatchPartyEnum_(row && row.source_type);
  const errors = [];

  if (!discoveryId && !publicationKey) {
    if (settings.requireDiscoveryProcessed && sourceType !== 'cgb_added') {
      errors.push('missing_discovery_id');
      errors.push('missing_publication_key');
    }
    return errors;
  }
  if (!isSafeWatchPartyCanonicalId_(discoveryId)) errors.push('invalid_discovery_id');
  if (!isSafeWatchPartyCanonicalId_(gameId)) errors.push('invalid_game_id');
  if (!publicationKey) errors.push('missing_publication_key');
  if (isSafeWatchPartyCanonicalId_(discoveryId) && isSafeWatchPartyCanonicalId_(gameId) && publicationKey) {
    if (publicationKey !== buildWatchPartyPublicationKey_(discoveryId, gameId)) {
      errors.push('invalid_publication_key');
    }
  }
  return errors;
}

function canTransitionWatchPartyCandidateStatus_(fromStatus, toStatus) {
  const from = normalizeWatchPartyEnum_(fromStatus);
  const to = normalizeWatchPartyEnum_(toStatus);
  const allowed = CGB_WATCH_PARTY_STATUS_TRANSITIONS[from] || [];
  return allowed.indexOf(to) >= 0;
}

function requireWatchPartyCandidateStatusTransition_(fromStatus, toStatus) {
  if (!canTransitionWatchPartyCandidateStatus_(fromStatus, toStatus)) {
    throw watchPartyDiscoveryError_('invalid_status_transition');
  }
  return normalizeWatchPartyEnum_(toStatus);
}

function resolveTrustedWatchPartyVenue_(candidate, existingVenues, context) {
  const venues = Array.isArray(existingVenues) ? existingVenues : [];
  const details = context || {};
  const sourceKind = normalizeWatchPartyEnum_(candidate && candidate.source_kind);
  const unresolvedStatus = isPrivateWatchPartySourceKind_(sourceKind)
    ? 'needs_research'
    : 'needs_venue_resolution';

  const submittedVenueId = cleanWatchPartyText_(candidate && candidate.venue_id_candidate, 80);
  if (submittedVenueId) {
    const submittedMatches = venues.filter(function(venue) {
      return String(venue && venue.venue_id) === submittedVenueId && isUsableWatchPartyVenue_(venue);
    });
    if (submittedMatches.length === 1) return existingVenueResolution_(submittedMatches[0], 'submitted_venue_id');
    if (submittedMatches.length > 1) return unresolvedVenueResolution_('needs_research', 'duplicate_submitted_venue_id');
  }

  const trustedPlace = normalizeTrustedWatchPartyPlace_(details.trustedPlace || {});
  const trustedSource = trustedPlace.source || normalizeWatchPartyEnum_(candidate && candidate.trusted_place_source);
  const trustedPlaceId = trustedPlace.placeId || cleanWatchPartyText_(candidate && candidate.trusted_place_id, 200);
  if (trustedSource && trustedPlaceId &&
      CGB_WATCH_PARTY_TRUSTED_PLACE_SOURCES.indexOf(trustedSource) >= 0) {
    const identityMatches = venues.filter(function(venue) {
      return isUsableWatchPartyVenue_(venue) &&
        normalizeWatchPartyEnum_(venue && venue.external_source) === trustedSource &&
        String(venue && venue.external_place_id || '') === trustedPlaceId;
    });
    if (identityMatches.length === 1) return existingVenueResolution_(identityMatches[0], 'trusted_place_identity');
    if (identityMatches.length > 1) return unresolvedVenueResolution_('needs_research', 'ambiguous_trusted_place_identity');
  }

  const submittedAddress = details.submittedAddress || null;
  const normalizedAddress = completeNormalizedWatchPartyAddress_(submittedAddress) ||
    completeNormalizedWatchPartyAddress_(trustedPlace);
  if (normalizedAddress) {
    const addressMatches = venues.filter(function(venue) {
      return isUsableWatchPartyVenue_(venue) &&
        completeNormalizedWatchPartyAddress_(venue) === normalizedAddress;
    });
    if (addressMatches.length === 1) return existingVenueResolution_(addressMatches[0], 'unique_normalized_address');
    if (addressMatches.length > 1) return unresolvedVenueResolution_('needs_venue_resolution', 'ambiguous_normalized_address');
  }

  if (isEligibleTrustedWatchPartyPlace_(trustedPlace)) {
    const proposedVenue = buildProposedWatchPartyVenue_(trustedPlace);
    if (isPrivateWatchPartySourceKind_(sourceKind) && !details.allowPrivateSourcePublication) {
      return {
        decision: 'retain_private',
        candidate_status: 'needs_research',
        reason: 'private_source_requires_review',
        resolved_venue_id: '',
        proposed_venue: proposedVenue
      };
    }
    return {
      decision: 'propose_new_community_location',
      candidate_status: 'ready_to_publish',
      reason: 'complete_trusted_structured_place',
      resolved_venue_id: '',
      proposed_venue: proposedVenue
    };
  }

  return unresolvedVenueResolution_(unresolvedStatus,
    trustedSource || trustedPlaceId ? 'incomplete_or_untrusted_structured_place' : 'venue_resolution_required');
}

function planWatchPartyPublication_(candidate, canonicalRows) {
  const gameIds = normalizeGameIdsCandidate_(candidate && candidate.game_ids_candidate);
  const rows = Array.isArray(canonicalRows) ? canonicalRows : [];
  if (!gameIds.length) {
    return {
      outcome: 'needs_research',
      candidate_status: 'needs_research',
      existing_watch_party_ids: [],
      missing_game_ids: [],
      duplicate_game_ids: [],
      invalid_game_ids: [],
      cache_invalidation_permitted: false
    };
  }

  const existingIds = [];
  const missing = [];
  const duplicates = [];
  const invalid = [];
  gameIds.forEach(function(gameId) {
    const publicationKey = buildWatchPartyPublicationKey_(candidate.discovery_id, gameId);
    const matches = rows.filter(function(row) { return String(row && row.publication_key || '') === publicationKey; });
    if (matches.length > 1) duplicates.push(gameId);
    else if (matches.length === 1) {
      const watchPartyId = String(matches[0].watch_party_id || '');
      if (!isSafeWatchPartyCanonicalId_(watchPartyId)) invalid.push(gameId);
      else existingIds.push(watchPartyId);
    } else missing.push(gameId);
  });

  if (duplicates.length || invalid.length || uniqueWatchPartyValues_(existingIds).length !== existingIds.length) {
    return {
      outcome: 'error',
      candidate_status: 'error',
      existing_watch_party_ids: uniqueWatchPartyValues_(existingIds),
      missing_game_ids: missing,
      duplicate_game_ids: duplicates,
      invalid_game_ids: invalid,
      cache_invalidation_permitted: false
    };
  }
  if (!missing.length) {
    return {
      outcome: 'return_existing',
      candidate_status: 'published',
      existing_watch_party_ids: uniqueWatchPartyValues_(existingIds),
      missing_game_ids: [],
      duplicate_game_ids: [],
      invalid_game_ids: [],
      cache_invalidation_permitted: true
    };
  }
  return {
    outcome: existingIds.length ? 'create_missing' : 'create_all',
    candidate_status: existingIds.length ? 'partial_failure' : 'ready_to_publish',
    existing_watch_party_ids: uniqueWatchPartyValues_(existingIds),
    missing_game_ids: missing,
    duplicate_game_ids: [],
    invalid_game_ids: [],
    cache_invalidation_permitted: false
  };
}

function decideWatchPartyStatusRepair_(candidate, canonicalRows) {
  const plan = planWatchPartyPublication_(candidate, canonicalRows);
  if (plan.outcome === 'return_existing') {
    return { candidate_status: 'published', raw_processing_status: 'processed', plan: plan };
  }
  if (plan.outcome === 'create_missing') {
    return { candidate_status: 'partial_failure', raw_processing_status: 'partial_failure', plan: plan };
  }
  if (plan.outcome === 'needs_research') {
    return { candidate_status: 'needs_research', raw_processing_status: 'needs_research', plan: plan };
  }
  if (plan.outcome === 'error') {
    return { candidate_status: 'error', raw_processing_status: 'error', plan: plan };
  }
  return { candidate_status: 'ready_to_publish', raw_processing_status: 'discovery_created', plan: plan };
}

function isWatchPartyCacheInvalidationPermitted_(publicationPlan) {
  return Boolean(publicationPlan && publicationPlan.cache_invalidation_permitted &&
    publicationPlan.missing_game_ids && publicationPlan.missing_game_ids.length === 0 &&
    publicationPlan.duplicate_game_ids && publicationPlan.duplicate_game_ids.length === 0 &&
    publicationPlan.invalid_game_ids && publicationPlan.invalid_game_ids.length === 0);
}

function normalizeTrustedWatchPartyPlace_(place) {
  const source = normalizeWatchPartyEnum_(place && (place.source || place.external_source));
  const countryCode = cleanWatchPartyText_(place && (place.countryCode || place.country_code), 2).toUpperCase();
  return {
    verified: place && place.verified === true,
    source: source,
    placeId: cleanWatchPartyText_(place && (place.placeId || place.external_place_id), 200),
    name: cleanWatchPartyText_(place && place.name, 180),
    addressLine1: cleanWatchPartyText_(place && (place.addressLine1 || place.address_line_1), 220),
    addressLine2: cleanWatchPartyText_(place && (place.addressLine2 || place.address_line_2), 120),
    city: cleanWatchPartyText_(place && place.city, 140),
    region: cleanWatchPartyText_(place && place.region, 140),
    postalCode: cleanWatchPartyText_(place && (place.postalCode || place.postal_code), 32),
    countryCode: countryCode,
    latitude: normalizeWatchPartyCoordinate_(place && place.latitude),
    longitude: normalizeWatchPartyCoordinate_(place && place.longitude)
  };
}

function buildProposedWatchPartyVenue_(trustedPlace) {
  return {
    name: trustedPlace.name,
    address_line_1: trustedPlace.addressLine1,
    address_line_2: trustedPlace.addressLine2,
    city: trustedPlace.city,
    region: trustedPlace.region,
    postal_code: trustedPlace.postalCode,
    country_code: trustedPlace.countryCode,
    latitude: trustedPlace.latitude,
    longitude: trustedPlace.longitude,
    external_source: trustedPlace.source,
    external_place_id: trustedPlace.placeId,
    venue_type: 'community_location',
    verification_status: 'user_added',
    publication_status: 'published'
  };
}

function normalizeWatchPartyCoordinate_(value) {
  if (value === null || value === undefined || String(value).trim() === '') return NaN;
  return Number(value);
}

function isEligibleTrustedWatchPartyPlace_(place) {
  return Boolean(place && place.verified === true &&
    CGB_WATCH_PARTY_TRUSTED_PLACE_SOURCES.indexOf(place.source) >= 0 &&
    /^[A-Za-z0-9._:-]{1,200}$/.test(place.placeId) && place.name &&
    completeNormalizedWatchPartyAddress_(place) && validWatchPartyCoordinates_(place));
}

function completeNormalizedWatchPartyAddress_(value) {
  if (!value) return '';
  const countryCode = cleanWatchPartyText_(value.countryCode || value.country_code, 2).toUpperCase();
  const addressLine1 = cleanWatchPartyText_(value.addressLine1 || value.address_line_1, 220);
  const city = cleanWatchPartyText_(value.city, 140);
  const region = cleanWatchPartyText_(value.region, 140);
  const postalCode = cleanWatchPartyText_(value.postalCode || value.postal_code, 32);
  if (!addressLine1 || !city || !region || !/^[A-Z]{2}$/.test(countryCode)) return '';
  if ((countryCode === 'US' || countryCode === 'CA') && !postalCode) return '';
  return normalizeWatchPartyComparableText_([
    addressLine1,
    value.addressLine2 || value.address_line_2,
    city,
    normalizeWatchPartyRegion_(region, countryCode),
    postalCode,
    countryCode
  ].filter(Boolean).join(' '));
}

function normalizeWatchPartyRegion_(region, countryCode) {
  const normalized = normalizeWatchPartyComparableText_(region);
  if (String(countryCode).toUpperCase() !== 'US') return normalized;
  const regionCodes = {
    alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
    colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga',
    hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks',
    kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md', massachusetts: 'ma',
    michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo', montana: 'mt',
    nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
    'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd',
    ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri',
    'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn', texas: 'tx',
    utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa',
    'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy', 'district of columbia': 'dc'
  };
  return /^[a-z]{2}$/.test(normalized) ? normalized : (regionCodes[normalized] || normalized);
}

function normalizeWatchPartyComparableText_(value) {
  let text = cleanWatchPartyText_(value, 800);
  try { text = text.normalize('NFKD'); } catch (_) {}
  return text
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave')
    .replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(suite)\b/g, 'ste')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isUsableWatchPartyVenue_(venue) {
  return Boolean(venue && isSafeWatchPartyCanonicalId_(String(venue.venue_id || '')) &&
    venue.publication_status === 'published' && validWatchPartyCoordinates_(venue));
}

function validWatchPartyCoordinates_(value) {
  const latitude = Number(value && value.latitude);
  const longitude = Number(value && value.longitude);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function existingVenueResolution_(venue, reason) {
  return {
    decision: 'use_existing_venue',
    candidate_status: 'ready_to_publish',
    reason: reason,
    resolved_venue_id: String(venue.venue_id),
    proposed_venue: null
  };
}

function unresolvedVenueResolution_(status, reason) {
  return {
    decision: 'retain_private',
    candidate_status: status,
    reason: reason,
    resolved_venue_id: '',
    proposed_venue: null
  };
}

function isValidWatchPartyHttpUrl_(value) {
  const text = cleanWatchPartyText_(value, 2000);
  const match = text.match(/^https?:\/\/([^/?#]+)(?:[/?#].*)?$/i);
  if (!match || /\s/.test(text) || match[1].indexOf('@') >= 0) return false;
  return match[1].replace(/:\d+$/, '').length > 0;
}

function isValidWatchPartyDatetime_(value) {
  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp);
}

function normalizeJsonListField_(value) {
  if (value === '' || value === null || value === undefined) return '';
  return JSON.stringify(normalizeGameIdsCandidate_(value));
}

function normalizeAttemptCount_(value) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function isPrivateWatchPartySourceKind_(sourceKind) {
  return ['research', 'import', 'demo'].indexOf(normalizeWatchPartyEnum_(sourceKind)) >= 0;
}

function normalizeWatchPartyEnum_(value) {
  return cleanWatchPartyText_(value, 80).toLowerCase();
}

function cleanWatchPartyText_(value, maximum) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum || 300);
}

function isSafeWatchPartyCanonicalId_(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,80}$/.test(value);
}

function uniqueWatchPartyValues_(values) {
  const seen = Object.create(null);
  return values.filter(function(value) {
    const key = String(value);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function processWatchPartyFormSubmission_(event) {
  const parsed = parseWatchPartyFormSubmission_(event);
  const lock = LockService.getScriptLock();
  lock.waitLock(CGB_WATCH_PARTY_FORM_LOCK_TIMEOUT_MS);
  try {
    const workbook = getWorkbook_();
    const rawSheet = getRequiredSheet_(workbook, 'Watch_Party_Submissions_Raw');
    const discoverySheet = getRequiredSheet_(workbook, 'Watch_Party_Discovery');
    const partySheet = getRequiredSheet_(workbook, 'Watch_Parties');
    const venueSheet = getRequiredSheet_(workbook, 'Venues');
    const gameSheet = getRequiredSheet_(workbook, 'Games');

    const rawTable = readSheetTable_(rawSheet);
    const discoveryTable = readSheetTable_(discoverySheet);
    const partyTable = readSheetTable_(partySheet);
    const venueTable = readSheetTable_(venueSheet);
    const gameTable = readSheetTable_(gameSheet);

    requireHeaders_(rawTable.headers, CGB_TABS.Watch_Party_Submissions_Raw, 'Watch_Party_Submissions_Raw');
    requireHeaders_(discoveryTable.headers, CGB_WATCH_PARTY_DISCOVERY_HEADERS, 'Watch_Party_Discovery');
    requireHeaders_(partyTable.headers, CGB_TABS.Watch_Parties, 'Watch_Parties');
    requireHeaders_(venueTable.headers, CGB_TABS.Venues, 'Venues');
    requireHeaders_(gameTable.headers, CGB_TABS.Games, 'Games');

    const now = new Date().toISOString();
    const existingRaw = findSheetRecordByValue_(rawTable.rows, 'submission_id', parsed.submission_id);
    const existingDiscovery = findSheetRecordByValue_(discoveryTable.rows, 'idempotency_key', parsed.idempotency_key);
    const existingDiscoveryByRaw = existingRaw && existingRaw.object.discovery_id
      ? findSheetRecordByValue_(discoveryTable.rows, 'discovery_id', existingRaw.object.discovery_id)
      : null;
    let discoveryRecord = existingDiscovery || existingDiscoveryByRaw || null;

    let rawRecord = existingRaw;
    let discoveryId = discoveryRecord ? String(discoveryRecord.object.discovery_id || '') : '';
    let discoveryCandidate = discoveryRecord ? discoveryRecord.object : null;
    let rawProcessingStatus = existingRaw ? String(existingRaw.object.processing_status || 'new') : 'new';
    let rawProcessingError = existingRaw ? String(existingRaw.object.processing_error || '') : '';
    let createdWatchPartyIds = existingRaw ? normalizeJsonListField_(existingRaw.object.created_watch_party_ids) : '';
    let createdVenueId = existingRaw ? String(existingRaw.object.created_venue_id || '') : '';
    let processedAt = existingRaw ? String(existingRaw.object.processed_at || '') : '';
    let createdRows = [];

    if (!rawRecord) {
      rawRecord = appendWatchPartySheetRecord_(rawSheet, rawTable.headers, buildWatchPartyRawRow_(parsed, now));
      rawTable.rows.push(rawRecord);
      rawTable.headers = rawTable.headers.slice();
      rawProcessingStatus = 'new';
      rawProcessingError = '';
    }

    if (!discoveryRecord) {
      const candidate = normalizeWatchPartyCandidate_({
        discovery_id: '',
        idempotency_key: parsed.idempotency_key,
        source_kind: 'form_submission',
        source_record_id: parsed.submission_id,
        source_url: parsed.source_url || '',
        source_label: parsed.source_label || 'Google Form submission',
        raw_submission_id: parsed.submission_id,
        venue_id_candidate: parsed.venue_id_submitted || '',
        venue_name_candidate: parsed.venue_name_submitted || '',
        address_candidate: parsed.address_submitted || '',
        trusted_place_source: '',
        trusted_place_id: '',
        resolved_venue_id: '',
        game_ids_candidate: parsed.game_ids_submitted || '',
        organizer_name_candidate: parsed.organizer_name || '',
        organizer_type_candidate: parsed.organizer_type || '',
        official_event_url_candidate: parsed.official_event_url || '',
        event_start_candidate: parsed.event_start_information || '',
        age_policy_candidate: parsed.age_policy || '',
        sound_status_candidate: parsed.sound_status || '',
        restrictions_note_candidate: parsed.restrictions_note || '',
        game_day_note_candidate: parsed.game_day_note || '',
        candidate_status: 'new',
        validation_errors: [],
        research_note: '',
        created_watch_party_ids: [],
        created_venue_id: '',
        last_error: '',
        attempt_count: 0,
        created_at: now,
        updated_at: now,
        published_at: ''
      });
      discoveryId = createWatchPartyDiscoveryId_(parsed.idempotency_key);
      candidate.discovery_id = discoveryId;
      candidate.idempotency_key = parsed.idempotency_key;
      candidate.raw_submission_id = parsed.submission_id;
      candidate.candidate_status = 'new';
      discoveryRecord = appendWatchPartySheetRecord_(discoverySheet, discoveryTable.headers, candidate);
      discoveryTable.rows.push(discoveryRecord);
      discoveryCandidate = discoveryRecord.object;
      updateWatchPartySheetRecord_(discoverySheet, discoveryTable.headers, discoveryRecord, {
        discovery_id: discoveryId,
        idempotency_key: parsed.idempotency_key,
        source_kind: 'form_submission',
        source_record_id: parsed.submission_id,
        source_url: parsed.source_url || '',
        source_label: parsed.source_label || 'Google Form submission',
        raw_submission_id: parsed.submission_id,
        venue_id_candidate: parsed.venue_id_submitted || '',
        venue_name_candidate: parsed.venue_name_submitted || '',
        address_candidate: parsed.address_submitted || '',
        trusted_place_source: '',
        trusted_place_id: '',
        resolved_venue_id: '',
        game_ids_candidate: parsed.game_ids_submitted || '',
        organizer_name_candidate: parsed.organizer_name || '',
        organizer_type_candidate: parsed.organizer_type || '',
        official_event_url_candidate: parsed.official_event_url || '',
        event_start_candidate: parsed.event_start_information || '',
        age_policy_candidate: parsed.age_policy || '',
        sound_status_candidate: parsed.sound_status || '',
        restrictions_note_candidate: parsed.restrictions_note || '',
        game_day_note_candidate: parsed.game_day_note || '',
        candidate_status: 'new',
        validation_errors: '[]',
        research_note: '',
        created_watch_party_ids: '[]',
        created_venue_id: '',
        last_error: '',
        attempt_count: 1,
        created_at: now,
        updated_at: now,
        published_at: ''
      });
    } else {
      discoveryId = String(discoveryRecord.object.discovery_id || '');
      discoveryCandidate = discoveryRecord.object;
    }

    const candidate = normalizeWatchPartyCandidate_({
      discovery_id: discoveryId,
      idempotency_key: parsed.idempotency_key,
      source_kind: 'form_submission',
      source_record_id: parsed.submission_id,
      source_url: parsed.source_url || '',
      source_label: parsed.source_label || 'Google Form submission',
      raw_submission_id: parsed.submission_id,
      venue_id_candidate: parsed.venue_id_submitted || '',
      venue_name_candidate: parsed.venue_name_submitted || '',
      address_candidate: parsed.address_submitted || '',
      trusted_place_source: '',
      trusted_place_id: '',
      resolved_venue_id: discoveryCandidate && discoveryCandidate.resolved_venue_id ? String(discoveryCandidate.resolved_venue_id) : '',
      game_ids_candidate: parsed.game_ids_submitted || '',
      organizer_name_candidate: parsed.organizer_name || '',
      organizer_type_candidate: parsed.organizer_type || '',
      official_event_url_candidate: parsed.official_event_url || '',
      event_start_candidate: parsed.event_start_information || '',
      age_policy_candidate: parsed.age_policy || '',
      sound_status_candidate: parsed.sound_status || '',
      restrictions_note_candidate: parsed.restrictions_note || '',
      game_day_note_candidate: parsed.game_day_note || '',
      candidate_status: discoveryCandidate && discoveryCandidate.candidate_status ? String(discoveryCandidate.candidate_status) : 'new',
      validation_errors: discoveryCandidate && discoveryCandidate.validation_errors ? discoveryCandidate.validation_errors : [],
      research_note: discoveryCandidate && discoveryCandidate.research_note ? String(discoveryCandidate.research_note) : '',
      created_watch_party_ids: discoveryCandidate && discoveryCandidate.created_watch_party_ids ? discoveryCandidate.created_watch_party_ids : [],
      created_venue_id: discoveryCandidate && discoveryCandidate.created_venue_id ? String(discoveryCandidate.created_venue_id) : '',
      last_error: discoveryCandidate && discoveryCandidate.last_error ? String(discoveryCandidate.last_error) : '',
      attempt_count: discoveryCandidate && discoveryCandidate.attempt_count ? Number(discoveryCandidate.attempt_count || 0) : 0,
      created_at: discoveryCandidate && discoveryCandidate.created_at ? String(discoveryCandidate.created_at) : now,
      updated_at: now,
      published_at: discoveryCandidate && discoveryCandidate.published_at ? String(discoveryCandidate.published_at) : ''
    });

    const knownGameIds = gameTable.rows.map(function(record) { return String(record.object.game_id || ''); }).filter(Boolean);
    const gameIdSet = new Set(knownGameIds);
    const normalizedGameIds = normalizeGameIdsCandidate_(parsed.game_ids_submitted || '');
    const sourceType = resolveWatchPartyFormSourceType_(parsed.submitter_role);
    const organizerType = resolveWatchPartyOrganizerType_(parsed.organizer_type || parsed.submitter_role || 'unknown');
    const resolvedVenue = resolveTrustedWatchPartyVenue_(candidate, venueTable.rows.map(function(record) { return record.object; }), {
      submittedAddress: buildSubmittedWatchPartyAddress_(parsed),
      trustedPlace: null
    });

    let status = 'discovery_created';
    let validationErrors = [];
    let shouldPublish = false;
    let publicCacheCleared = false;

    if (!sourceType) {
      validationErrors.push('unknown_submitter_role');
    }
    if (!normalizedGameIds.length) {
      validationErrors.push('missing_game_ids');
    } else {
      normalizedGameIds.forEach(function(gameId) {
        if (!gameIdSet.has(gameId)) validationErrors.push('unknown_game_id:' + gameId);
      });
    }
    if (!cleanWatchPartyText_(parsed.organizer_name, 180)) {
      validationErrors.push('missing_organizer_name');
    }
    if (sourceType === 'cgb_added' && parsed.submitter_role !== 'cgb' && parsed.submitter_role !== 'staff' && parsed.submitter_role !== 'owner' && parsed.submitter_role !== 'admin') {
      validationErrors.push('invalid_cgb_submission_context');
    }

    if (resolvedVenue && resolvedVenue.decision === 'use_existing_venue' && resolvedVenue.resolved_venue_id) {
      candidate.resolved_venue_id = resolvedVenue.resolved_venue_id;
    } else if (resolvedVenue && resolvedVenue.decision === 'propose_new_community_location') {
      validationErrors.push('trusted_place_required_for_new_venue');
    } else if (!resolvedVenue || resolvedVenue.decision === 'retain_private') {
      validationErrors.push('venue_resolution_required');
    }

    if (validationErrors.length) {
      status = 'needs_research';
      candidate.candidate_status = 'needs_research';
      candidate.validation_errors = validationErrors;
      candidate.last_error = validationErrors.join(';');
    } else {
      candidate.candidate_status = 'ready_to_publish';
      candidate.resolved_venue_id = resolvedVenue.resolved_venue_id;
      candidate.validation_errors = [];
      candidate.last_error = '';
      shouldPublish = true;
    }

    const plan = shouldPublish
      ? planWatchPartyPublication_(candidate, partyTable.rows.map(function(record) { return record.object; }))
      : { outcome: 'needs_research', candidate_status: 'needs_research', existing_watch_party_ids: [], missing_game_ids: normalizedGameIds.slice(), duplicate_game_ids: [], invalid_game_ids: [], cache_invalidation_permitted: false };

    let rawStatus = status;
    let discoveryStatus = candidate.candidate_status;
    let processingError = '';
    let createdIds = [];
    let createdVenueIdValue = '';

    if (shouldPublish && plan.outcome === 'return_existing') {
      rawStatus = 'processed';
      discoveryStatus = 'published';
      processingError = '';
      createdIds = uniqueWatchPartyValues_(plan.existing_watch_party_ids || []);
      shouldPublish = false;
      publicCacheCleared = true;
    } else if (shouldPublish && (plan.outcome === 'create_all' || plan.outcome === 'create_missing')) {
      const intendedGames = plan.outcome === 'create_missing' ? plan.missing_game_ids : normalizedGameIds;
      const pendingGames = intendedGames.filter(function(gameId) {
        return !plan.existing_watch_party_ids || plan.existing_watch_party_ids.indexOf(gameId) < 0;
      });
      const created = [];
      pendingGames.forEach(function(gameId) {
        const publicationKey = buildWatchPartyPublicationKey_(discoveryId, gameId);
        const watchPartyId = buildWatchPartyCanonicalId_(publicationKey);
        const watchPartyRecord = appendWatchPartySheetRecord_(partySheet, partyTable.headers, buildWatchPartyCanonicalRow_(discoveryId, publicationKey, watchPartyId, parsed, sourceType, organizerType, gameId, candidate.resolved_venue_id, now));
        partyTable.rows.push(watchPartyRecord);
        created.push(watchPartyId);
        createdRows.push(watchPartyRecord);
      });
      createdIds = created;
      if (plan.outcome === 'create_missing' && plan.missing_game_ids.length && created.length) {
        rawStatus = 'partial_failure';
        discoveryStatus = 'partial_failure';
        processingError = 'partial_publication';
      } else {
        rawStatus = 'processed';
        discoveryStatus = 'published';
        processingError = '';
        publicCacheCleared = true;
        createdRows.forEach(function(record) {
          updateWatchPartySheetRecord_(partySheet, partyTable.headers, record, {
            publication_status: 'published',
            event_status: 'active',
            updated_at: now
          });
        });
      }
    } else {
      rawStatus = status;
      discoveryStatus = candidate.candidate_status;
      processingError = validationErrors.join(';') || '';
    }

    candidate.candidate_status = discoveryStatus;
    candidate.validation_errors = validationErrors;
    candidate.last_error = processingError || candidate.last_error || '';
    if (createdIds.length) candidate.created_watch_party_ids = createdIds;
    if (createdVenueIdValue) candidate.created_venue_id = createdVenueIdValue;
    candidate.updated_at = now;
    if (rawStatus === 'processed' || rawStatus === 'partial_failure' || rawStatus === 'needs_research' || rawStatus === 'error') {
      candidate.published_at = rawStatus === 'processed' ? now : '';
    }
    updateWatchPartySheetRecord_(discoverySheet, discoveryTable.headers, discoveryRecord, {
      discovery_id: discoveryId,
      idempotency_key: parsed.idempotency_key,
      source_kind: 'form_submission',
      source_record_id: parsed.submission_id,
      source_url: parsed.source_url || '',
      source_label: parsed.source_label || 'Google Form submission',
      raw_submission_id: parsed.submission_id,
      venue_id_candidate: parsed.venue_id_submitted || '',
      venue_name_candidate: parsed.venue_name_submitted || '',
      address_candidate: parsed.address_submitted || '',
      trusted_place_source: '',
      trusted_place_id: '',
      resolved_venue_id: candidate.resolved_venue_id || '',
      game_ids_candidate: parsed.game_ids_submitted || '',
      organizer_name_candidate: parsed.organizer_name || '',
      organizer_type_candidate: organizerType,
      official_event_url_candidate: parsed.official_event_url || '',
      event_start_candidate: parsed.event_start_information || '',
      age_policy_candidate: parsed.age_policy || '',
      sound_status_candidate: parsed.sound_status || '',
      restrictions_note_candidate: parsed.restrictions_note || '',
      game_day_note_candidate: parsed.game_day_note || '',
      candidate_status: candidate.candidate_status,
      validation_errors: JSON.stringify(candidate.validation_errors || []),
      research_note: candidate.research_note || '',
      created_watch_party_ids: JSON.stringify(candidate.created_watch_party_ids || []),
      created_venue_id: candidate.created_venue_id || '',
      last_error: candidate.last_error || '',
      attempt_count: Number(candidate.attempt_count || 0) + 1,
      created_at: discoveryRecord.object.created_at || now,
      updated_at: now,
      published_at: candidate.published_at || ''
    });

    updateWatchPartySheetRecord_(rawSheet, rawTable.headers, rawRecord, {
      submission_id: parsed.submission_id,
      processing_status: rawStatus,
      discovery_id: discoveryId,
      created_watch_party_ids: JSON.stringify(createdIds),
      created_venue_id: createdVenueIdValue || '',
      processing_error: processingError || '',
      processed_at: rawStatus === 'processed' ? now : (rawRecord.object.processed_at || '')
    });

    if (publicCacheCleared) invalidatePublicSnapshotCache_();

    return {
      ok: true,
      processing_status: rawStatus,
      discovery_id: discoveryId,
      created_watch_party_ids: createdIds,
      source_type: sourceType,
      schemaVersion: CGB_SCHEMA_VERSION
    };
  } finally {
    lock.releaseLock();
  }
}

function parseWatchPartyFormSubmission_(event) {
  if (!event || !event.range || !event.range.getSheet || !event.range.getRow) {
    throw watchPartyDiscoveryError_('invalid_form_event');
  }
  const sheetName = String(event.range.getSheet().getName() || '').trim();
  if (sheetName !== 'Watch_Party_Submissions_Raw') {
    throw watchPartyDiscoveryError_('invalid_form_event');
  }
  const rowNumber = Number(event.range.getRow());
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    throw watchPartyDiscoveryError_('invalid_form_event');
  }
  const namedValues = event.namedValues || {};
  const missing = [];
  const ambiguous = [];
  const resolved = {};
  CGB_WATCH_PARTY_FORM_REQUIRED_FIELDS.forEach(function(field) {
    const matches = resolveWatchPartyFormHeaderMatches_(namedValues, field);
    if (matches.length === 0) missing.push(field);
    else if (matches.length > 1) ambiguous.push(field);
    else resolved[field] = firstWatchPartyFormValue_(namedValues[matches[0]]);
  });
  if (missing.length || ambiguous.length) {
    throw watchPartyDiscoveryError_('missing_form_headers');
  }

  const responseTimestamp = resolved.response_timestamp || '';
  const submitterRole = cleanWatchPartyText_(resolved.submitter_role, 80).toLowerCase();
  const organizerName = cleanWatchPartyText_(resolved.organizer_name, 180);
  const gameIds = normalizeGameIdsCandidate_(resolved.game_ids_submitted || '').join(',');

  return {
    submission_id: buildWatchPartySubmissionId_(event, responseTimestamp, rowNumber),
    idempotency_key: buildWatchPartyDiscoveryIdempotencyKey_('form_submission', buildWatchPartySubmissionId_(event, responseTimestamp, rowNumber)),
    source_url: '',
    source_label: 'Google Form submission',
    response_timestamp: responseTimestamp,
    submitter_role: submitterRole,
    organizer_name: organizerName,
    organizer_type: resolveWatchPartyOrganizerType_(submitterRole),
    venue_id_submitted: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'venue_id_submitted'), 80),
    venue_name_submitted: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'venue_name_submitted'), 180),
    address_submitted: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'address_submitted'), 600),
    game_ids_submitted: gameIds,
    official_event_url: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'official_event_url'), 2000),
    event_start_information: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'event_start_information'), 120),
    age_policy: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'age_policy'), 80),
    sound_status: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'sound_status'), 80),
    restrictions_note: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'restrictions_note'), 1200),
    game_day_note: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'game_day_note'), 1200),
    submitter_name: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'submitter_name'), 180),
    submitter_email: cleanWatchPartyText_(resolveWatchPartyFormHeaderValue_(namedValues, 'submitter_email'), 200)
  };
}

function resolveWatchPartyFormHeaderMatches_(namedValues, field) {
  const available = Object.keys(namedValues || {}) || [];
  const normalized = available.map(function(header) { return String(header).trim(); });
  const labels = [CGB_WATCH_PARTY_FORM_HEADER_LABELS[field] || ''];
  const aliases = [field, labels[0]].filter(Boolean).map(function(value) { return String(value).trim(); });
  return normalized.filter(function(header) {
    return aliases.some(function(alias) {
      return String(header).toLowerCase() === String(alias).toLowerCase();
    });
  });
}

function resolveWatchPartyFormHeaderValue_(namedValues, field) {
  const matches = resolveWatchPartyFormHeaderMatches_(namedValues, field);
  if (!matches.length) return '';
  return firstWatchPartyFormValue_(namedValues[matches[0]]);
}

function firstWatchPartyFormValue_(value) {
  if (Array.isArray(value)) return String(value[0] === null || value[0] === undefined ? '' : value[0]);
  return String(value === null || value === undefined ? '' : value);
}

function buildWatchPartySubmissionId_(event, responseTimestamp, rowNumber) {
  const timestamp = String(responseTimestamp || '').trim();
  const row = String(rowNumber || '').trim();
  const source = [row, timestamp].join(':');
  return 'sub_' + hashWatchPartyText_(source);
}

function createWatchPartyDiscoveryId_(idempotencyKey) {
  return 'wpd_' + hashWatchPartyText_(String(idempotencyKey || ''));
}

function buildWatchPartyCanonicalId_(publicationKey) {
  return 'wp_' + hashWatchPartyText_(String(publicationKey || ''));
}

function hashWatchPartyText_(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function resolveWatchPartyFormSourceType_(role) {
  const normalized = cleanWatchPartyText_(role, 80).toLowerCase();
  return CGB_WATCH_PARTY_FORM_SOURCE_TYPE_MAP[normalized] || '';
}

function resolveWatchPartyOrganizerType_(role) {
  const normalized = cleanWatchPartyText_(role, 80).toLowerCase();
  return CGB_WATCH_PARTY_FORM_ORGANIZER_TYPE_MAP[normalized] || 'unknown';
}

function buildSubmittedWatchPartyAddress_(parsed) {
  if (!parsed || !parsed.address_submitted) return null;
  const parts = String(parsed.address_submitted || '').split(/[,;]/).map(function(item) {
    return cleanWatchPartyText_(item, 220);
  }).filter(Boolean);
  return {
    addressLine1: parts[0] || '',
    city: parts[1] || '',
    region: parts[2] || '',
    postalCode: '',
    countryCode: 'US'
  };
}

function buildWatchPartyRawRow_(parsed, timestamp) {
  return {
    response_timestamp: parsed.response_timestamp || timestamp,
    submission_id: parsed.submission_id,
    venue_id: parsed.venue_id_submitted || '',
    venue_name_submitted: parsed.venue_name_submitted || '',
    address_submitted: parsed.address_submitted || '',
    game_ids_submitted: parsed.game_ids_submitted || '',
    organizer_name: parsed.organizer_name || '',
    organizer_type: parsed.organizer_type || '',
    official_event_url: parsed.official_event_url || '',
    event_start_information: parsed.event_start_information || '',
    age_policy: parsed.age_policy || '',
    sound_status: parsed.sound_status || '',
    restrictions_note: parsed.restrictions_note || '',
    game_day_note: parsed.game_day_note || '',
    submitter_role: parsed.submitter_role || '',
    submitter_name: parsed.submitter_name || '',
    submitter_email: parsed.submitter_email || '',
    processing_status: 'new',
    created_watch_party_ids: '[]',
    created_venue_id: '',
    processing_error: '',
    processed_at: '',
    discovery_id: ''
  };
}

function buildWatchPartyCanonicalRow_(discoveryId, publicationKey, watchPartyId, parsed, sourceType, organizerType, gameId, resolvedVenueId, timestamp) {
  return {
    watch_party_id: watchPartyId,
    venue_id: resolvedVenueId || '',
    game_id: gameId,
    organizer_name: parsed.organizer_name || '',
    organizer_type: organizerType || 'unknown',
    official_event_url: parsed.official_event_url || '',
    source_type: sourceType || 'fan_submitted',
    event_start_at: parsed.event_start_information || '',
    age_policy: parsed.age_policy || '',
    sound_status: parsed.sound_status || '',
    restrictions_note: parsed.restrictions_note || '',
    game_day_note: parsed.game_day_note || '',
    event_status: 'inactive',
    publication_status: 'draft',
    source_submission_id: parsed.submission_id,
    discovery_id: discoveryId,
    publication_key: publicationKey,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function getRequiredSheet_(workbook, tabName) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet) throw new Error('Missing required tab: ' + tabName);
  return sheet;
}

function readSheetTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0].map(function(value) { return String(value).trim(); }) : [];
  const rows = values.slice(1).map(function(valuesRow, index) {
    const object = {};
    headers.forEach(function(header, columnIndex) {
      object[header] = normalizeCellValue_(valuesRow[columnIndex]);
    });
    return { rowNumber: index + 2, values: valuesRow.slice(), object: object };
  }).filter(function(record) {
    return record.values.some(function(value) { return value !== '' && value !== null; });
  });
  return { headers: headers, rows: rows };
}

function normalizeCellValue_(value) {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? '' : value;
}

function appendWatchPartySheetRecord_(sheet, headers, object) {
  const rowNumber = sheet.getLastRow() + 1;
  const values = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '';
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  return { rowNumber: rowNumber, values: values.slice(), object: object };
}

function updateWatchPartySheetRecord_(sheet, headers, record, changes) {
  const values = record.values.slice();
  Object.keys(changes).forEach(function(field) {
    const index = headers.indexOf(field);
    if (index < 0) return;
    values[index] = changes[field];
    record.object[field] = changes[field];
  });
  sheet.getRange(record.rowNumber, 1, 1, headers.length).setValues([values]);
  record.values = values;
  return record;
}

function findSheetRecordByValue_(rows, field, value) {
  const target = String(value || '');
  return rows.find(function(record) {
    return String(record.object[field] || '') === target;
  }) || null;
}

function watchPartyDiscoveryError_(code) {
  const error = new Error(code);
  error.cgbCode = code;
  return error;
}
