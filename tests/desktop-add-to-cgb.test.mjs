import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');

test('desktop reuses the shared Add command as a global CGB contribution entry', () => {
  assert.match(source, /function syncDesktopContributionEntry\(\)/);
  assert.match(source, /#mobile-add-button/);
  assert.match(source, /gridTemplateColumns = 'minmax\(0, 1fr\) minmax\(0, 1fr\) 10px auto'/);
  assert.match(source, /gridColumn: '4'/);
  assert.match(source, /height: '34px'/);
  assert.match(source, /background: 'var\(--cgb-gold-50/);
  assert.match(source, /border: '1px solid var\(--cgb-gold-500/);
  assert.match(source, /whiteSpace: 'nowrap'/);
});

test('desktop Add copy describes a global contribution action while mobile remains Add', () => {
  assert.match(source, /label\.textContent = 'Add to CGB'/);
  assert.match(source, /button\.setAttribute\('aria-label', 'Add to Cal Golden Bars'\)/);
  assert.match(source, /title\.textContent = 'Add to Cal Golden Bars'/);
  assert.match(source, /Add a Watch Party, contribute details, or add another location\./);
  assert.match(source, /label\.textContent = 'Add'/);
  assert.match(source, /title\.textContent = 'Add to the map'/);
});

test('desktop no longer creates a list-specific Add location control', () => {
  assert.doesNotMatch(source, /list-add-location-button/);
  assert.doesNotMatch(source, /desktopListActions/);
  assert.doesNotMatch(source, /styleDesktopListAddButton/);
});
