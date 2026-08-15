import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot } from '../scripts/validate-v2-data.mjs';

function snapshotWithVenue(overrides = {}) {
  return {
    schemaVersion: '2.0',
    venues: [{
      venue_id: 'venue_1234567890abcdef12345678',
      slug: 'example-pub',
      name: 'Example Pub',
      address_line_1: '1 Example Street',
      city: 'Oakland',
      region: 'CA',
      country_code: 'US',
      latitude: 37.8,
      longitude: -122.2,
      venue_type: 'cal_bar',
      verification_status: 'cgb_reviewed',
      alumni_owned: 'unknown',
      updated_at: '2026-08-12T12:00:00Z',
      photo_url: 'https://calgoldenbars.com/assets/venues/example-pub.webp',
      photo_caption: 'Cal fans gathering at Example Pub.',
      photo_credit: '@example',
      photo_credit_url: 'https://example.com/photographer',
      ...overrides
    }],
    games: [{
      game_id: 'game_1234567890abcdef12345678',
      season: 2026,
      schedule_order: 1,
      opponent_name: 'UCLA',
      home_away: 'home',
      game_date: '2026-09-05',
      kickoff_at: '2026-09-06T02:30:00Z',
      kickoff_status: 'confirmed',
      game_status: 'upcoming',
      updated_at: '2026-08-12T12:00:00Z'
    }],
    watchParties: [],
    fanCounts: [],
    venueHistoryCounts: [],
    venueSeasonCounts: [],
    generatedAt: '2026-08-12T12:00:00Z'
  };
}

test('public snapshot accepts the four approved Venue photo fields', () => {
  assert.deepEqual(validateSnapshot(snapshotWithVenue()), []);
});

test('public snapshot rejects unsafe credit profile URLs', () => {
  const errors = validateSnapshot(snapshotWithVenue({ photo_credit_url: 'javascript:alert(1)' }));
  assert.ok(errors.some((error) => error.includes('photo_credit_url must be empty or http(s)')));
});

test('public snapshot rejects private/raw photo submission fields', () => {
  for (const field of [
    'file_reference', 'drive_file_id', 'caption', 'permission_confirmed',
    'permission_record', 'submitter_email', 'respondent_email', 'reviewer_note',
    'raw_submission_contents'
  ]) {
    const errors = validateSnapshot(snapshotWithVenue({ [field]: 'private-test-value' }));
    assert.ok(errors.some((error) => error.includes(`.${field} is forbidden in public data`)), field);
  }
});
