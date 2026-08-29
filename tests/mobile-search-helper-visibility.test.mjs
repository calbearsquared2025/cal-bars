import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/icon-upgrade.mjs', import.meta.url), 'utf8');

test('mobile search helper stays hidden until the query is non-empty', () => {
  assert.match(source, /MOBILE_SEARCH_HELPER_STYLE_ID/);
  assert.match(source, /@media \(max-width: 899px\)/);
  assert.match(source, /#location-search:has\(#location-query:placeholder-shown\) #search-dropdown/);
  assert.match(source, /display: none !important;/);
  assert.match(source, /function installMobileSearchHelperVisibility\(\)/);
  assert.match(source, /installMobileSearchHelperVisibility\(\);/);
});
