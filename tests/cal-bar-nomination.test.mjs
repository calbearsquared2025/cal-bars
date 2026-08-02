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
  venueNameEntry: 'entry.2'
};

const snapshot = {
  venues: [{ venue_id: 'venue_1', name: 'Example Pub' }]
};

test('normalizes a safe minimal Google Form configuration', () => {
  assert.ok(normalizeCalBarNominationConfig(config));
  assert.equal(normalizeCalBarNominationConfig({ ...config, formUrl: 'http://example.com' }), null);
  assert.equal(normalizeCalBarNominationConfig({ ...config, venueNameEntry: 'entry.1' }), null);
});

test('prefills only selected Venue name and stable Venue ID', () => {
  const venue = resolveCalBarNominationVenue(snapshot, 'venue_1');
  assert.deepEqual(venue, { venueId: 'venue_1', venueName: 'Example Pub' });
  const url = new URL(buildCalBarNominationPrefillUrl(config, venue));
  assert.equal(url.searchParams.get('entry.1'), 'venue_1');
  assert.equal(url.searchParams.get('entry.2'), 'Example Pub');
  assert.equal([...url.searchParams.keys()].filter((key) => key.startsWith('entry.')).length, 2);
});

test('base nomination Form remains available without canonical Venue context', () => {
  const url = new URL(buildCalBarNominationPrefillUrl(config, null));
  assert.equal(url.hostname, 'docs.google.com');
  assert.equal(url.searchParams.get('entry.1'), null);
});

test('unknown Venue IDs do not produce fabricated context', () => {
  assert.equal(resolveCalBarNominationVenue(snapshot, 'venue_missing'), null);
});

test('Apps Script processor remains private, qualitative, and review-only', () => {
  const source = fs.readFileSync(new URL('../apps-script/CalBarNomination.gs', import.meta.url), 'utf8');
  assert.match(source, /What makes this a Cal Bar\?/);
  assert.match(source, /alumni_group_affiliation/);
  assert.match(source, /alumni_owned/);
  assert.match(source, /cal_memorabilia/);
  assert.match(source, /submitter_email/);
  assert.match(source, /needs_review/);
  assert.doesNotMatch(source, /clearPublicSnapshotCache_\s*\(/);
  assert.doesNotMatch(source, /publication_status\s*=\s*['"]published/);
});
