import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const client = await readFile(new URL('../js/fan-intent.js', import.meta.url), 'utf8');
const refresh = await readFile(new URL('../js/snapshot-refresh.mjs', import.meta.url), 'utf8');
const appState = await readFile(new URL('../js/app-state.mjs', import.meta.url), 'utf8');
const controller = await readFile(new URL('../js/fan-intent-controller.mjs', import.meta.url), 'utf8');
const core = await readFile(new URL('../js/fan-intent-core.mjs', import.meta.url), 'utf8');
const activity = await readFile(new URL('../js/venue-activity-core.mjs', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');
const readScript = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

const combinedPublicSource = `${html}\n${app}\n${client}\n${refresh}\n${appState}\n${controller}\n${core}\n${activity}\n${css}`;

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
  assert.match(html, /js\/snapshot-refresh\.mjs[\s\S]*js\/app\.js[\s\S]*js\/fan-intent\.js/);
});

test('Fan Intent integration uses explicit application lifecycle and render functions', () => {
  assert.match(app, /emitAppEvent\('rendered'/);
  assert.match(client, /subscribeAppEvent\('rendered', renderVenueActivity\)/);
  assert.match(client, /subscribeAppEvent\('rendered', renderIntentButtons\)/);
  assert.match(client, /selectionChanged[\s\S]*renderApplication\(\)[\s\S]*renderIntentButtons\(\)/);
  assert.match(app, /restoreSelection/);
});

test('attendance invitations are render-owned and derived from confirmed attendance', () => {
  assert.match(client, /subscribeAppEvent\('rendered', renderPostJoinInvitation\)/);
  assert.match(client, /const venueId = activeVenueId\(\)/);
  assert.match(client, /appState\.fanIntent\.pending/);
  assert.match(client, /getFanCount\(appState\.snapshot, appState\.gameId, venueId\) === 1/);
  assert.match(client, /intent\.insertAdjacentElement\('afterend', panel\)/);
  assert.doesNotMatch(client, /let postJoinInvitation|showPostJoinInvitation|clearPostJoinInvitation/);
  assert.doesNotMatch(client, /storageSet\([^\n]*postJoin|localStorage[^\n]*postJoin/i);
});

test('join, move, retry, and refresh share the same attendance-derived invitation rule', () => {
  assert.match(client, /controller\?\.performIntent\(intentButton\.dataset\.venueId\)/);
  assert.match(client, /controller\?\.retryIntent\(\)/);
  assert.match(client, /appState\.selectedVenueId !== venueId/);
  assert.doesNotMatch(client, /wasJoin|wasCommitment|retry\?\.action === 'join'|notifySuccessfulCommit/);
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

test('aggregate synchronization delegates to the single snapshot refresh controller', () => {
  assert.match(client, /window\.CGBSnapshotRefresh\?\.refresh/);
  assert.doesNotMatch(client, /AGGREGATE_REFRESH_MS|setInterval\(|visibilitychange|addEventListener\('focus'/);
  assert.match(refresh, /let inFlight = null/);
  assert.match(refresh, /if \(inFlight\) return inFlight/);
  assert.match(refresh, /ACTIVE_REFRESH_INTERVAL_MS = 15 \* 60 \* 1000/);
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

test('completed activity publishes cumulative season counts and standardized copy', () => {
  assert.match(script, /archiveCompletedFanIntentRowsUnlocked_/);
  assert.match(script, /status:'archived'|status: 'archived'/);
  assert.match(readScript, /archiveCompletedFanIntent_\(workbook\)/);
  assert.match(readScript, /venueSeasonCounts: buildVenueSeasonCounts_/);
  assert.match(readScript, /function buildVenueSeasonCounts_/);
  assert.match(activity, /Bears watched Cal games here this season/);
  assert.match(activity, /MIGRATED_ACTIVITY_SEASON = 2025/);
});

test('standardized activity presentation covers detail, selected-card, and list surfaces', () => {
  assert.match(client, /function renderDetailActivity/);
  assert.match(client, /function renderSelectedCardActivity/);
  assert.match(client, /function renderLocationCardActivity/);
  assert.match(client, /\.detail-description/);
  assert.match(client, /\.venue-description/);
  assert.match(client, /\.location-card__description/);
  assert.match(client, /venue-activity-history/);
  assert.match(client, /location-card__history/);
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
