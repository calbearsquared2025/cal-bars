import test from 'node:test';
import assert from 'node:assert/strict';

import { getWatchPartiesForVenueGame } from '../js/watch-party-display-core.mjs';

const base = {
  game_id: 'game_1',
  venue_id: 'venue_1',
  event_status: 'active',
  publication_status: 'published',
  age_policy: 'unknown',
  sound_status: 'unknown'
};

function snapshot(parties) {
  return { watchParties: parties };
}

test('returns zero, one, and multiple matching Watch Parties', () => {
  assert.deepEqual(getWatchPartiesForVenueGame(snapshot([]), 'game_1', 'venue_1'), []);
  assert.equal(getWatchPartiesForVenueGame(snapshot([
    { ...base, watch_party_id: 'wp_1', organizer_name: 'Alpha' }
  ]), 'game_1', 'venue_1').length, 1);
  assert.equal(getWatchPartiesForVenueGame(snapshot([
    { ...base, watch_party_id: 'wp_1', organizer_name: 'Alpha' },
    { ...base, watch_party_id: 'wp_2', organizer_name: 'Beta' }
  ]), 'game_1', 'venue_1').length, 2);
});

test('sorts confirmed starts chronologically before TBD values', () => {
  const result = getWatchPartiesForVenueGame(snapshot([
    { ...base, watch_party_id: 'wp_tbd', organizer_name: 'Zulu', event_start_at: '' },
    { ...base, watch_party_id: 'wp_late', organizer_name: 'Beta', event_start_at: '2026-09-05T20:00:00Z' },
    { ...base, watch_party_id: 'wp_early', organizer_name: 'Alpha', event_start_at: '2026-09-05T18:00:00Z' }
  ]), 'game_1', 'venue_1');
  assert.deepEqual(result.map((party) => party.watch_party_id), ['wp_early', 'wp_late', 'wp_tbd']);
});

test('uses organizer label and watch_party_id as stable TBD tie-breakers', () => {
  const result = getWatchPartiesForVenueGame(snapshot([
    { ...base, watch_party_id: 'wp_b', organizer_name: 'Same' },
    { ...base, watch_party_id: 'wp_c', organizer_name: 'Zulu' },
    { ...base, watch_party_id: 'wp_a', organizer_name: 'Same' },
    { ...base, watch_party_id: 'wp_d', organizer_name: 'Alpha' }
  ]), 'game_1', 'venue_1');
  assert.deepEqual(result.map((party) => party.watch_party_id), ['wp_d', 'wp_a', 'wp_b', 'wp_c']);
});

test('deduplicates repeated records by watch_party_id without mixing fields', () => {
  const first = { ...base, watch_party_id: 'wp_1', organizer_name: 'First', official_event_url: 'https://first.example' };
  const duplicate = { ...base, watch_party_id: 'wp_1', organizer_name: 'Duplicate', official_event_url: 'https://duplicate.example' };
  const second = { ...base, watch_party_id: 'wp_2', organizer_name: 'Second', age_policy: '21_plus' };
  const result = getWatchPartiesForVenueGame(snapshot([first, duplicate, second]), 'game_1', 'venue_1');
  assert.equal(result.length, 2);
  assert.equal(result.find((party) => party.watch_party_id === 'wp_1').official_event_url, 'https://first.example');
  assert.equal(result.find((party) => party.watch_party_id === 'wp_2').age_policy, '21_plus');
});

test('excludes inactive, unpublished, other-game, and other-venue records', () => {
  const result = getWatchPartiesForVenueGame(snapshot([
    { ...base, watch_party_id: 'active', organizer_name: 'Active' },
    { ...base, watch_party_id: 'cancelled', organizer_name: 'Cancelled', event_status: 'cancelled' },
    { ...base, watch_party_id: 'draft', organizer_name: 'Draft', publication_status: 'draft' },
    { ...base, watch_party_id: 'other_game', organizer_name: 'Other Game', game_id: 'game_2' },
    { ...base, watch_party_id: 'other_venue', organizer_name: 'Other Venue', venue_id: 'venue_2' }
  ]), 'game_1', 'venue_1');
  assert.deepEqual(result.map((party) => party.watch_party_id), ['active']);
});

test('accepts public snapshots where publication filtering already removed private status', () => {
  const result = getWatchPartiesForVenueGame(snapshot([
    { ...base, watch_party_id: 'public', organizer_name: 'Public', publication_status: undefined }
  ]), 'game_1', 'venue_1');
  assert.equal(result.length, 1);
});

test('selected Game and Venue changes resolve independent event sets', () => {
  const data = snapshot([
    { ...base, watch_party_id: 'g1v1', organizer_name: 'One' },
    { ...base, watch_party_id: 'g2v1', organizer_name: 'Two', game_id: 'game_2' },
    { ...base, watch_party_id: 'g1v2', organizer_name: 'Three', venue_id: 'venue_2' }
  ]);
  assert.deepEqual(getWatchPartiesForVenueGame(data, 'game_1', 'venue_1').map((p) => p.watch_party_id), ['g1v1']);
  assert.deepEqual(getWatchPartiesForVenueGame(data, 'game_2', 'venue_1').map((p) => p.watch_party_id), ['g2v1']);
  assert.deepEqual(getWatchPartiesForVenueGame(data, 'game_1', 'venue_2').map((p) => p.watch_party_id), ['g1v2']);
});
