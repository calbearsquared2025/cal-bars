import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/WatchPartyDiscovery.gs', import.meta.url), 'utf8');
const context = vm.createContext({
  console, Date, JSON, Math, Number, Object, Array, String, Set, Map, RegExp, Error, encodeURIComponent
});
vm.runInContext(`${source}\nglobalThis.__api = {
  normalizeWatchPartyCandidate_,
  resolveTrustedWatchPartyVenue_,
  buildWatchPartyPublicationKey_,
  planWatchPartyPublication_,
  isWatchPartyCacheInvalidationPermitted_
};`, context);
const api = context.__api;
const plain = (value) => JSON.parse(JSON.stringify(value));

function candidate(overrides = {}) {
  return {
    discovery_id: 'wpd_123',
    source_kind: 'form_submission',
    game_ids_candidate: ['game_1'],
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

test('research, import, and demo candidates default to private research status', () => {
  for (const sourceKind of ['research', 'import', 'demo']) {
    const normalized = plain(api.normalizeWatchPartyCandidate_({
      source_kind: sourceKind,
      source_record_id: `${sourceKind}-1`,
      idempotency_key: `wpd:${sourceKind}:${sourceKind}-1`
    }));
    assert.equal(normalized.candidate_status, 'needs_research');
  }
});

test('blank or null coordinates cannot authorize a proposed Community Location', () => {
  for (const place of [trustedPlace({ latitude: null }), trustedPlace({ longitude: '' })]) {
    const decision = plain(api.resolveTrustedWatchPartyVenue_(candidate(), [], { trustedPlace: place }));
    assert.equal(decision.decision, 'retain_private');
    assert.equal(decision.proposed_venue, null);
  }
});

test('complete demo and research place data remains private until deliberately released', () => {
  for (const sourceKind of ['research', 'import', 'demo']) {
    const decision = plain(api.resolveTrustedWatchPartyVenue_(candidate({ source_kind: sourceKind }), [], {
      trustedPlace: trustedPlace()
    }));
    assert.equal(decision.decision, 'retain_private');
    assert.equal(decision.candidate_status, 'needs_research');
    assert.equal(decision.reason, 'private_source_requires_review');
    assert.equal(decision.proposed_venue.external_source, 'maptiler');
  }
});

test('corrupt canonical success rows cannot permit cache invalidation', () => {
  const publicationKey = api.buildWatchPartyPublicationKey_('wpd_123', 'game_1');
  const plan = plain(api.planWatchPartyPublication_(candidate(), [
    { watch_party_id: '', publication_key: publicationKey }
  ]));
  assert.equal(plan.outcome, 'error');
  assert.deepEqual(plan.invalid_game_ids, ['game_1']);
  assert.equal(api.isWatchPartyCacheInvalidationPermitted_(plan), false);
});
