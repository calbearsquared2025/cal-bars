import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildMissingLocationFormUrl,
  normalizeMissingLocationFormConfig,
  shouldShowMissingLocationFallback
} from '../js/missing-location-core.mjs';

const FORM_URL = 'https://docs.google.com/forms/d/e/example/viewform';
const CONFIG = { formUrl: FORM_URL, placeNameEntry: 'entry.294173271' };
const client = await readFile(new URL('../js/external-venue-search.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('fallback is hidden before both normal search paths finish', () => {
  assert.equal(shouldShowMissingLocationFallback({ normalSearchFinished: false }), false);
});

test('fallback is visible only after no valid existing or external result remains', () => {
  assert.equal(shouldShowMissingLocationFallback({ normalSearchFinished: true }), true);
  assert.equal(shouldShowMissingLocationFallback({ normalSearchFinished: true, existingResultCount: 1 }), false);
  assert.equal(shouldShowMissingLocationFallback({ normalSearchFinished: true, externalResultCount: 1 }), false);
});

test('explicit missing-location action can reveal the contribution path', () => {
  assert.equal(shouldShowMissingLocationFallback({ explicitlyRequested: true }), true);
});

test('available search text is safely prefilled and no selected Game is fabricated', () => {
  const url = new URL(buildMissingLocationFormUrl(CONFIG, { searchText: '  Golden Bear & Grill  ' }));
  assert.equal(url.searchParams.get('entry.294173271'), 'Golden Bear & Grill');
  assert.equal(url.searchParams.get('usp'), 'pp_url');
  assert.equal([...url.searchParams.keys()].some((key) => /game/i.test(key)), false);
});

test('an absent search value leaves the Form URL unprefilled', () => {
  assert.equal(buildMissingLocationFormUrl(CONFIG), FORM_URL);
});

test('only the public Google Form URL and numeric entry ID are accepted', () => {
  assert.deepEqual(normalizeMissingLocationFormConfig(CONFIG), CONFIG);
  assert.equal(normalizeMissingLocationFormConfig({ formUrl: 'http://docs.google.com/forms/d/e/example/viewform', placeNameEntry: 'entry.1' }), null);
  assert.equal(normalizeMissingLocationFormConfig({ formUrl: 'https://example.com/viewform', placeNameEntry: 'entry.1' }), null);
  assert.equal(normalizeMissingLocationFormConfig({ formUrl: FORM_URL, placeNameEntry: 'private-value' }), null);
});

test('client uses existing external-search state and never creates or publishes a Venue from the Form', () => {
  assert.match(client, /searchText: ensureExternalState\(\)\.query/);
  assert.match(client, /normalSearchFinished: true/);
  const formLinkBlock = client.slice(client.indexOf('function missingLocationLink'), client.indexOf('function replaceExternalGroup'));
  assert.doesNotMatch(formLinkBlock, /fetch\(|postJoinExternalVenue|upsertCanonicalVenue|snapshot\.venues|publishVenue/i);
});

test('direct-route and refresh start without a fallback rendered in static markup', () => {
  assert.doesNotMatch(html, /class="missing-location-link"/);
  assert.match(client, /bootExternalVenueSearch/);
  assert.match(client, /query\.length < MINIMUM_QUERY_LENGTH/);
});
