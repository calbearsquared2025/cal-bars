import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const client = await readFile(new URL('../js/fan-intent.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../js/fan-intent-core.mjs', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');
const readScript = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

const combinedPublicSource = `${html}\n${client}\n${core}\n${css}`;

test('the existing application loads the separate Fan Intent client and visual states', () => {
  assert.match(html, /css\/fan-intent\.css/);
  assert.match(html, /js\/fan-intent\.js/);
  assert.match(css, /intent-button\[aria-pressed="true"\]/);
  assert.match(css, /intent-button\.is-pending/);
  assert.match(css, /intent-feedback/);
});

test('browser identity and one selection per game persist only in local storage', () => {
  assert.match(core, /cgb_v2_browser_id/);
  assert.match(core, /cgb_v2_fan_intent_selections/);
  assert.match(client, /withStoredSelection/);
  assert.match(client, /storageSet\(BROWSER_ID_STORAGE_KEY/);
  assert.match(client, /storageSet\(INTENT_SELECTIONS_STORAGE_KEY/);
});

test('join, move, withdraw, pending, rollback, and retry are represented', () => {
  assert.match(core, /return 'withdraw'/);
  assert.match(core, /return currentVenueId \? 'move' : 'join'/);
  assert.match(client, /fanState\.pending = operation/);
  assert.match(client, /fanState\.snapshot\.fanCounts = previousCounts/);
  assert.match(client, /className = 'text-button intent-retry'/);
  assert.match(client, /You’ll be here · Undo/);
});

test('write requests avoid a JSON preflight and use the configured Apps Script endpoint', () => {
  assert.match(client, /method: 'POST'/);
  assert.match(client, /Content-Type': 'text\/plain;charset=UTF-8'/);
  assert.match(client, /configuredEndpoint\(\)/);
  assert.doesNotMatch(combinedPublicSource, /script\.google\.com\/macros\/s\//);
});

test('current aggregates synchronize after writes and on a bounded refresh cadence', () => {
  assert.match(client, /applyAggregateResponse/);
  assert.match(client, /AGGREGATE_REFRESH_MS = 30000/);
  assert.match(client, /visibilitychange/);
  assert.match(client, /window\.addEventListener\('focus'/);
});

test('refresh and game switching restore the local selection', () => {
  assert.match(client, /restoreSelectedVenue/);
  assert.match(client, /fanState\.restorePending = true/);
  assert.match(client, /data-fan-intent-game-id|fanIntentGameId/);
});

test('write and read services archive completed activity while preserving public aggregates', () => {
  assert.match(script, /archiveCompletedFanIntentRowsUnlocked_/);
  assert.match(script, /status: 'archived'/);
  assert.match(readScript, /archiveCompletedFanIntent_\(workbook\)/);
  assert.match(script, /venueHistoryCounts: buildVenueHistoryCounts_/);
});

test('public responses and committed public files exclude private Fan Intent values', () => {
  const responseBlock = script.match(/return \{\n    ok: true,[\s\S]*?generatedAt: now\n  \};/)?.[0] || '';
  assert.match(responseBlock, /selection: activeSelection \?/);
  assert.doesNotMatch(responseBlock, /browserId|browser_id|fan_intent_id/);
  assert.doesNotMatch(combinedPublicSource, /browser_[A-Za-z0-9_-]{16,}/);
  assert.doesNotMatch(combinedPublicSource, /CGB_WORKBOOK_ID\s*=\s*['"][^'"]+['"]/);
});

test('Milestone 4 and later features remain excluded', () => {
  assert.doesNotMatch(client, /joinExternalVenue|externalPlace|createCommunityLocation/);
  assert.doesNotMatch(html, /Add a Photo|Suggest a Missing Location/i);
  assert.doesNotMatch(script, /Watch_Party_Submissions_Raw|onFormSubmit/);
});
