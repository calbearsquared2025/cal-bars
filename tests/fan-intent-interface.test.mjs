import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const client = await readFile(new URL('../js/fan-intent.js', import.meta.url), 'utf8');
const appState = await readFile(new URL('../js/app-state.mjs', import.meta.url), 'utf8');
const controller = await readFile(new URL('../js/fan-intent-controller.mjs', import.meta.url), 'utf8');
const core = await readFile(new URL('../js/fan-intent-core.mjs', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');
const readScript = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

const combinedPublicSource = `${html}\n${app}\n${client}\n${appState}\n${controller}\n${core}\n${css}`;

test('the application and Fan Intent controller share one canonical frontend state module', () => {
  assert.match(app, /appState as state/);
  assert.match(client, /import \{ appState,/);
  assert.match(appState, /snapshot: null/);
  assert.doesNotMatch(client, /snapshot:\s*null/);
  assert.match(app, /setCanonicalSnapshot/);
});

test('startup loads the public snapshot only through the application data path', () => {
  assert.match(app, /async function loadSnapshot\(\)/);
  assert.match(app, /data\/fallback-v2\.json/);
  assert.doesNotMatch(client, /function loadSnapshot|data\/fallback-v2\.json|LAST_GOOD_KEY/);
  assert.match(html, /js\/app\.js[\s\S]*js\/fan-intent\.js/);
});

test('Fan Intent integration uses explicit application lifecycle and render functions', () => {
  assert.match(app, /emitAppEvent\('rendered'/);
  assert.match(client, /subscribeAppEvent\('rendered', renderFanIntentUi\)/);
  assert.match(client, /window\.CGBApp\?\.render\(\)/);
  assert.match(app, /refreshSnapshot/);
  assert.match(app, /restoreSelection/);
});

test('the body-wide MutationObserver and DOM venue inference fallbacks are removed', () => {
  assert.doesNotMatch(client, /MutationObserver/);
  assert.doesNotMatch(client, /document\.body/);
  assert.doesNotMatch(
    client,
    /dataset\.venueName|dataset\.venueSlug|closest\([^)]*location-card[^)]*\)[\s\S]*textContent/i
  );
  assert.match(client, /\.intent-button\[data-venue-id\]/);
});

test('the renderer assigns stable venue IDs to markers, cards, actions, and detail content', () => {
  assert.match(app, /button\.dataset\.venueId = venue\.venue_id/);
  assert.match(app, /card\.dataset\.venueId = venue\.venue_id/);
  assert.match(app, /row\.dataset\.venueId = venue\.venue_id/);
  assert.match(app, /intent\.dataset\.venueId = venue\.venue_id/);
  assert.match(app, /dom\.venueDetail\.dataset\.venueId = venue\.venue_id/);
});

test('join, move, withdraw, pending, rollback, and retry remain represented', () => {
  assert.match(core, /return 'withdraw'/);
  assert.match(core, /return currentVenueId \? 'move' : 'join'/);
  assert.match(controller, /fanState\.pending = transaction\.operation/);
  assert.match(controller, /rollbackIntentTransaction/);
  assert.match(client, /className = 'text-button intent-retry'/);
  assert.match(client, /You’ll be here · Undo/);
});

test('write requests retain the public Apps Script API contract', () => {
  assert.match(client, /method: 'POST'/);
  assert.match(client, /Content-Type': 'text\/plain;charset=UTF-8'/);
  assert.match(client, /configuredEndpoint\(\)/);
  assert.match(
    html,
    /name="cgb-data-endpoint"[\s\S]*content="https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec"/
  );
  assert.doesNotMatch(client, /script\.google\.com\/macros\/s\//);
  assert.match(script, /CGB_FAN_INTENT_ACTIONS/);
});

test('aggregate synchronization uses the shared application refresh path', () => {
  assert.match(client, /AGGREGATE_REFRESH_MS = 30000/);
  assert.match(client, /window\.CGBApp\?\.refreshSnapshot/);
  assert.match(client, /visibilitychange/);
  assert.match(client, /window\.addEventListener\('focus'/);
  assert.doesNotMatch(client, /applyAggregateResponse/);
});

test('refresh, game switching, direct URLs, and cross-tab state use canonical game selection', () => {
  assert.match(app, /activeFanIntentVenueId\(gameId\)/);
  assert.match(app, /requestedGame/);
  assert.match(app, /venueSlug/);
  assert.match(app, /state\.detailMode \? selectedVenue\(\) : null/);
  assert.match(app, /buildVenueUrl\(venue\.slug, state\.gameId/);
  assert.match(client, /window\.addEventListener\('storage'/);
  assert.match(client, /restoreSelection/);
});

test('write and read services archive completed activity while preserving public aggregates', () => {
  assert.match(script, /archiveCompletedFanIntentRowsUnlocked_/);
  assert.match(script, /status:'archived'|status: 'archived'/);
  assert.match(readScript, /archiveCompletedFanIntent_\(workbook\)/);
  assert.match(
    script,
    /venueHistoryCounts:buildVenueHistoryCounts_|venueHistoryCounts: buildVenueHistoryCounts_/
  );
});

test('public responses and committed public files exclude private Fan Intent values', () => {
  assert.doesNotMatch(combinedPublicSource, /browser_[A-Za-z0-9_-]{16,}/);
  assert.doesNotMatch(combinedPublicSource, /CGB_WORKBOOK_ID\s*=\s*['"][^'"]+['"]/);
  const responseBlock = script.match(/return \{ok:true,[\s\S]*?generatedAt:now\};/)?.[0] || '';
  assert.doesNotMatch(responseBlock, /browserId|browser_id|fan_intent_id/);
});

test('Milestone 4 external-search behavior remains excluded', () => {
  assert.doesNotMatch(client, /joinExternalVenue|externalPlace|createCommunityLocation/);
  assert.doesNotMatch(app, /joinExternalVenue|externalPlace|createCommunityLocation/);
  assert.doesNotMatch(html, /Add a Photo|Suggest a Missing Location/i);
  assert.doesNotMatch(script, /onFormSubmit/);
});
