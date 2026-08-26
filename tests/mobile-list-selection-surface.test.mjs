import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile location-list selection resets the command surface before venue selection renders', async () => {
  const source = await readFile(new URL('../js/shell-controls.mjs', import.meta.url), 'utf8');

  assert.match(source, /function handleMobileLocationListSelection\(event\)[\s\S]*#location-list \.location-card\[data-venue-id\][\s\S]*setSurface\('map'\)/);
  assert.match(source, /document\.addEventListener\('click', handleMobileLocationListSelection, \{ capture: true \}\)/);
});
