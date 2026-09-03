import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop zoom controls keep native MapTiler SDK behavior', async () => {
  const [app, coordination] = await Promise.all([
    read('js/app.js'),
    read('js/map-zoom-coordination.mjs')
  ]);

  assert.match(app, /new sdk\.NavigationControl\(\{ showCompass: false \}\)/);
  assert.match(app, /addControl\(new sdk\.NavigationControl\(\{ showCompass: false \}\), 'top-right'\)/);
  assert.doesNotMatch(coordination, /maplibregl-ctrl-zoom-in|maplibregl-ctrl-zoom-out/);
  assert.doesNotMatch(coordination, /handleZoomControlClick|coordinatedZoom/);
  assert.doesNotMatch(coordination, /document\.addEventListener\('click'/);
});

test('desktop selected venue suppresses the redundant visibility pan during camera settle', async () => {
  const coordination = await read('js/map-zoom-coordination.mjs');

  assert.match(coordination, /const SELECTED_CAMERA_SETTLE_MS = 560;/);
  assert.match(coordination, /function cancelSelectedVisibilityFrame/);
  assert.match(coordination, /function suppressRedundantSelectedVisibilityPan/);
  assert.match(coordination, /if \(isDesktopSelectedFocus\(options\)\) suppressRedundantSelectedVisibilityPan\(\);/);
  assert.match(coordination, /queueMicrotask\(cancel\)/);
  assert.match(coordination, /requestAnimationFrame\(cancelUntilSettled\)/);
});

test('desktop map control stack stays clear of the footer', async () => {
  const cohesion = await read('js/desktop-visual-cohesion.mjs');

  assert.match(cohesion, /\.maplibregl-ctrl-top-right \{[\s\S]*?bottom: 44px !important;/);
  assert.match(cohesion, /\.map-actions \{[\s\S]*?bottom: 142px !important;/);
});
