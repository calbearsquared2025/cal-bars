import assert from 'node:assert/strict';
import test from 'node:test';

import { VENUE_FIELDS } from '../scripts/venue-migration-normalize.mjs';
import { validateVenueLoad, venueSetHash } from '../scripts/validate-venue-load.mjs';

function venue(overrides = {}) {
  return {
    venue_id: 'ven_1',
    slug: 'approved-venue-berkeley',
    name: 'Approved Venue',
    address_line_1: '1 College Avenue',
    address_line_2: '',
    city: 'Berkeley',
    region: 'CA',
    postal_code: '94704',
    country_code: 'US',
    latitude: '37.87',
    longitude: '-122.27',
    website_url: '',
    venue_type: 'cal_bar',
    verification_status: 'cgb_reviewed',
    alumni_owned: 'unknown',
    external_source: 'google_places_v1',
    external_place_id: 'ChIJapproved',
    short_description: '',
    photo_url: '',
    photo_credit: '',
    publication_status: 'draft',
    source_submission_id: '',
    created_at: '2026-07-26T00:00:00Z',
    updated_at: '2026-07-26T00:00:00Z',
    ...overrides
  };
}

test('exact approved identities and allowlisted preserved rows pass', () => {
  const approved = venue();
  const actual = venue({ publication_status: 'published' });
  const preserved = venue({
    venue_id: 'venue_user_1',
    slug: 'user-added-oakland',
    name: 'User Added',
    city: 'Oakland',
    publication_status: 'published'
  });
  const result = validateVenueLoad({
    approvedRows: [approved],
    actualRows: [actual, preserved],
    preservedVenueIds: ['venue_user_1']
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.approved_found, 1);
  assert.equal(result.summary.total_actual, 2);
});

test('count-matching replacement data fails identity validation', () => {
  const result = validateVenueLoad({
    approvedRows: [venue()],
    actualRows: [venue({
      venue_id: 'ven_invented',
      slug: 'invented-venue-atlanta',
      name: 'Invented Venue',
      city: 'Atlanta',
      publication_status: 'published'
    })]
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'MISSING_APPROVED_VENUE'));
  assert.ok(result.issues.some((issue) => issue.code === 'UNEXPECTED_VENUE'));
  assert.ok(result.issues.some((issue) => issue.code === 'APPROVED_VENUE_SET_HASH_MISMATCH'));
});

test('relocated or renamed approved Venue fails field equality', () => {
  const result = validateVenueLoad({
    approvedRows: [venue()],
    actualRows: [venue({ city: 'Atlanta', publication_status: 'published' })]
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) =>
    issue.code === 'APPROVED_VENUE_FIELD_MISMATCH' && issue.field === 'city'));
});

test('duplicate IDs and slugs fail even when totals look correct', () => {
  const first = venue({ publication_status: 'published' });
  const second = venue({ name: 'Duplicate Venue', publication_status: 'published' });
  const result = validateVenueLoad({ approvedRows: [venue()], actualRows: [first, second] });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'DUPLICATE_VENUE_ID'));
  assert.ok(result.issues.some((issue) => issue.code === 'DUPLICATE_VENUE_SLUG'));
});

test('canonical hash is order-independent and covers every Venue field', () => {
  const first = venue({ publication_status: 'published' });
  const second = venue({ venue_id: 'ven_2', slug: 'second-venue-oakland', name: 'Second Venue', publication_status: 'published' });
  assert.equal(venueSetHash([first, second]), venueSetHash([second, first]));
  const changed = { ...second, city: 'Atlanta' };
  assert.notEqual(venueSetHash([first, second]), venueSetHash([first, changed]));
  assert.deepEqual(Object.keys(first), VENUE_FIELDS);
});
