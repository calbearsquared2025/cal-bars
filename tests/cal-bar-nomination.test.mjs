import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildCalBarNominationPrefillUrl,
  normalizeCalBarNominationConfig,
  resolveCalBarNominationVenue
} from '../js/cal-bar-nomination-core.mjs';

const config = {
  formUrl: 'https://docs.google.com/forms/d/e/example/viewform',
  venueIdEntry: 'entry.1',
  venueNameEntry: 'entry.2',
  addressEntry: 'entry.3',
  cityEntry: 'entry.4',
  regionEntry: 'entry.5',
  postalCodeEntry: 'entry.6'
};

const snapshot = {
  venues: [{
    venue_id: 'venue_1', name: 'Example Pub', address_line_1: '1 Main St',
    address_line_2: 'Suite 2', city: 'Oakland', region: 'CA', postal_code: '94612'
  }]
};

test('normalizes a safe Google Form configuration', () => {
  assert.ok(normalizeCalBarNominationConfig(config));
  assert.equal(normalizeCalBarNominationConfig({ ...config, formUrl: 'http://example.com' }), null);
  assert.equal(normalizeCalBarNominationConfig({ ...config, cityEntry: 'entry.1' }), null);
});

test('prefills a selected canonical Venue using stable fields', () => {
  const venue = resolveCalBarNominationVenue(snapshot, 'venue_1');
  assert.deepEqual(venue, {
    venueId: 'venue_1', venueName: 'Example Pub', address: '1 Main St, Suite 2',
    city: 'Oakland', region: 'CA', postalCode: '94612'
  });
  const url = new URL(buildCalBarNominationPrefillUrl(config, venue));
  assert.equal(url.searchParams.get('entry.1'), 'venue_1');
  assert.equal(url.searchParams.get('entry.2'), 'Example Pub');
  assert.equal(url.searchParams.get('entry.3'), '1 Main St, Suite 2');
  assert.equal(url.searchParams.get('entry.4'), 'Oakland');
  assert.equal(url.searchParams.get('entry.5'), 'CA');
  assert.equal(url.searchParams.get('entry.6'), '94612');
});

test('supports a nomination with no existing canonical Venue', () => {
  const url = new URL(buildCalBarNominationPrefillUrl(config, null));
  assert.equal(url.hostname, 'docs.google.com');
  assert.equal(url.searchParams.get('entry.1'), null);
});

test('unknown Venue IDs do not produce fabricated context', () => {
  assert.equal(resolveCalBarNominationVenue(snapshot, 'venue_missing'), null);
});

test('Apps Script processor remains private and review-only', () => {
  const source = fs.readFileSync(new URL('../apps-script/CalBarNomination.gs', import.meta.url), 'utf8');
  assert.match(source, /needs_review/);
  assert.match(source, /duplicate_submission_id/);
  assert.match(source, /processCalBarNominationFormSubmit/);
  assert.doesNotMatch(source, /clearPublicSnapshotCache_\s*\(/);
  assert.doesNotMatch(source, /publication_status\s*=\s*['"]published/);
});
