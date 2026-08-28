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

test('shared shell owns concise desktop contribution copy while mobile remains unchanged', () => {
  assert.match(shellSource, /add: 'Add to CGB'/);
  assert.match(shellSource, /mobile \? 'Add' : 'Add to Cal Golden Bars'/);
  assert.match(shellSource, /mobile \? 'Add to the map' : 'Add to Cal Golden Bars'/);
  assert.match(shellSource, /Choose what you’d like to contribute\./);
  assert.match(shellSource, /mobile \? 'Tell us about this location' : 'Tell us about a location'/);
  assert.match(shellSource, /mobile \? 'Add somewhere else' : 'New location'/);
  assert.match(shellSource, /mobile \? 'Search for another location' : 'Add a new location'/);
  assert.match(shellSource, /Can’t find it\? Suggest a missing location\./);
  assert.match(shellSource, /add: 'Add'/);
  assert.doesNotMatch(refinementSource, /function syncContributionCopy\(\)/);
});

test('desktop contribution actions leave selected-place context while mobile restores the original nesting', () => {
  assert.match(shellSource, /function syncContributionStructure\(\)/);
  assert.match(shellSource, /if \(isMobileLayout\(\)\) \{[\s\S]*dom\.addContext\.append\(dom\.addContextActions\)/);
  assert.match(shellSource, /dom\.addContext\.after\(dom\.addContextActions\)/);
  assert.match(shellSource, /addContextActions: document\.querySelector\('#add-surface \.add-context:not\(\.add-game-context\) > \.add-actions'\)/);
  assert.match(shellSource, /dom\.addSomewhereElseIntro\.hidden = !mobile/);
});

test('desktop no longer creates a list-specific Add location control', () => {
  assert.doesNotMatch(refinementSource, /list-add-location-button/);
  assert.doesNotMatch(refinementSource, /desktopListActions/);
  assert.doesNotMatch(refinementSource, /styleDesktopListAddButton/);
});
