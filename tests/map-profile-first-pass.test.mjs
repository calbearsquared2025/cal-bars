import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const profile = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('shared mobile header uses one taller geometry without overlapping the statistics plane', () => {
  assert.match(profile, /--header-height: calc\(176px/);
  assert.match(profile, /HEADER_OVERHANG = 31/);
  assert.match(profile, /data-command-surface="search"[\s\S]*data-command-surface="add"[\s\S]*data-command-surface="list"/);
  assert.match(profile, /opening-stat[\s\S]*display: grid !important/);
});

test('List fully replaces the map below the shared header', () => {
  assert.match(profile, /data-command-surface="list"\] #map[\s\S]*visibility: hidden !important/);
  assert.match(profile, /tray--full[\s\S]*position: fixed !important/);
  assert.match(profile, /inset: calc\(var\(--header-height\) \+ \$\{HEADER_OVERHANG\}px\) 0 var\(--footer-height\) 0/);
  assert.match(profile, /border-radius: 0 !important/);
});

test('Search has one focus outline and no nested input highlight', () => {
  assert.match(profile, /search-field:focus-within/);
  assert.match(profile, /search-field input:focus-visible[\s\S]*box-shadow: none !important/);
  assert.match(profile, /Search Cal Golden Bars or add another location to the map\./);
});

test('selected profile uses a restrained identity band and compact contribution action', () => {
  assert.match(profile, /selected-card__header[\s\S]*background: linear-gradient/);
  assert.match(profile, /border-left: 4px solid var\(--cgb-navy-900\)/);
  assert.match(profile, /selected-card__plan-party/);
  assert.doesNotMatch(profile, /panel\.className = 'selected-card__party-empty'/);
});

test('attendance rendering is delegated while secondary actions remain readable', () => {
  assert.doesNotMatch(profile, /formatEmptyAttendance/);
  assert.doesNotMatch(profile, /bear-count--empty/);
  assert.match(profile, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(profile, /node\.textContent = 'Details'/);
});

test('profile pass no longer owns an intermediate selected density', () => {
  assert.doesNotMatch(profile, /COMPACT_TRAY_HEIGHT|prepareSearchSurface|selectedDensity|data-selected-density/);
  assert.match(icons, /import '\.\/map-profile-first-pass\.mjs';/);
});
