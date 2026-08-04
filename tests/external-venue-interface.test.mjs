import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const appState = await readFile(new URL('../js/app-state.mjs', import.meta.url), 'utf8');
const client = await readFile(new URL('../js/external-venue-search.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../js/external-venue-core.mjs', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/external-venue.css', import.meta.url), 'utf8');
const fanClient = await readFile(new URL('../js/fan-intent.js', import.meta.url), 'utf8');
const script = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');
const fanScript = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start + 1) : source.length;
  return start >= 0 ? source.slice(start, end >= 0 ? end : source.length) : '';
}

test('existing CGB and external MapTiler results render as separate labeled groups', () => {
  assert.match(client, /Existing CGB locations/);
  assert.match(client, /External MapTiler places/);
  assert.match(client, /search-result-group--existing/);
  assert.match(client, /search-result-group--external/);
  assert.match(client, /decorateExistingResults\(\)/);
  assert.match(css, /\.search-result-group \+ \.search-result-group/);
});

test('external selection opens verification without creating a Venue', () => {
  const selection = functionBlock(client, 'selectExternalPlace', 'externalPlacePayload');
  assert.match(selection, /state\.selected = \{ \.\.\.place, gameId: appState\.gameId \}/);
  assert.match(selection, /externalDialog\.showModal\(\)/);
  assert.doesNotMatch(selection, /upsertCanonicalVenue|snapshot\.venues|fanCounts|postJoinExternalVenue/);
  assert.match(html, /id="external-venue-name"/);
  assert.match(html, /id="external-venue-address"/);
  assert.match(html, /id="external-venue-context"/);
  assert.match(html, /This place is not yet listed as a Cal Bar or Community Location/);
  assert.match(html, /id="external-venue-confirm"[^>]*>I’ll be here</);
});

test('combined write preserves selected game and sends only normalized external fields', () => {
  assert.match(client, /action: 'joinExternalVenue'/);
  assert.match(client, /browserId: appState\.fanIntent\.browserId/);
  assert.match(client, /gameId: selected\.gameId/);
  assert.match(client, /externalPlace: externalPlacePayload\(selected\)/);
  assert.match(client, /source: selected\.source/);
  assert.match(client, /placeId: selected\.placeId/);
  assert.match(client, /addressLine1: selected\.addressLine1/);
  assert.match(client, /countryCode: selected\.countryCode/);
  assert.doesNotMatch(client, /external_source|external_place_id/);
});

test('only a validated server response enters the canonical snapshot', () => {
  const commit = functionBlock(client, 'commitExternalVenue', 'joinSelectedExternalVenue');
  assert.match(commit, /upsertCanonicalVenue\(appState\.snapshot, response\.venue\)/);
  assert.match(commit, /applyAggregateResponse\(appState\.snapshot, response\)/);
  assert.match(commit, /appState\.selectedVenueId = venue\.venue_id/);
  assert.match(commit, /appState\.trayState = 'selected'/);
  assert.match(commit, /CGBApp\?\.render\(\)/);
  assert.match(client, /validateJoinExternalVenueResponse\(response\)/);
  assert.match(app, /state\.snapshot\.venues\.find\(\(venue\) => venue\.venue_id === state\.selectedVenueId\)/);
  assert.match(app, /buildVenueUrl\(venue\.slug, state\.gameId/);
});

test('creation pending prevents duplicate taps and failure retains retry context without optimistic venue state', () => {
  const join = functionBlock(client, 'joinSelectedExternalVenue', 'cancelConfirmation');
  assert.match(join, /if \(!selected \|\| state\.pending \|\| appState\.fanIntent\.pending\) return false/);
  assert.match(join, /state\.pending = true/);
  assert.match(join, /state\.retry = selected/);
  assert.match(join, /externalCreationFailureCopy\(error\)/);
  assert.match(join, /state\.pending = false/);
  assert.doesNotMatch(join.slice(0, join.indexOf('try {')), /upsertCanonicalVenue|snapshot\.venues\.push|adjustFanCount/);
  assert.match(core, /Nothing was created; try again/);
});

test('external-search failure leaves existing CGB results available', () => {
  const failure = functionBlock(client, 'showExternalFailure', 'showExternalResults');
  assert.match(failure, /decorateExistingResults\(\)/);
  assert.match(failure, /replaceExternalGroup/);
  assert.doesNotMatch(failure, /replaceChildren|snapshot\.venues|locationList/);
  assert.match(core, /Existing CGB locations are still available/);
});

test('game switching clears stale external confirmation but keeps permanent canonical venues', () => {
  assert.match(client, /state\.selected\.gameId !== appState\.gameId/);
  assert.match(client, /state\.selected = null/);
  assert.doesNotMatch(client, /appState\.snapshot\.venues = \[\]/);
  assert.match(app, /state\.selectedVenueId = activeFanIntentVenueId\(gameId\)/);
});

test('missing-location fallback uses exact copy only when a valid URL is configured', () => {
  assert.match(client, /Can’t find the location\? Suggest it here\./);
  assert.match(client, /cgb-missing-location-form-url/);
  assert.match(client, /buildMissingLocationFormUrl/);
  assert.match(html, /name="cgb-missing-location-form-url" content="https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform"/);
  assert.match(html, /name="cgb-missing-location-form-place-name-entry" content="entry\.\d+"/);
  assert.doesNotMatch(html, /Nominate as a Cal Bar|Add a Photo|Suggest an Update/);
});

test('external search reuses the MapTiler key already loaded by the map and commits no new key literal', () => {
  assert.match(client, /findExistingMapTilerKey/);
  assert.match(client, /performance\.getEntriesByType\('resource'\)/);
  assert.match(client, /appState\.map\?\.getStyle/);
  assert.doesNotMatch(client, /const MAPTILER_KEY|[?&]key=[A-Za-z0-9_-]{8,}/);
  assert.match(core, /api\.maptiler\.com\/geocoding/);
});

test('external state is part of the canonical app state rather than a second app snapshot', () => {
  assert.match(appState, /externalSearch: \{/);
  assert.match(appState, /snapshot: null/);
  assert.doesNotMatch(client, /const state = \{[\s\S]*snapshot/);
  assert.doesNotMatch(client, /selectedGameId|venueSnapshot|fanIntentState/);
  assert.match(client, /appState\.externalSearch/);
});

test('mobile confirmation is bottom-sheet first and desktop remains responsive', () => {
  assert.match(css, /\.external-venue-dialog\s*\{[\s\S]*margin: auto 0 0/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /@media \(min-width: 700px\)/);
  assert.match(css, /@media \(max-width: 430px\) and \(orientation: landscape\)/);
});

test('existing Fan Intent client remains the authority for join, move, Undo, retry, and delegates refresh', () => {
  assert.match(fanClient, /controller\?\.performIntent/);
  assert.match(fanClient, /controller\?\.retryIntent/);
  assert.match(fanClient, /You’ll be here · Undo/);
  assert.match(fanClient, /CGBSnapshotRefresh\?\.refresh\?\.\(\)/);
  assert.doesNotMatch(client, /createFanIntentController|beginIntentTransaction/);
});

test('Apps Script routes external creation under the same lock and excludes later form automation', () => {
  assert.match(fanScript, /action === 'joinExternalVenue'/);
  assert.match(fanScript, /LockService\.getScriptLock\(\)/);
  assert.match(fanScript, /processJoinExternalVenueRequest_\(request\)/);
  assert.match(script, /findCanonicalExternalVenue_/);
  assert.match(script, /rollbackCreatedVenue_/);
  assert.doesNotMatch(`${script}\n${fanScript}`, /onFormSubmit|Watch_Party_Submissions_Raw.*append|Cal_Bar_Nominations_Raw.*append/);
});
