import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const profile = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('shared mobile header remains consistent across Search Add and List', () => {
  assert.match(profile, /data-command-surface="search"[\s\S]*data-command-surface="add"[\s\S]*data-command-surface="list"/);
  assert.match(profile, /--header-height: calc\(164px/);
  assert.match(profile, /site-header__brand-row[\s\S]*display: flex !important/);
  assert.match(profile, /game-button__eyebrow[\s\S]*display: block !important/);
});

test('empty Watch Party state offers a direct planning action', () => {
  assert.match(profile, /No Watch Party listed/);
  assert.match(profile, /Plan a Watch Party/);
  assert.match(profile, /#add-watch-party-button/);
  assert.match(profile, /selected-card__party-empty/);
});

test('empty attendance copy removes are and places invitation on a second line', () => {
  assert.match(profile, /No Bears watching here yet\./);
  assert.match(profile, /Be the first\./);
  assert.match(profile, /bear-count--empty/);
  assert.match(profile, /replaceChildren\(status, invitation\)/);
});

test('secondary actions retain visible labels and compact equal-width layout', () => {
  assert.match(profile, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(profile, /font-size: \.66rem !important/);
  assert.match(profile, /node\.textContent = 'Details'/);
  assert.match(icons, /label === 'view details' \|\| label === 'details'/);
});

test('profile refinement is loaded by the existing icon entry module', () => {
  assert.match(icons, /import '\.\/map-profile-first-pass\.mjs';/);
});
