import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop profile enhancement unwraps the previous opening before inserting refreshed sections', async () => {
  const source = await read('js/venue-profile-enhancement.mjs');

  assert.match(source, /function unwrapExistingDesktopOpening\(detail\)/);
  assert.match(source, /const nodes = \[\.\.\.opening\.children\]\.flatMap\(\(column\) => \[\.\.\.column\.children\]\);/);
  assert.match(source, /opening\.replaceWith\(\.\.\.nodes\);/);
  assert.match(
    source,
    /export function enhanceVenueProfile\([\s\S]*?const detail = documentObject\.querySelector\('#venue-detail'\);\s*unwrapExistingDesktopOpening\(detail\);\s*const hero = detail\?\.querySelector\(':scope > \.detail-hero'\);/
  );
});

test('desktop final balance keeps CGB Says as a normal top-level block after Watch Party content', async () => {
  const source = await read('js/desktop-profile-final-balance.mjs');

  assert.match(source, /const editorial = detail\.querySelector\(':scope > \.detail-editorial'\)/);
  assert.match(source, /partySections\.forEach\(\(partySection\) => \{ cursor = placeAfter\(cursor, partySection\); \}\);[\s\S]*?cursor = placeAfter\(cursor, editorial\);/);
  assert.doesNotMatch(source, /\[data-desktop-photo-forward="true"\] > \.detail-editorial/);
  assert.doesNotMatch(source, /\[data-desktop-fallback-map="true"\] > \.detail-editorial/);
});
