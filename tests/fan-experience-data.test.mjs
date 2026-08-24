import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot } from '../scripts/validate-v2-data.mjs';

const venueId = 'venue_5977e35a58d8b18f22a51f1e';

function baseSnapshot() {
  return {
    schemaVersion: '2.0',
    venues: [{
      venue_id: venueId,
      slug: 'molly-o-s-san-carlos',
      name: "Molly O's",
      address_line_1: '1163 San Carlos Avenue',
      address_line_2: '',
      city: 'San Carlos',
      region: 'CA',
      postal_code: '94070',
      country_code: 'US',
      latitude: 37.5065766,
      longitude: -122.2606365,
      website_url: '',
      venue_type: 'cal_bar',
      verification_status: 'cgb_reviewed',
      alumni_owned: 'yes',
      short_description: '',
      photo_url: '',
      photo_caption: '',
      photo_credit: '',
      photo_credit_url: '',
      updated_at: '2026-08-23T20:00:00Z'
    }],
    games: [],
    watchParties: [],
    fanCounts: [],
    venueHistoryCounts: [{ venue_id: venueId, past_game_count: 0 }],
    venueSeasonCounts: [],
    generatedAt: '2026-08-23T20:00:00Z'
  };
}

test('older public snapshots may omit fanExperiences', () => {
  assert.deepEqual(validateSnapshot(baseSnapshot()), []);
});

test('public Fan Experience accepts only venue_id, text, and submission year for a public Venue', () => {
  const snapshot = baseSnapshot();
  snapshot.fanExperiences = [{ venue_id: venueId, text: '<b>Literal text</b>', year: 2026 }];
  assert.deepEqual(validateSnapshot(snapshot), []);
});

test('unknown Venue IDs, malformed years, and private Fan Experience fields are rejected', () => {
  const unknown = baseSnapshot();
  unknown.fanExperiences = [{
    venue_id: 'venue_aaaaaaaaaaaaaaaaaaaaaaaa',
    text: 'Unknown venue',
    year: 2026
  }];
  assert.ok(validateSnapshot(unknown).some((error) => error.includes('does not reference a public venue')));

  const badYear = baseSnapshot();
  badYear.fanExperiences = [{ venue_id: venueId, text: 'Public text', year: '2026' }];
  assert.ok(validateSnapshot(badYear).some((error) => error.includes('year must be a four-digit integer')));

  const privateLeak = baseSnapshot();
  privateLeak.fanExperiences = [{
    venue_id: venueId,
    text: 'Public text',
    year: 2026,
    experience_text: 'Raw private text',
    moderation_status: 'published',
    moderation_reason: ''
  }];
  const errors = validateSnapshot(privateLeak);
  assert.ok(errors.some((error) => error.includes('experience_text is forbidden')));
  assert.ok(errors.some((error) => error.includes('moderation_status is forbidden')));
  assert.ok(errors.some((error) => error.includes('may contain only venue_id, text, and year')));
});
