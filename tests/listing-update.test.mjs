import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildListingUpdatePrefillUrl,
  normalizeListingUpdateConfig,
  resolveListingUpdateVenue
} from '../js/listing-update-core.mjs';

const config = {
  formUrl: 'https://docs.google.com/forms/d/e/example/viewform',
  venueIdEntry: 'entry.1',
  venueNameEntry: 'entry.2'
};
const snapshot = { venues: [{ venue_id: 'ven_000001', name: 'Example Pub' }] };

test('listing update configuration accepts only a safe Google Form and distinct prefill IDs', () => {
  assert.equal(normalizeListingUpdateConfig(config)?.canPrefill, true);
  assert.equal(normalizeListingUpdateConfig({ ...config, formUrl: 'http://example.com' }), null);
  assert.equal(normalizeListingUpdateConfig({ ...config, venueNameEntry: 'entry.1' })?.canPrefill, false);
});

test('listing update URL prefills only canonical Venue name and ID', () => {
  const venue = resolveListingUpdateVenue(snapshot, 'ven_000001');
  assert.deepEqual(venue, { venueId: 'ven_000001', venueName: 'Example Pub' });
  const url = new URL(buildListingUpdatePrefillUrl(config, venue));
  assert.equal(url.searchParams.get('entry.1'), 'ven_000001');
  assert.equal(url.searchParams.get('entry.2'), 'Example Pub');
  assert.equal([...url.searchParams.keys()].filter((key) => key.startsWith('entry.')).length, 2);
});

test('listing update does not fabricate Venue context and can fall back to the base Form', () => {
  assert.equal(resolveListingUpdateVenue(snapshot, 'ven_missing'), null);
  assert.equal(buildListingUpdatePrefillUrl(config, null), config.formUrl);
});

test('Venue detail adapter exposes the exact CTA and separate live configuration', async () => {
  const [html, adapter, bootstrap] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/listing-update.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/watch-party-form.js', import.meta.url), 'utf8')
  ]);
  assert.match(adapter, /Report a problem with this listing\./);
  assert.match(adapter, /state\?\.detailMode/);
  assert.match(adapter, /target = '_blank'/);
  assert.match(bootstrap, /initializeListingUpdateEntry/);
  assert.match(html, /1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A\/viewform/);
  assert.match(html, /cgb-listing-update-venue-name-entry" content="entry\.1985686020"/);
  assert.match(html, /cgb-listing-update-venue-id-entry" content="entry\.1316297830"/);
});
