import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCalBarNominationPrefillUrl,
  normalizeCalBarNominationConfig,
  resolveCalBarNominationVenue
} from '../js/cal-bar-nomination-core.mjs';

const config = {
  formUrl: 'https://docs.google.com/forms/d/e/example/viewform',
  venueIdEntry: 'entry.1',
  venueNameEntry: 'entry.2'
};

const snapshot = {
  venues: [
    {
      venue_id: 'venue_1',
      name: 'Example Pub',
      venue_type: 'community_location'
    },
    {
      venue_id: 'venue_2',
      name: 'Established Cal Bar',
      venue_type: 'cal_bar'
    },
    {
      venue_id: 'venue_3',
      name: 'Unclassified Venue'
    }
  ]
};

test('normalizes a safe Google Form configuration and degrades to a base link without valid prefill IDs', () => {
  const normalized = normalizeCalBarNominationConfig(config);
  assert.ok(normalized);
  assert.equal(normalized.canPrefill, true);
  assert.equal(normalizeCalBarNominationConfig({ ...config, formUrl: 'http://example.com' }), null);

  const duplicateEntries = normalizeCalBarNominationConfig({ ...config, venueNameEntry: 'entry.1' });
  assert.ok(duplicateEntries);
  assert.equal(duplicateEntries.canPrefill, false);
  assert.equal(duplicateEntries.venueIdEntry, '');
  assert.equal(duplicateEntries.venueNameEntry, '');
});

test('prefills only selected Community Location name and stable Venue ID', () => {
  const venue = resolveCalBarNominationVenue(snapshot, 'venue_1');
  assert.deepEqual(venue, { venueId: 'venue_1', venueName: 'Example Pub' });
  const url = new URL(buildCalBarNominationPrefillUrl(config, venue));
  assert.equal(url.searchParams.get('entry.1'), 'venue_1');
  assert.equal(url.searchParams.get('entry.2'), 'Example Pub');
  assert.equal([...url.searchParams.keys()].filter((key) => key.startsWith('entry.')).length, 2);
});

test('existing Cal Bars are not eligible for nomination', () => {
  assert.equal(resolveCalBarNominationVenue(snapshot, 'venue_2'), null);
});

test('Venues without an explicit Community Location type are not eligible for nomination', () => {
  assert.equal(resolveCalBarNominationVenue(snapshot, 'venue_3'), null);
});

test('base nomination Form remains available without canonical Venue context', () => {
  const url = new URL(buildCalBarNominationPrefillUrl(config, null));
  assert.equal(url.hostname, 'docs.google.com');
  assert.equal(url.searchParams.get('entry.1'), null);
});

test('unknown Venue IDs do not produce fabricated context', () => {
  assert.equal(resolveCalBarNominationVenue(snapshot, 'venue_missing'), null);
});
