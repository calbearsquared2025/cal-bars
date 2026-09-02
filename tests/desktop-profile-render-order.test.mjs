import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop profile enhancement unwraps the previous opening before inserting refreshed sections', async () => {
  const source = await read('js/venue-profile-enhancement.mjs');

  assert.match(source, /function unwrapExistingDesktopOpening\(detail\)/);
  assert.match(source, /const nodes = \[\.\.\.opening\.children\]\.flatMap\(\(column\) => \[\.\.\.column\.children\]\);/);
  assert.match(source, /opening\.replaceWith\(\.\.\.nodes\);/);

  const enhancement = source.match(/export function enhanceVenueProfile\([\s\S]*?\n\}/)?.[0] || '';
  assert.match(
    enhancement,
    /const detail = documentObject\.querySelector\('#venue-detail'\);\s*unwrapExistingDesktopOpening\(detail\);\s*const hero = detail\?\.querySelector\(':scope > \.detail-hero'\);/
  );
});
