import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const moduleSource = await readFile(new URL('js/watch-party-attendance-commitment.mjs', root), 'utf8');
const bootstrapSource = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Watch Party form launches reuse existing Fan Intent', () => {
  assert.match(bootstrapSource, /import '\.\/watch-party-attendance-commitment\.mjs'/);
  assert.match(moduleSource, /cgb-watch-party-form-url/);
  assert.match(moduleSource, /cgb-watch-party-venue-id-entry/);
  assert.match(moduleSource, /cgb-watch-party-game-id-entry/);
  assert.match(moduleSource, /\.intent-button\[data-venue-id=/);
  assert.match(moduleSource, /button\.click\(\)/);
  assert.match(moduleSource, /await waitForIntentButton\(venueId\)/);
  assert.match(moduleSource, /commitAttendance\(context\.venueId, context\.gameId\)\.then/);
});

test('selected venue Plan a Watch Party bypasses Add and opens the prefilled form immediately', () => {
  assert.match(moduleSource, /\.selected-card__plan-party/);
  assert.match(moduleSource, /selectedVenueWatchPartyContext/);
  assert.match(moduleSource, /buildCommittedExternalVenueWatchPartyUrl/);
  assert.match(moduleSource, /event\.stopImmediatePropagation\(\)/);
  const selectedHandler = moduleSource.slice(
    moduleSource.indexOf('function handleSelectedVenuePlan'),
    moduleSource.indexOf('function handleWatchPartyFormLaunch')
  );
  assert.match(selectedHandler, /openExternalUrl\(context\.href\)/);
  assert.match(selectedHandler, /commitAttendance\(context\.venueId, context\.gameId\)/);
  assert.doesNotMatch(selectedHandler, /showAdd|add-surface|mobile-add-button/);
});

test('generic Watch Party form links still wait for attendance before navigation', () => {
  assert.match(moduleSource, /openWaitingWindow\(\)/);
  assert.match(moduleSource, /navigatePreparedWindow\(preparedWindow, href\)/);
});

test('Watch Party attendance coupling does not expose or transport browser identity', () => {
  assert.doesNotMatch(moduleSource, /browserId|browser_id|BROWSER_ID_STORAGE_KEY/);
  assert.doesNotMatch(moduleSource, /fetch\(|XMLHttpRequest|postIntent/);
});
