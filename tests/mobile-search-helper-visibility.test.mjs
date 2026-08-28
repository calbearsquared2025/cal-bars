import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile search helper stays hidden until the query is non-empty', async () => {
  const [helperSource, bootstrapSource] = await Promise.all([
    read('js/mobile-search-helper-visibility.mjs'),
    read('js/icon-upgrade.mjs')
  ]);

  assert.match(bootstrapSource, /import '\.\/mobile-search-helper-visibility\.mjs';/);
  assert.match(helperSource, /@media \(max-width: 899px\)/);
  assert.match(helperSource, /#location-search:has\(#location-query:placeholder-shown\) #search-dropdown/);
  assert.match(helperSource, /display: none !important;/);
});
