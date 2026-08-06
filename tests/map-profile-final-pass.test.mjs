import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const loader = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('final profile is loaded after the prior mobile refinement layers', () => {
  assert.match(loader, /import '\.\/search-map-refinement\.mjs';[\s\S]*import '\.\/map-profile-final-pass\.mjs';/);
});

test('generic Community Location badges are omitted from consumer cards', () => {
  assert.match(source, /selected-card \.badge--community/);
  assert.match(source, /location-card \.badge--community/);
});

test('attendance uses an asymmetric large-number card', () => {
  assert.match(source, /grid-template-columns: minmax\(0, 1fr\) 98px/);
  assert.match(source, /bear-count__number/);
  assert.match(source, /createIcon\('users'/);
  assert.match(source, /font-size: 2rem !important/);
});

test('Directions moves beside the location and Share sits beside RSVP', () => {
  assert.match(source, /selected-card__directions-inline/);
  assert.match(source, /location\.append\(directions\)/);
  assert.match(source, /grid-template-columns: minmax\(0, 2fr\) minmax\(96px, 1fr\)/);
  assert.match(source, /selected-card__share/);
});

test('obsolete hidden Details action is removed rather than restyled', () => {
  assert.match(source, /const details = actions\.find/);
  assert.match(source, /details\?\.remove\(\)/);
  assert.doesNotMatch(source, /createIcon\('details'/);
  assert.doesNotMatch(source, /selected-card__details\s*\{/);
});

test('Watch Party content is compact and reporting is subordinate', () => {
  assert.match(source, /party-module__title[\s\S]*display: none !important/);
  assert.match(source, /Event information/);
  assert.match(source, /Report an Issue/);
  assert.match(source, /party-module__report[\s\S]*font-size: \.64rem/);
});

test('tray density has one owner and no click-driven compact workaround', () => {
  assert.doesNotMatch(source, /collapsedVenueId/);
  assert.doesNotMatch(source, /defaultSelectedTrayToCompact/);
  assert.doesNotMatch(source, /#tray-handle'\)\?\.click/);
  assert.match(source, /data-selected-density="compact"[\s\S]*party-module[\s\S]*display: grid !important/);
});

test('selected RSVP keeps Undo visually subordinate', () => {
  assert.match(source, /intent-button__undo/);
  assert.match(source, /font-size: \.68rem !important/);
  assert.match(source, /You’ll be here/);
});
