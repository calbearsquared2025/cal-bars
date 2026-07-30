import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/WatchPartyDiscovery.gs', import.meta.url), 'utf8');
const codeSource = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

const context = vm.createContext({
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  Array,
  String,
  Set,
  Map,
  RegExp,
  Error,
  encodeURIComponent
});
vm.runInContext(`${source}\nglobalThis.__api = {
  headers: CGB_WATCH_PARTY_DISCOVERY_HEADERS,
  canonicalHeaders: CGB_WATCH_PARTY_CANONICAL_DISCOVERY_HEADERS,
  rawHeaders: CGB_WATCH_PARTY_RAW_DISCOVERY_HEADERS,
  statuses: CGB_WATCH_PARTY_DISCOVERY_STATUSES,
  rawStatuses: CGB_WATCH_PARTY_RAW_PROCESSING_STATUSES,
  sourceKinds: CGB_WATCH_PARTY_SOURCE_KINDS,
  normalizeWatchPartyCandidate_,
  validateWatchPartySourceKind_,
  validateWatchPartyCandidate_,
  normalizeGameIdsCandidate_,
  validateGameIdsForPublication_,
  buildWatchPartyDiscoveryIdempotencyKey_,
  resolveWatchPartyDiscoveryDelivery_,
  buildWatchPartyPublicationKey_,
  validateWatchPartyCanonicalDiscoveryFields_,
  canTransitionWatchPartyCandidateStatus_,
  resolveTrustedWatchPartyVenue_,
  planWatchPartyPublication_,
  decideWatchPartyStatusRepair_,
  isWatchPartyCacheInvalidationPermitted_,
  verifyWatchPartyDiscoveryWorkbook_,
  appendApprovedHeaders_
};`, context);
const api = context.__api;
const plain = (value) => JSON.parse(JSON.stringify(value));

const DISCOVERY_HEADERS = [
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
];

const STATUSES = [
  'new', 'needs_research', 'needs_venue_resolution', 'ready_to_publish',
  'publishing', 'partial_failure', 'published', 'error', 'withdrawn'
];

function baseCandidate(overrides = {}) {
  return {
    discovery_id: 'wpd_123',
    idempotency_key: 'wpd:form_submission:response-1',
    source_kind: 'form_submission',
    source_record_id: 'response-1',
    source_url: 'https://private.example/source',
    official_event_url_candidate: 'https://events.example/watch-party',
    resolved_venue_id: 'ven_123',
    game_ids_candidate: ['game_1'],
    organizer_name_candidate: 'Cal Alumni Club',
    organizer_type_candidate: 'alumni_group',
    age_policy_candidate: 'all_ages',
    sound_status_candidate: 'confirmed_on',
    candidate_status: 'ready_to_publish',
    ...overrides
  };
}

function venue(overrides = {}) {
  return {
    venue_id: 'ven_123',
    name: 'Existing Pub',
    address_line_1: '1 Main Street',
    address_line_2: '',
    city: 'Oakland',
    region: 'CA',
    postal_code: '94612',
    country_code: 'US',
    latitude: 37.8,
    longitude: -122.27,
    external_source: 'maptiler',
    external_place_id: 'poi.123',
    publication_status: 'published',
    ...overrides
  };
}

function trustedPlace(overrides = {}) {
  return {
    verified: true,
    source: 'maptiler',
    placeId: 'poi.999',
    name: 'Trusted Pub',
    addressLine1: '99 College Avenue',
    addressLine2: '',
    city: 'Oakland',
    region: 'CA',
    postalCode: '94618',
    countryCode: 'US',
    latitude: 37.84,
    longitude: -122.25,
    ...overrides
  };
}

class RangeMock {
  constructor(sheet, row, column, rows, columns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rows = rows;
    this.columns = columns;
  }
  getDisplayValues() {
    return Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.columns }, (_, c) =>
        String(this.sheet.values[this.row - 1 + r]?.[this.column - 1 + c] ?? '')
      )
    );
  }
  setValues(values) {
    values.forEach((sourceRow, r) => {
      const target = this.row - 1 + r;
      if (!this.sheet.values[target]) this.sheet.values[target] = [];
      sourceRow.forEach((value, c) => {
        this.sheet.values[target][this.column - 1 + c] = value;
      });
    });
    return this;
  }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.values = [headers.slice(), ...rows];
    this.frozenRows = 0;
  }
  getName() { return this.name; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  getRange(row, column, rows = 1, columns = 1) { return new RangeMock(this, row, column, rows, columns); }
  setFrozenRows(count) { this.frozenRows = count; }
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.name, sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

test('discovery schema contains every approved field in canonical order', () => {
  assert.deepEqual(plain(api.headers), DISCOVERY_HEADERS);
  assert.deepEqual(plain(api.canonicalHeaders), ['discovery_id', 'publication_key']);
  assert.deepEqual(plain(api.rawHeaders), ['discovery_id']);
});

test('all controlled candidate and raw processing statuses are present', () => {
  assert.deepEqual(plain(api.statuses), STATUSES);
  assert.deepEqual(plain(api.rawStatuses), [
    'new', 'discovery_created', 'processing', 'processed', 'needs_research',
    'partial_failure', 'error'
  ]);
});

test('source-kind validation accepts only approved controlled values', () => {
  for (const kind of ['form_submission', 'research', 'import', 'demo']) {
    assert.equal(api.validateWatchPartySourceKind_(kind), true);
  }
  assert.equal(api.validateWatchPartySourceKind_('scrape'), false);
});

test('incomplete candidates may remain private without Game IDs', () => {
  const normalized = plain(api.normalizeWatchPartyCandidate_({
    source_kind: 'demo',
    source_record_id: 'demo-1',
    idempotency_key: 'wpd:demo:demo-1'
  }));
  assert.equal(normalized.game_ids_candidate, '[]');
  assert.equal(normalized.candidate_status, 'needs_research');
  const errors = plain(api.validateWatchPartyCandidate_(normalized, { forPublication: false }));
  assert.equal(errors.includes('missing_game_ids'), false);
});

test('publication rejects candidates without valid known Game IDs', () => {
  const missing = plain(api.validateWatchPartyCandidate_(baseCandidate({ game_ids_candidate: [] }), {
    forPublication: true,
    knownGameIds: ['game_1']
  }));
  assert.ok(missing.includes('missing_game_ids'));

  const unknown = plain(api.validateWatchPartyCandidate_(baseCandidate({ game_ids_candidate: ['game_2'] }), {
    forPublication: true,
    knownGameIds: ['game_1']
  }));
  assert.ok(unknown.includes('unknown_game_id:game_2'));
});

test('candidate normalization preserves private source URL separately from public official URL', () => {
  const normalized = plain(api.normalizeWatchPartyCandidate_(baseCandidate()));
  assert.equal(normalized.source_url, 'https://private.example/source');
  assert.equal(normalized.official_event_url_candidate, 'https://events.example/watch-party');
  assert.notEqual(normalized.source_url, normalized.official_event_url_candidate);

  const noOfficial = plain(api.validateWatchPartyCandidate_(baseCandidate({ official_event_url_candidate: '' }), {
    forPublication: true,
    knownGameIds: ['game_1']
  }));
  assert.equal(noOfficial.includes('missing_official_event_url'), false);
});

test('duplicate source delivery returns the existing discovery ID', () => {
  const firstKey = api.buildWatchPartyDiscoveryIdempotencyKey_('form_submission', 'response 1');
  const secondKey = api.buildWatchPartyDiscoveryIdempotencyKey_('form_submission', 'response 1');
  assert.equal(firstKey, secondKey);
  const decision = plain(api.resolveWatchPartyDiscoveryDelivery_(
    'form_submission',
    'response 1',
    [{ discovery_id: 'wpd_existing', idempotency_key: firstKey }]
  ));
  assert.deepEqual(decision, {
    outcome: 'return_existing',
    error: '',
    idempotency_key: firstKey,
    discovery_id: 'wpd_existing'
  });
});

test('duplicate idempotency-key drift is surfaced as a private error', () => {
  const key = api.buildWatchPartyDiscoveryIdempotencyKey_('demo', 'demo-1');
  const decision = plain(api.resolveWatchPartyDiscoveryDelivery_('demo', 'demo-1', [
    { discovery_id: 'wpd_1', idempotency_key: key },
    { discovery_id: 'wpd_2', idempotency_key: key }
  ]));
  assert.equal(decision.outcome, 'error');
  assert.equal(decision.error, 'duplicate_idempotency_key');
});

test('canonical discovery fields are conditional and publication keys are deterministic', () => {
  assert.deepEqual(plain(api.validateWatchPartyCanonicalDiscoveryFields_({
    source_type: 'cgb_added', game_id: 'game_1', discovery_id: '', publication_key: ''
  })), []);

  const key = api.buildWatchPartyPublicationKey_('wpd_123', 'game_1');
  assert.deepEqual(plain(api.validateWatchPartyCanonicalDiscoveryFields_({
    source_type: 'fan_submitted', game_id: 'game_1', discovery_id: 'wpd_123', publication_key: key
  }, { requireDiscoveryProcessed: true })), []);

  const missing = plain(api.validateWatchPartyCanonicalDiscoveryFields_({
    source_type: 'fan_submitted', game_id: 'game_1', discovery_id: '', publication_key: ''
  }, { requireDiscoveryProcessed: true }));
  assert.ok(missing.includes('missing_discovery_id'));
  assert.ok(missing.includes('missing_publication_key'));
});

test('existing submitted Venue ID resolves before other matching paths', () => {
  const decision = plain(api.resolveTrustedWatchPartyVenue_(
    baseCandidate({ venue_id_candidate: 'ven_123' }),
    [venue()],
    { trustedPlace: trustedPlace() }
  ));
  assert.equal(decision.decision, 'use_existing_venue');
  assert.equal(decision.reason, 'submitted_venue_id');
  assert.equal(decision.resolved_venue_id, 'ven_123');
});

test('trusted place identity resolves to an existing Venue', () => {
  const match = venue({ venue_id: 'ven_maptiler', external_place_id: 'poi.999' });
  const decision = plain(api.resolveTrustedWatchPartyVenue_(baseCandidate(), [match], {
    trustedPlace: trustedPlace()
  }));
  assert.equal(decision.reason, 'trusted_place_identity');
  assert.equal(decision.resolved_venue_id, 'ven_maptiler');
});

test('one complete normalized canonical address resolves to one existing Venue', () => {
  const addressMatch = venue({
    venue_id: 'ven_address',
    address_line_1: '99 College Ave',
    city: 'Oakland',
    region: 'California',
    postal_code: '94618',
    external_source: '',
    external_place_id: ''
  });
  const decision = plain(api.resolveTrustedWatchPartyVenue_(baseCandidate(), [addressMatch], {
    submittedAddress: {
      addressLine1: '99 College Avenue', city: 'Oakland', region: 'CA',
      postalCode: '94618', countryCode: 'US'
    }
  }));
  assert.equal(decision.reason, 'unique_normalized_address');
  assert.equal(decision.resolved_venue_id, 'ven_address');
});

test('ambiguous complete address remains private for venue resolution', () => {
  const shared = {
    address_line_1: '99 College Ave', city: 'Oakland', region: 'CA',
    postal_code: '94618', country_code: 'US'
  };
  const decision = plain(api.resolveTrustedWatchPartyVenue_(baseCandidate(), [
    venue({ venue_id: 'ven_a', ...shared }),
    venue({ venue_id: 'ven_b', ...shared })
  ], {
    submittedAddress: {
      addressLine1: '99 College Avenue', city: 'Oakland', region: 'CA',
      postalCode: '94618', countryCode: 'US'
    }
  }));
  assert.equal(decision.decision, 'retain_private');
  assert.equal(decision.candidate_status, 'needs_venue_resolution');
  assert.equal(decision.reason, 'ambiguous_normalized_address');
});

test('free text, partial address, source URL, and untrusted place cannot authorize Venue creation', () => {
  const decision = plain(api.resolveTrustedWatchPartyVenue_(baseCandidate({
    venue_name_candidate: 'Some Pub',
    address_candidate: 'Oakland, CA',
    source_url: 'https://private.example/research'
  }), [], {
    trustedPlace: trustedPlace({ verified: false, source: 'untrusted', addressLine1: '' })
  }));
  assert.equal(decision.decision, 'retain_private');
  assert.equal(decision.candidate_status, 'needs_venue_resolution');
});

test('new Community Location is eligible only with complete verified trusted structured data', () => {
  const eligible = plain(api.resolveTrustedWatchPartyVenue_(baseCandidate(), [], {
    trustedPlace: trustedPlace()
  }));
  assert.equal(eligible.decision, 'propose_new_community_location');
  assert.equal(eligible.proposed_venue.external_source, 'maptiler');
  assert.equal(eligible.proposed_venue.publication_status, 'published');

  for (const incomplete of [
    trustedPlace({ verified: false }),
    trustedPlace({ source: 'other' }),
    trustedPlace({ placeId: '' }),
    trustedPlace({ addressLine1: '' }),
    trustedPlace({ postalCode: '' }),
    trustedPlace({ latitude: 999 })
  ]) {
    const retained = plain(api.resolveTrustedWatchPartyVenue_(baseCandidate(), [], { trustedPlace: incomplete }));
    assert.equal(retained.decision, 'retain_private');
  }
});

test('retry after prior success returns existing Watch Party IDs and permits one cache invalidation', () => {
  const key = api.buildWatchPartyPublicationKey_('wpd_123', 'game_1');
  const plan = plain(api.planWatchPartyPublication_(baseCandidate(), [
    { watch_party_id: 'wp_1', publication_key: key }
  ]));
  assert.equal(plan.outcome, 'return_existing');
  assert.deepEqual(plan.existing_watch_party_ids, ['wp_1']);
  assert.equal(api.isWatchPartyCacheInvalidationPermitted_(plan), true);
});

test('partial multi-game retry creates only missing intended rows', () => {
  const candidate = baseCandidate({ game_ids_candidate: ['game_1', 'game_2'] });
  const plan = plain(api.planWatchPartyPublication_(candidate, [
    { watch_party_id: 'wp_1', publication_key: api.buildWatchPartyPublicationKey_('wpd_123', 'game_1') }
  ]));
  assert.equal(plan.outcome, 'create_missing');
  assert.deepEqual(plan.existing_watch_party_ids, ['wp_1']);
  assert.deepEqual(plan.missing_game_ids, ['game_2']);
  assert.equal(plan.cache_invalidation_permitted, false);
});

test('duplicate discovery/Game publication keys are rejected', () => {
  const key = api.buildWatchPartyPublicationKey_('wpd_123', 'game_1');
  const plan = plain(api.planWatchPartyPublication_(baseCandidate(), [
    { watch_party_id: 'wp_1', publication_key: key },
    { watch_party_id: 'wp_2', publication_key: key }
  ]));
  assert.equal(plan.outcome, 'error');
  assert.deepEqual(plan.duplicate_game_ids, ['game_1']);
  assert.equal(plan.cache_invalidation_permitted, false);
});

test('status repair treats canonical rows as authoritative', () => {
  const success = plain(api.decideWatchPartyStatusRepair_(
    baseCandidate({ candidate_status: 'error' }),
    [{ watch_party_id: 'wp_1', publication_key: api.buildWatchPartyPublicationKey_('wpd_123', 'game_1') }]
  ));
  assert.equal(success.candidate_status, 'published');
  assert.equal(success.raw_processing_status, 'processed');

  const partial = plain(api.decideWatchPartyStatusRepair_(
    baseCandidate({ game_ids_candidate: ['game_1', 'game_2'], candidate_status: 'publishing' }),
    [{ watch_party_id: 'wp_1', publication_key: api.buildWatchPartyPublicationKey_('wpd_123', 'game_1') }]
  ));
  assert.equal(partial.candidate_status, 'partial_failure');
  assert.equal(partial.raw_processing_status, 'partial_failure');
});

test('candidate status transitions permit recovery but not reopening published or withdrawn rows', () => {
  assert.equal(api.canTransitionWatchPartyCandidateStatus_('partial_failure', 'publishing'), true);
  assert.equal(api.canTransitionWatchPartyCandidateStatus_('error', 'ready_to_publish'), true);
  assert.equal(api.canTransitionWatchPartyCandidateStatus_('published', 'publishing'), false);
  assert.equal(api.canTransitionWatchPartyCandidateStatus_('withdrawn', 'ready_to_publish'), false);
});

test('workbook verification and preparation helpers are additive and schema-safe', () => {
  const discovery = new SheetMock('Watch_Party_Discovery', DISCOVERY_HEADERS);
  const parties = new SheetMock('Watch_Parties', ['watch_party_id', 'game_id']);
  const raw = new SheetMock('Watch_Party_Submissions_Raw', ['submission_id', 'processing_status']);
  api.appendApprovedHeaders_(parties, ['discovery_id', 'publication_key']);
  api.appendApprovedHeaders_(raw, ['discovery_id']);
  const result = plain(api.verifyWatchPartyDiscoveryWorkbook_(new WorkbookMock([discovery, parties, raw])));
  assert.equal(result.ok, true);
  assert.deepEqual(parties.values[0], ['watch_party_id', 'game_id', 'discovery_id', 'publication_key']);
  assert.deepEqual(raw.values[0], ['submission_id', 'processing_status', 'discovery_id']);
  assert.equal(parties.values.length, 1);
  assert.equal(raw.values.length, 1);
});

test('public snapshot source cannot expose discovery or private processing fields', () => {
  const publicBlock = codeSource.slice(
    codeSource.indexOf('const CGB_PUBLIC_FIELDS'),
    codeSource.indexOf('function configureBoundWorkbook')
  );
  for (const forbidden of [
    'discovery_id', 'publication_key', 'source_url', 'submitter_email',
    'validation_errors', 'research_note', 'last_error', 'browser_id'
  ]) {
    assert.equal(publicBlock.includes(`'${forbidden}'`), false, `${forbidden} must not be public-whitelisted`);
  }
  const snapshotBlock = codeSource.slice(
    codeSource.indexOf('function buildPublicSnapshot_'),
    codeSource.indexOf('function buildFanCounts_')
  );
  assert.equal(snapshotBlock.includes('Watch_Party_Discovery'), false);
  assert.equal(snapshotBlock.includes('Watch_Party_Submissions_Raw'), false);
  assert.equal(source.includes('clearPublicSnapshotCache_('), false);
});
