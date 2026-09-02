import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const zIndex = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+);`));
  return match ? Number(match[1]) : null;
};

test('desktop zoom controls stay above selected pins and below the effective venue profile layer', async () => {
  const [baseCss, boardCss, markerCss] = await Promise.all([
    read('css/styles.css'),
    read('css/design-board-2.css'),
    read('css/mobile-polish.css')
  ]);

  const zoomControls = zIndex(baseCss, '.maplibregl-ctrl-top-right');
  const selectedMarker = zIndex(markerCss, '.cgb-marker.is-selected');
  const tray = zIndex(boardCss, '.venue-tray');

  assert.equal(zoomControls, 42);
  assert.equal(selectedMarker, 40);
  assert.equal(tray, 45);
  assert.ok(zoomControls > selectedMarker, 'zoom controls must cover selected markers');
  assert.ok(tray > zoomControls, 'venue profile must remain above map controls');
});
