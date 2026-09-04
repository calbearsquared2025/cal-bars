import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('search helper waits for settled user input instead of focus or first paint', async () => {
  const [appSource, refinementSource, iconSource] = await Promise.all([
    read('js/app.js'),
    read('js/search-map-refinement.mjs'),
    read('js/icon-upgrade.mjs')
  ]);

  assert.match(appSource, /const SEARCH_HELPER_DEBOUNCE_MS = 600;/);
  assert.match(appSource, /state\.searchMode === 'existing' && searchHelperReady && Boolean\(query\)/);
  assert.match(appSource, /if \(!query\) \{[\s\S]*?resetSearchHelper\(\);[\s\S]*?dom\.searchDropdown\.hidden = true;/);
  assert.match(appSource, /dom\.searchInput\.addEventListener\('input', \(\) => \{[\s\S]*?scheduleSearchHelper\(\);[\s\S]*?renderSuggestions\(\);/);
  assert.match(appSource, /dom\.searchInput\.addEventListener\('focus', renderSuggestions\);/);
  assert.match(appSource, /dom\.searchForm\.addEventListener\('focusout'/);
  assert.doesNotMatch(refinementSource, /desktopSearchEngaged/);
  assert.doesNotMatch(iconSource, /MOBILE_SEARCH_HELPER_STYLE_ID|placeholder-shown/);
});
