import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('MapTiler attribution is SDK-owned once and sits at the desktop map bottom right', async () => {
  const [app, iconUpgrade, index, desktopCohesion] = await Promise.all([
    read('js/app.js'),
    read('js/icon-upgrade.mjs'),
    read('index.html'),
    read('js/desktop-visual-cohesion.mjs')
  ]);

  assert.match(app, /attributionControl:\s*\{\s*compact:\s*false\s*\}/);
  assert.doesNotMatch(app, /new sdk\.AttributionControl/);
  assert.doesNotMatch(app, /sdk\?\.AttributionControl/);
  assert.match(iconUpgrade, /attributionControl:\s*false/);
  assert.doesNotMatch(index, /<a\s+class="maptiler-logo"/);
  assert.doesNotMatch(index, /assets\/maptiler-logo\.svg/);
  assert.match(
    desktopCohesion,
    /\.maplibregl-ctrl-bottom-right \{[\s\S]*?right: calc\(min\(390px, 34vw\) \+ 26px\) !important;[\s\S]*?bottom: 16px !important;[\s\S]*?left: auto !important;/,
    'Desktop attribution should sit in the lower-right corner of the visible map area, clear of the venue tray.'
  );
});
