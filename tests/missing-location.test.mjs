import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildMissingLocationFormUrl,
  normalizeMissingLocationFormConfig,
  shouldShowMissingLocationFallback
} from '../js/missing-location-core.mjs';
import { buildEmbeddedGoogleFormUrl } from '../js/missing-location-embed.mjs';

const FORM_URL = 'https://docs.google.com/forms/d/e/example/viewform';
const CONFIG = { formUrl: FORM_URL, placeNameEntry: 'entry.294173271' };
const client = await readFile(new URL('../js/external-venue-search.js', import.meta.url), 'utf8');
const embedClient = await readFile(new URL('../js/missing-location-embed.mjs', import.meta.url), 'utf8');
const supportClient = await readFile(new URL('../js/support-dialog.mjs', import.meta.url), 'utf8');
const watchPartyClient = await readFile(new URL('../js/watch-party-form.js', import.meta.url), 'utf8');
const externalWatchPartyClient = await readFile(new URL('../js/external-watch-party-plan.js', import.meta.url), 'utf8');
const attendanceHandoffClient = await readFile(new URL('../js/watch-party-attendance-handoff.mjs', import.meta.url), 'utf8');
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

test('embedded Form URL preserves prefill parameters and adds Google embedded mode', () => {
  const prefilled = buildMissingLocationFormUrl(CONFIG, { searchText: 'Golden Bear Grill' });
  const url = new URL(buildEmbeddedGoogleFormUrl(prefilled));
  assert.equal(url.searchParams.get('entry.294173271'), 'Golden Bear Grill');
  assert.equal(url.searchParams.get('usp'), 'pp_url');
  assert.equal(url.searchParams.get('embedded'), 'true');
});

test('embed accepts only HTTPS Google Forms viewform URLs', () => {
  assert.equal(buildEmbeddedGoogleFormUrl('https://example.com/forms/d/e/example/viewform'), '');
  assert.equal(buildEmbeddedGoogleFormUrl('http://docs.google.com/forms/d/e/example/viewform'), '');
  assert.equal(buildEmbeddedGoogleFormUrl('https://docs.google.com/spreadsheets/d/example'), '');
});

test('shared Form host is loaded once and preserves progressive-enhancement links', () => {
  assert.match(supportClient, /import '\.\/missing-location-embed\.mjs';/);
  assert.match(embedClient, /const TRIGGER_SELECTOR = 'a\[href\]'/);
  assert.match(embedClient, /event\.defaultPrevented/);
  assert.match(embedClient, /CGBGoogleFormHost/);
  assert.match(embedClient, /data-google-form-external="true"/);
  assert.match(embedClient, /Open it in Google Forms/);
  assert.match(client, /link\.target = '_blank'/);
  assert.match(html, /id="add-missing-location-link"[^>]+target="_blank"/);
});

test('shared host keeps stable titles for configured contribution Forms', () => {
  assert.match(embedClient, /cgb-watch-party-form-url', 'Add a Watch Party'/);
  assert.match(embedClient, /cgb-cal-bar-nomination-form-url', 'Tell us about this location'/);
  assert.match(embedClient, /cgb-listing-update-form-url', 'Suggest an Update or Report an Issue'/);
  assert.match(embedClient, /cgb-watch-party-issue-form-url', 'Report a problem with this Watch Party'/);
  assert.match(embedClient, /cgb-missing-location-form-url', 'Suggest a missing location'/);
});

test('all embedded Forms use one GA4 event with form title as the discriminator', () => {
  assert.match(embedClient, /gtag\?\.\('event', 'google_form_opened'/);
  assert.match(embedClient, /form_title: resolvedTitle/);
  assert.doesNotMatch(embedClient, /missing_location_form_opened/);
});

test('Watch Party attendance handoff reaches the shared host without a new-window detour', () => {
  assert.match(watchPartyClient, /reserveWindow: false/);
  assert.match(watchPartyClient, /CGBGoogleFormHost\?\.open/);
  assert.match(externalWatchPartyClient, /reserveWindow: false/);
  assert.match(externalWatchPartyClient, /CGBGoogleFormHost\?\.open/);
  assert.match(attendanceHandoffClient, /reserveWindow \?\? !windowObject\.CGBGoogleFormHost/);
  assert.match(attendanceHandoffClient, /CGBGoogleFormHost\?\.open/);
});

test('client uses existing external-search state and never creates or publishes a Venue from the Form', () => {
  assert.match(client, /searchText: ensureExternalState\(\)\.query/);
  assert.match(client, /normalSearchFinished: true/);
  const formLinkBlock = client.slice(client.indexOf('function missingLocationLink'), client.indexOf('function replaceExternalGroup'));
  assert.doesNotMatch(formLinkBlock, /fetch\(|postJoinExternalVenue|upsertCanonicalVenue|snapshot\.venues|publishVenue/i);
  assert.doesNotMatch(embedClient, /fetch\(|postJoinExternalVenue|upsertCanonicalVenue|snapshot\.venues|publishVenue/i);
});

test('direct-route and refresh start without a fallback rendered in static markup', () => {
  assert.doesNotMatch(html, /class="missing-location-link"/);
  assert.match(client, /bootExternalVenueSearch/);
  assert.match(client, /query\.length < MINIMUM_QUERY_LENGTH/);
});
