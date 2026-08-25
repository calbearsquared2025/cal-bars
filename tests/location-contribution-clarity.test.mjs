import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalVenueWasKnown } from '../js/new-location-contribution-prompt.mjs';

const root = new URL('../', import.meta.url);
const [html, shell, nomination, prompt, promptCss, joinedCreation, addOnlyCreation] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('js/shell-controls.mjs', root), 'utf8'),
  readFile(new URL('js/cal-bar-nomination.js', root), 'utf8'),
  readFile(new URL('js/new-location-contribution-prompt.mjs', root), 'utf8'),
  readFile(new URL('css/new-location-contribution-prompt.css', root), 'utf8'),
  readFile(new URL('js/external-venue-search.js', root), 'utf8'),
  readFile(new URL('js/external-venue-contribution.js', root), 'utf8')
]);

test('location information contribution uses one user-facing label across Profile and Add surfaces', () => {
  assert.match(nomination, /Tell us about this location/);
  assert.match(html, /id="add-cal-bar-button"[\s\S]*Tell us about this location/);
  assert.match(shell, /Tell us about this location/);
  assert.doesNotMatch(`${nomination}\n${html}\n${shell}`, /Nominate as a Cal Bar|Tell us about this Cal Bar/);
});

test('another-location mode describes a search rather than a permanent database action', () => {
  assert.match(html, /Watching somewhere else\?[\s\S]*Search for another location/);
  assert.match(shell, /dom\.searchTitle\.textContent = addingLocation \? 'Search for another location'/);
  assert.match(shell, /Find a place that isn’t listed in Cal Golden Bars yet\./);
});

test('new-location contribution prompt reuses the existing prefilled location-information form', () => {
  assert.match(prompt, /cgb-cal-bar-nomination-form-url/);
  assert.match(prompt, /cgb-cal-bar-nomination-venue-name-entry/);
  assert.match(prompt, /cgb-cal-bar-nomination-venue-id-entry/);
  assert.match(prompt, /buildCalBarNominationPrefillUrl/);
  assert.match(prompt, /Location added/);
  assert.match(prompt, /is now on Cal Golden Bars\./);
  assert.match(prompt, /Know this place\? Help us complete the listing\./);
  assert.match(prompt, /Tell us about this location/);
  assert.match(prompt, /Not now/);
});

test('new-location prompt is gated to a canonical Venue that was not already in the snapshot', () => {
  const snapshot = { venues: [{ venue_id: 'venue_existing' }] };
  assert.equal(canonicalVenueWasKnown(snapshot, 'venue_existing'), true);
  assert.equal(canonicalVenueWasKnown(snapshot, 'venue_new'), false);
  assert.match(joinedCreation, /const venueAlreadyKnown = canonicalVenueWasKnown\(appState\.snapshot, response\.venue\?\.venue_id\)/);
  assert.match(joinedCreation, /if \(!venueAlreadyKnown\) showNewLocationContributionPrompt\(venue\)/);
  assert.match(addOnlyCreation, /const venueAlreadyKnown = canonicalVenueWasKnown\(appState\.snapshot, response\.venue\?\.venue_id\)/);
  assert.match(addOnlyCreation, /if \(!venueAlreadyKnown\) showNewLocationContributionPrompt\(venue, \{ documentObject \}\)/);
});

test('new-location prompt is an iPhone bottom sheet and a centered desktop dialog', () => {
  assert.match(promptCss, /\.new-location-success-dialog[\s\S]*margin: auto 0 0/);
  assert.match(promptCss, /env\(safe-area-inset-bottom\)/);
  assert.match(promptCss, /@media \(min-width: 700px\)[\s\S]*margin: auto;/);
  assert.match(html, /css\/new-location-contribution-prompt\.css/);
});
