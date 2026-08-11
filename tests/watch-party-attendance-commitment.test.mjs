import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const moduleSource = await readFile(new URL('js/watch-party-attendance-commitment.mjs', root), 'utf8');
const bootstrapSource = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Watch Party form launches reuse existing Fan Intent before navigation', () => {
  assert.match(bootstrapSource, /import '\.\/watch-party-attendance-commitment\.mjs'/);
  assert.match(moduleSource, /cgb-watch-party-form-url/);
  assert.match(moduleSource, /cgb-watch-party-venue-id-entry/);
  assert.match(moduleSource, /cgb-watch-party-game-id-entry/);
  assert.match(moduleSource, /activeVenueId\(context\.gameId\) === context\.venueId/);
  assert.match(moduleSource, /\.intent-button\[data-venue-id=/);
  assert.match(moduleSource, /button\.click\(\)/);
  assert.match(moduleSource, /await waitForIntentButton\(venueId\)/);
  assert.match(moduleSource, /commitAttendance\(context\.venueId, context\.gameId\)\.then/);
  assert.match(moduleSource, /navigatePreparedWindow\(preparedWindow, href\)/);
});

test('Watch Party attendance coupling does not expose or transport browser identity', () => {
  assert.doesNotMatch(moduleSource, /browserId|browser_id|BROWSER_ID_STORAGE_KEY/);
  assert.doesNotMatch(moduleSource, /fetch\(|XMLHttpRequest|postIntent/);
});
