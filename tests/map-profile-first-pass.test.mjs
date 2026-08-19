import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const profile = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('profile pass no longer overrides shared branded header geometry', () => {
  assert.doesNotMatch(profile, /HEADER_OVERHANG/);
  assert.doesNotMatch(profile, /--header-height: calc\(176px/);
  assert.doesNotMatch(profile, /site-header__brand-row/);
  assert.doesNotMatch(profile, /opening-stat[\s\S]*display: grid !important/);
  assert.doesNotMatch(profile, /header-game-label/);
  assert.match(profile, /@media \(max-width: 899px\) \{/);
});

test('List fully replaces the map directly below the shared header and uses the peer destination rail', () => {
  assert.match(profile, /data-command-surface="list"\] #map[\s\S]*visibility: hidden !important/);
  assert.match(profile, /tray--full[\s\S]*position: fixed !important/);
  assert.match(profile, /inset: var\(--header-height\) 0 var\(--footer-height\) 0 !important/);
  assert.match(profile, /border-radius: 0 !important/);
  assert.match(profile, /tray-list__header[\s\S]*width: min\(100%, 34rem\) !important[\s\S]*display: block !important[\s\S]*padding: 16px 16px 0 !important/);
  assert.match(profile, /tray-list__header > div:first-child[\s\S]*padding: 0 0 11px !important[\s\S]*border-bottom: 1px solid var\(--cgb-neutral-200\) !important/);
  assert.match(profile, /tray-list__actions[\s\S]*justify-content: flex-start !important[\s\S]*margin: 12px 0 14px !important/);
  assert.match(profile, /#clear-search-button[\s\S]*min-height: 36px !important[\s\S]*border-radius: 999px !important/);
  assert.match(profile, /\.location-list[\s\S]*width: min\(100%, 34rem\) !important[\s\S]*padding: 0 16px 24px !important/);
});

test('Search language remains concise', () => {
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
