import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('wide desktop expands only the selected profile and keeps browse width unchanged', async () => {
  const [shellCss, profileCss] = await Promise.all([
    read('css/design-board-4.css'),
    read('css/venue-profile.css')
  ]);

  assert.match(shellCss, /\.venue-tray\s*\{[\s\S]*?width:\s*min\(390px, 34vw\);/);
  assert.match(profileCss, /@media \(min-width: 1100px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*clamp\(500px, 36vw, 520px\)\s*!important;/);
  assert.match(profileCss, /\.map-view:has\(> #venue-tray\.venue-tray\.tray--selected\) \.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(clamp\(500px, 36vw, 520px\) \+ 26px\)\s*!important;/);
});

test('wide desktop gives venue media more presence without widening the selected panel', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero\.detail-hero--has-photo,[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*215px minmax\(0, 1fr\)\s*!important;/);
  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero > \.detail-photo,[\s\S]*?width:\s*215px\s*!important;/);
  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero > \.venue-badges,[\s\S]*?grid-column:\s*2\s*!important;/);
});

test('wide desktop watch party uses structured two-column metadata and full-width supporting content', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.party-module\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(150px, \.82fr\)\s*!important;[\s\S]*?column-gap:\s*26px\s*!important;/);
  assert.match(css, /> \.party-module > \.party-game-context::before\s*\{[\s\S]*?content:\s*'GAME';/);
  assert.match(css, /> \.party-module > \.party-module__host\s*\{[\s\S]*?text-transform:\s*uppercase;/);
  assert.match(css, /> \.party-module > \.party-module__host strong\s*\{[\s\S]*?text-transform:\s*none;/);
  assert.match(css, /> \.party-module > \.party-module__title,[\s\S]*?> \.party-module > \.party-module__report\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;/);
});

test('wide desktop editorial columns meet cleanly with continuous borders', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /#venue-detail\[data-profile-presentation="desktop"\]\s*\{[\s\S]*?column-gap:\s*0\s*!important;[\s\S]*?row-gap:\s*0\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial,[\s\S]*?> \.detail-fan-experiences\s*\{[\s\S]*?border-top:\s*1px solid var\(--cgb-neutral-200\)\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial\s*\{[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?border-right:\s*1px solid var\(--cgb-neutral-200\)\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-fan-experiences\s*\{[\s\S]*?grid-column:\s*2\s*!important;/);
});