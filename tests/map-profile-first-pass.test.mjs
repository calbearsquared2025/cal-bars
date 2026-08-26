import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const profile = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');
const selected = await readFile(new URL('js/selected-profile-renderer.mjs', root), 'utf8');

test('profile pass no longer overrides shared branded header geometry', () => {
  assert.doesNotMatch(profile, /HEADER_OVERHANG/);
  assert.doesNotMatch(profile, /--header-height: calc\(176px/);
  assert.doesNotMatch(profile, /site-header__brand-row/);
  assert.doesNotMatch(profile, /opening-stat[\s\S]*display: grid !important/);
  assert.doesNotMatch(profile, /header-game-label/);
  assert.match(profile, /@media \(max-width: 899px\) \{/);
});

test('List fully replaces the map while static CSS owns its destination header', () => {
  assert.match(profile, /data-command-surface="list"\] #map[\s\S]*visibility: hidden !important/);
  assert.match(profile, /tray--full[\s\S]*position: fixed !important/);
  assert.match(profile, /inset: var\(--header-height\) 0 var\(--footer-height\) 0 !important/);
  assert.match(profile, /border-radius: 0 !important/);
  assert.doesNotMatch(profile, /tray-list__header|tray-list__toolbar|clear-search-button|location-list/);
});

test('profile pass does not override canonical Search-mode language', () => {
  assert.doesNotMatch(profile, /setSearchLanguage|search-surface.*command-surface__intro|Search Cal Golden Bars or add another location/);
});

test('selected profile uses a restrained identity band and compact contribution action', () => {
  assert.match(profile, /selected-card__header[\s\S]*background: linear-gradient/);
  assert.match(profile, /border-left: 0 !important/);
  assert.match(profile, /selected-card__plan-party/);
  assert.match(selected, /selected-card__plan-party/);
  assert.doesNotMatch(profile, /addPlanWatchPartyAction|panel\.className = 'selected-card__party-empty'/);
});

test('attendance rendering is delegated while secondary actions remain readable', () => {
  assert.doesNotMatch(profile, /formatEmptyAttendance/);
  assert.doesNotMatch(profile, /bear-count--empty/);
  assert.match(profile, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(profile, /normalizeActionLabels|More About This Location/);
  assert.match(selected, /More About This Location/);
});

test('profile pass no longer owns an intermediate selected density', () => {
  assert.doesNotMatch(profile, /COMPACT_TRAY_HEIGHT|prepareSearchSurface|selectedDensity|data-selected-density/);
  assert.match(icons, /import '\.\/map-profile-first-pass\.mjs';/);
});
