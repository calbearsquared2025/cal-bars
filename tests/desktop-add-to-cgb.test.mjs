import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const refinementSource = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('../js/shell-controls.mjs', import.meta.url), 'utf8');

test('desktop reuses the shared Add command as a global CGB contribution entry', () => {
  assert.match(refinementSource, /function syncDesktopContributionEntry\(\)/);
  assert.match(refinementSource, /#mobile-add-button/);
  assert.match(refinementSource, /gridTemplateColumns = 'minmax\(0, 1fr\) minmax\(0, 1fr\) 10px auto'/);
  assert.match(refinementSource, /gridColumn: '4'/);
  assert.match(refinementSource, /height: '34px'/);
  assert.match(refinementSource, /background: 'var\(--cgb-gold-50/);
  assert.match(refinementSource, /border: '1px solid var\(--cgb-gold-500/);
  assert.match(refinementSource, /whiteSpace: 'nowrap'/);
});

test('desktop Add keeps the shared search form inside the contribution modal', () => {
  assert.match(refinementSource, /function ensureDesktopAddSearchSlot\(\)/);
  assert.match(refinementSource, /desktop-add-search-slot/);
  assert.match(refinementSource, /if \(form\.parentElement !== slot\) slot\.append\(form\)/);
  assert.match(refinementSource, /state\.searchMode = 'add-location'/);
  assert.match(refinementSource, /input\.placeholder = 'Venue or address'/);
  assert.match(refinementSource, /#add-surface #add-new-location-button/);
  assert.match(refinementSource, /#add-surface #add-missing-location-link/);
  assert.match(refinementSource, /#add-surface \.add-somewhere-else > \.add-actions/);
});

test('desktop contribution copy explains existing and unlisted location paths', () => {
  assert.match(refinementSource, /To add a Watch Party, contribute details, or report a problem for a location already in CGB, select it on the map or in Locations first/);
  assert.match(refinementSource, /If the place isn’t listed yet, search below to add it/);
  assert.match(refinementSource, /Choose an action for this location\. To add a different place, search below\./);
  assert.match(refinementSource, /venue \? 'Different location\?' : 'Place not listed yet\?'/);
  assert.match(refinementSource, /Search for the venue or address below\./);
  assert.match(refinementSource, /Search for a venue or address that isn’t listed in CGB yet\./);
  assert.match(shellSource, /add: 'Add to CGB'/);
  assert.match(shellSource, /add: 'Add'/);
});

test('normal desktop Search still uses the contextual helper only after typing', () => {
  assert.match(refinementSource, /const showSearchHelper = existingMode && desktopSearchEngaged && Boolean\(query\)/);
  assert.match(refinementSource, /button\.hidden = !showSearchHelper/);
  assert.match(refinementSource, /Search for another location\./);
  assert.match(refinementSource, /#search-add-location-button/);
});

test('desktop inline Add search suppresses missing-location fallback while valid results exist', () => {
  assert.match(refinementSource, /function syncDesktopMissingLocationFallback\(\)/);
  assert.match(refinementSource, /button\[data-venue-id\], button\[data-external-place-id\]/);
  assert.match(refinementSource, /link\.style\.display = hasResult \? 'none' : ''/);
  assert.match(refinementSource, /MutationObserver/);
});

test('desktop no longer creates a list-specific Add location control', () => {
  assert.doesNotMatch(refinementSource, /list-add-location-button/);
  assert.doesNotMatch(refinementSource, /desktopListActions/);
  assert.doesNotMatch(refinementSource, /styleDesktopListAddButton/);
});
