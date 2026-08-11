import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildVenueShareMessage, shareOrCopy } from '../js/core.mjs';

const appSource = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

const url = 'https://example.com/?venue=george-and-walts&game=game_1';

test('standard venue share uses the approved invitation copy exactly', () => {
  assert.equal(buildVenueShareMessage({
    venueName: 'George & Walt’s',
    opponentName: 'UCLA',
    url
  }), `I’ll be at George & Walt’s for Cal vs. UCLA. Join me: ${url}`);
});

test('Watch Party share uses the approved invitation copy exactly', () => {
  assert.equal(buildVenueShareMessage({
    venueName: 'George & Walt’s',
    opponentName: 'UCLA',
    hasWatchParty: true,
    url
  }), `I’ll be at George & Walt’s for a Cal vs. UCLA watch party. Join me: ${url}`);
});

test('share fallback copies the complete invitation instead of a bare link', async () => {
  const message = `I’ll be at George & Walt’s for Cal vs. UCLA. Join me: ${url}`;
  let copied = '';
  const result = await shareOrCopy({
    payload: { text: message },
    copyText: message,
    writeClipboard: async (text) => { copied = text; }
  });
  assert.deepEqual(result, { method: 'clipboard' });
  assert.equal(copied, message);
});

test('app keeps one share owner and removes superseded share copy', () => {
  assert.match(appSource, /buildVenueShareMessage/);
  assert.match(appSource, /copyText: payload\.text/);
  assert.match(appSource, /showStatus\('Message copied'\)/);
  assert.match(appSource, /Copy this message/);
  assert.doesNotMatch(appSource, /Join the Bears|I'm watching|shareGameLabel/);
});
