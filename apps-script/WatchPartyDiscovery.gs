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
  let discoverySheet = workbook.getSheetByName('Watch_Party_Discovery');
  if (!discoverySheet) discoverySheet = workbook.insertSheet('Watch_Party_Discovery');
  ensureHeaderRow_(discoverySheet, CGB_WATCH_PARTY_DISCOVERY_HEADERS);

  appendApprovedHeaders_(
    getRequiredSheet_(workbook, 'Watch_Parties'),
    CGB_WATCH_PARTY_CANONICAL_DISCOVERY_HEADERS
  );
  appendApprovedHeaders_(
    getRequiredSheet_(workbook, 'Watch_Party_Submissions_Raw'),
    CGB_WATCH_PARTY_RAW_DISCOVERY_HEADERS
  );

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
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); })
    .filter(function(value) { return value !== ''; });
}

function appendApprovedHeaders_(sheet, headersToAppend) {
  const existing = readHeaderRow_(sheet);
  if (!existing.length) throw new Error('Missing existing headers in tab ' + sheet.getName());
  const duplicates = existing.filter(function(header, index) { return existing.indexOf(header) !== index; });
  if (duplicates.length) throw new Error('Duplicate headers in tab ' + sheet.getName());
  const missing = headersToAppend.filter(function(header) { return existing.indexOf(header) < 0; });
  if (!missing.length) return;
  sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  sheet.setFrozenRows(1);
}

function normalizeWatchPartyCandidate_(input) {
  const sourceKind = normalizeWatchPartyEnum_(input && input.source_kind);
  const gameIds = normalizeGameIdsCandidate_(input && input.game_ids_candidate);
  const defaultStatus = sourceKind === 'research' || sourceKind === 'demo' ? 'needs_research' : 'new';
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
    return {
      outcome: 'return_existing',
      error: '',
      idempotency_key: idempotencyKey,
      discovery_id: String(matches[0].discovery_id || '')
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
  const unresolvedStatus = sourceKind === 'research' || sourceKind === 'demo'
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
    return {
      decision: 'propose_new_community_location',
      candidate_status: 'ready_to_publish',
      reason: 'complete_trusted_structured_place',
      resolved_venue_id: '',
      proposed_venue: {
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
      }
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
      cache_invalidation_permitted: false
    };
  }

  const existingIds = [];
  const missing = [];
  const duplicates = [];
  gameIds.forEach(function(gameId) {
    const publicationKey = buildWatchPartyPublicationKey_(candidate.discovery_id, gameId);
    const matches = rows.filter(function(row) { return String(row && row.publication_key || '') === publicationKey; });
    if (matches.length > 1) duplicates.push(gameId);
    else if (matches.length === 1) existingIds.push(String(matches[0].watch_party_id));
    else missing.push(gameId);
  });

  if (duplicates.length) {
    return {
      outcome: 'error',
      candidate_status: 'error',
      existing_watch_party_ids: uniqueWatchPartyValues_(existingIds),
      missing_game_ids: missing,
      duplicate_game_ids: duplicates,
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
      cache_invalidation_permitted: true
    };
  }
  return {
    outcome: existingIds.length ? 'create_missing' : 'create_all',
    candidate_status: existingIds.length ? 'partial_failure' : 'ready_to_publish',
    existing_watch_party_ids: uniqueWatchPartyValues_(existingIds),
    missing_game_ids: missing,
    duplicate_game_ids: [],
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
    publicationPlan.duplicate_game_ids && publicationPlan.duplicate_game_ids.length === 0);
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
    latitude: Number(place && place.latitude),
    longitude: Number(place && place.longitude)
  };
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

function watchPartyDiscoveryError_(code) {
  const error = new Error(code);
  error.cgbCode = code;
  return error;
}
