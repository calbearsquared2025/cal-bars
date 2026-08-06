import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const loader = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('final profile remains the governing selected-venue hierarchy', () => {
  assert.match(loader, /import '\.\/map-profile-final-pass\.mjs';/);
  assert.match(source, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(source, /padding: 0 var\(--mobile-content-gutter\) 16px/);
  assert.doesNotMatch(source, /98px|minmax\(112px, 34%\)/);
});

test('expanded venue identity supports two lines and title navigation', () => {
  assert.match(source, /selected-card h2[\s\S]*overflow-wrap: anywhere/);
  assert.match(source, /line-height: 1\.12/);
  assert.match(source, /function ensureTitleLink/);
  assert.match(source, /selected-card__title-link/);
});

test('attendance is full-width Inter sentence copy rather than a side card', () => {
  assert.match(source, /\.bear-count,[\s\S]*font-family: var\(--font-ui\)/);
  assert.match(source, /-webkit-line-clamp: 2/);
  assert.match(source, /text-transform: none/);
  assert.doesNotMatch(source, /bear-count__number|createIcon\('users'/);
});

test('compact tray keeps identity metadata and activity while hiding expanded content', () => {
  assert.match(source, /data-selected-density="compact"[\s\S]*selected-card h2[\s\S]*white-space: nowrap/);
  assert.match(source, /data-selected-density="compact"[\s\S]*\.bear-count[\s\S]*display: block/);
  assert.match(source, /data-selected-density="compact"[\s\S]*\.party-module,[\s\S]*\.action-row[\s\S]*display: none/);
});

test('expanded Watch Party content is limited to host and critical restriction', () => {
  assert.match(source, /party-module__host/);
  assert.match(source, /party-module__critical/);
  assert.match(source, /:not\(\.party-module__host\):not\(\.party-module__critical\)/);
  assert.match(source, /restriction\|reservation\|required\|ticket\|cover/);
});

test('participation is the sole primary action with separate tertiary Undo', () => {
  assert.match(source, /background: var\(--cgb-gold-400\)/);
  assert.match(source, /min-height: 50px/);
  assert.match(source, /You’ll be here/);
  assert.match(source, /className = 'intent-undo'/);
  assert.match(source, /dataset\.undoProxy = 'true'/);
});

test('Directions and Share are secondary while Details remains tertiary', () => {
  assert.match(source, /selected-card__directions-inline/);
  assert.match(source, /selected-card__share/);
  assert.match(source, /selected-card__details/);
  assert.match(source, /details\.textContent = 'Details'/);
  assert.doesNotMatch(source, /details\?\.remove\(\)/);
});

test('the work package adds no important declaration', () => {
  assert.doesNotMatch(source, /!important/);
});
