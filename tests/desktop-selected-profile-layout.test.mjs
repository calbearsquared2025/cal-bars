import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('wide desktop gives the selected profile more room without widening the browse tray', async () => {
  const css = await read('css/design-board-4.css');

  assert.match(css, /\.venue-tray\s*\{[\s\S]*?width:\s*min\(390px, 34vw\);/);
  assert.match(css, /@media \(min-width: 1100px\)[\s\S]*?\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*clamp\(500px, 40vw, 580px\);/);
  assert.match(css, /\.map-view:has\(> #venue-tray\.venue-tray\.tray--selected\) \.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(clamp\(500px, 40vw, 580px\) \+ 26px\);/);
});

test('wide desktop compacts venue identity and surfaces editorial content side by side', async () => {
  const css = await read('css/design-board-4.css');

  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero\s*\{[\s\S]*?grid-template-columns:\s*minmax\(180px, \.86fr\) minmax\(0, 1\.14fr\);/);
  assert.match(css, /#tray-selected > #venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero > \.detail-photo,[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*1 \/ span 6;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial\s*\{[\s\S]*?grid-column:\s*1;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-fan-experiences\s*\{[\s\S]*?grid-column:\s*2;/);
});
