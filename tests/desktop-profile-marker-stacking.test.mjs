import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const zIndex = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+);`));
  return match ? Number(match[1]) : null;
};

test('desktop venue tray stays above selected map markers and below the site header', async () => {
  const [baseCss, markerCss] = await Promise.all([
    read('css/styles.css'),
    read('css/mobile-polish.css')
  ]);

  const tray = zIndex(baseCss, '.venue-tray');
  const selectedMarker = zIndex(markerCss, '.cgb-marker.is-selected');
  const header = zIndex(baseCss, '.site-header');

  assert.equal(tray, 45);
  assert.equal(selectedMarker, 40);
  assert.equal(header, 50);
  assert.ok(tray > selectedMarker, 'venue tray must cover selected markers');
  assert.ok(header > tray, 'site header must remain above the venue tray');
});
