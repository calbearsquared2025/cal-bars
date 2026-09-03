import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/map-profile-first-pass.mjs', import.meta.url), 'utf8');

test('mobile List capture hides every peer command surface before activating List', () => {
  assert.match(source, /#search-surface'\)\?\.setAttribute\('hidden', ''\)/);
  assert.match(source, /#add-surface'\)\?\.setAttribute\('hidden', ''\)/);
  assert.match(source, /#about-surface'\)\?\.setAttribute\('hidden', ''\)/);
  assert.match(source, /setTrayState\('full'\)/);
  assert.match(source, /setCommandActive\('list'\)/);
});
