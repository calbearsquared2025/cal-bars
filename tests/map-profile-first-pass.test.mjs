import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const profile = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Map Search Add and List keep the same complete branded header', () => {
  assert.match(profile, /--header-height: calc\(164px/);
  assert.match(profile, /site-header__brand-row[\s\S]*display: flex !important/);
  assert.match(profile, /opening-stat[\s\S]*display: grid !important/);
  assert.match(profile, /game-button__eyebrow[\s\S]*display: block !important/);
});

test('List is a full tab surface below the shared header', () => {
  assert.match(profile, /function openListSurface/);
  assert.match(profile, /setTrayState\('full'\)/);
  assert.match(profile, /tray--full[\s\S]*position: fixed !important/);
  assert.match(profile, /inset: calc\(var\(--header-height\) \+ 31px\) 0 var\(--footer-height\) 0 !important/);
  assert.match(profile, /border-radius: 0 !important/);
});

test('Search collapses a selected Venue into a compact identity tray', () => {
  assert.match(profile, /function prepareSearchSurface/);
  assert.match(profile, /setTrayState\('selected'\)/);
  assert.match(profile, /dataset\.selectedDensity = 'compact'/);
  assert.match(profile, /const COMPACT_TRAY_HEIGHT = 116/);
  assert.match(profile, /has-selected-venue/);
});

test('empty Watch Party state uses one compact planning action', () => {
  assert.match(profile, /Plan a Watch Party/);
  assert.match(profile, /#add-watch-party-button/);
  assert.match(profile, /selected-card__party-empty'\)\?\.remove/);
  assert.match(profile, /background: var\(--cgb-gold-50\) !important/);
  assert.doesNotMatch(profile, /No Watch Party listed/);
});

test('empty attendance copy removes are and places invitation on a second line', () => {
  assert.match(profile, /No Bears watching here yet\./);
  assert.match(profile, /Be the first\./);
  assert.match(profile, /replaceChildren\(status, invitation\)/);
});

test('secondary actions use the full tray width in three equal columns', () => {
  assert.match(profile, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(profile, /justify-self: stretch !important/);
  assert.match(profile, /width: 100% !important/);
  assert.match(profile, /node\.textContent = 'Details'/);
  assert.match(icons, /label === 'view details' \|\| label === 'details'/);
});

test('guidance highlight and arrow are removed and search language is explicit', () => {
  assert.match(profile, /venue-tray\.venue-tray::before[\s\S]*display: none !important/);
  assert.match(profile, /tray-summary__chevron[\s\S]*display: none !important/);
  assert.match(profile, /Search Cal Golden Bars or add another location to the map\./);
});

test('profile refinement remains loaded by the existing icon entry module', () => {
  assert.match(icons, /import '\.\/map-profile-first-pass\.mjs';/);
});
