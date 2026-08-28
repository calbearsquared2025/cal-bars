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

test('wide desktop compacts venue media and identity into one hero row', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero\.detail-hero--has-photo,[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*180px minmax\(0, 1fr\)\s*!important;/);
  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero > \.detail-photo,[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?grid-row:\s*1 \/ span 6\s*!important;/);
  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero > \.venue-badges,[\s\S]*?grid-column:\s*2\s*!important;/);
});

test('wide desktop watch party uses two-column metadata and full-width supporting content', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.party-module\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, \.92fr\)\s*!important;/);
  assert.match(css, /> \.party-module > \.party-game-context\s*\{[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
  assert.match(css, /> \.party-module > \.party-module__host\s*\{[\s\S]*?grid-column:\s*2\s*!important;[\s\S]*?grid-row:\s*2 \/ span 2\s*!important;/);
  assert.match(css, /> \.party-module > \.party-module__title,[\s\S]*?> \.party-module > \.party-module__report\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;/);
});

test('wide desktop keeps CGB Says and Bears Say visible side by side when both exist', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial\s*\{[\s\S]*?grid-column:\s*1\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-fan-experiences\s*\{[\s\S]*?grid-column:\s*2\s*!important;/);
});
