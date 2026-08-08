import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const loader = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('final profile is loaded after the prior mobile refinement layers', () => {
  assert.match(loader, /import '\.\/search-map-refinement\.mjs';[\s\S]*import '\.\/map-profile-final-pass\.mjs';/);
});

test('Community Location suppression is not a breakpoint-specific profile override', () => {
  assert.doesNotMatch(source, /badge--community/);
});

test('attendance uses an asymmetric large-number card for positive counts', () => {
  assert.match(source, /grid-template-columns: minmax\(0, 1fr\) 98px/);
  assert.match(source, /bear-count__number/);
  assert.match(source, /createIcon\('users'/);
  assert.match(source, /font-size: 2rem !important/);
});

test('zero attendance collapses to the invitation without a redundant numeral and label', () => {
  assert.match(source, /bear-count--empty[\s\S]*min-height: 64px !important/);
  assert.match(source, /if \(empty\) \{[\s\S]*prompt\.textContent = 'Be the first\.';[\s\S]*count\.replaceChildren\(icon, prompt\);[\s\S]*return;/);
});

test('attendance refinement refreshes source copy after live count text changes', () => {
  assert.match(source, /const alreadyRefined = Boolean\(count\.querySelector\('\.bear-count__number, \.bear-count__prompt'\)\)/);
  assert.match(source, /alreadyRefined[\s\S]*count\.dataset\.originalCopy[\s\S]*count\.textContent\.trim\(\)/);
});

test('Directions moves beside the location and Share sits beside RSVP', () => {
  assert.match(source, /selected-card__directions-inline/);
  assert.match(source, /location\.append\(directions\)/);
  assert.match(source, /grid-template-columns: minmax\(0, 2fr\) minmax\(96px, 1fr\)/);
  assert.match(source, /selected-card__share/);
  assert.match(source, /selected-card__details/);
});

test('Watch Party content is compact and reporting is subordinate', () => {
  assert.match(source, /party-module__title[\s\S]*display: none !important/);
  assert.match(source, /Event information/);
  assert.match(source, /Report an Issue/);
  assert.match(source, /party-module__report[\s\S]*font-size: \.64rem/);
});

test('final profile does not independently toggle selected tray density', () => {
  assert.doesNotMatch(source, /defaultSelectedTrayToCompact/);
  assert.doesNotMatch(source, /collapsedVenueId/);
  assert.doesNotMatch(source, /#tray-handle'\)\?\.click/);
  assert.match(source, /data-selected-density="compact"[\s\S]*selected-card__details[\s\S]*display: none !important/);
});

test('selected RSVP keeps Undo visually subordinate', () => {
  assert.match(source, /intent-button__undo/);
  assert.match(source, /font-size: \.68rem !important/);
  assert.match(source, /You’ll be here/);
});
