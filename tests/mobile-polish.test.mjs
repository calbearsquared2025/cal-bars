import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('map preview presents live Venue summary targets and List owns the full list', async () => {
  const html = await source('index.html');
  const script = await source('js/mobile-polish.mjs');
  assert.match(html, /id="tray-summary-title"/);
  assert.match(html, /id="tray-summary-count"/);
  assert.match(script, /rankVenues/);
  assert.match(script, /openListFromMap/);
  assert.match(script, /mobile-list-button/);
  assert.match(script, /dataset\.state === 'full' \? 'list' : 'map'/);
});

test('navigation derives one active Map Search Add or List state', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.match(script, /const VALID_VIEWS = new Set\(\['map', 'search', 'add', 'list'\]\)/);
  assert.match(script, /function setActiveView/);
  assert.match(script, /removeAttribute\('aria-current'\)/);
  assert.match(script, /function inferActiveView/);
  assert.match(script, /classList\.contains\('map-fullscreen'\)\) return 'map'/);
});

test('opening statistics use large numbers and small labels', async () => {
  const script = await source('js/mobile-polish.mjs');
  const css = await source('css/mobile-polish.css');
  assert.match(script, /opening-stat__number/);
  assert.match(script, /Watch parties/);
  assert.match(script, /Locations/);
  assert.match(css, /\.opening-stat__number[\s\S]*font-size: clamp\(1\.75rem/);
  assert.match(css, /\.opening-stat__copy small/);
});

test('markers are compact teardrops and outer marker transforms never transition', async () => {
  const css = await source('css/mobile-polish.css');
  assert.match(css, /\.maplibregl-marker\.cgb-marker[\s\S]*transition: none !important/);
  assert.match(css, /\.cgb-marker \.marker-pin[\s\S]*width: 32px[\s\S]*height: 32px/);
  assert.match(css, /marker--community-location/);
  assert.match(css, /marker--cal-bar/);
  assert.match(css, /\.cgb-marker \.marker-star[\s\S]*width: 38px/);
});

test('fullscreen keeps controls stable and exposes the selected Venue tray', async () => {
  const css = await source('css/mobile-polish.css');
  assert.match(css, /\.map-actions[\s\S]*position: fixed[\s\S]*top: 46dvh/);
  assert.match(css, /\.map-fullscreen #map-view > #venue-tray\.venue-tray\.tray--selected[\s\S]*display: block !important/);
  assert.match(css, /\.map-fullscreen \.mobile-command-bar[\s\S]*display: grid/);
  assert.match(css, /body\[data-command-surface="list"\] \.map-actions #near-me-button[\s\S]*display: none/);
});

test('selected Venue uses a viewport-anchored rounded bottom sheet', async () => {
  const css = await source('css/mobile-polish.css');
  assert.match(css, /#map-view > #venue-tray\.venue-tray\.tray--selected[\s\S]*position: fixed !important/);
  assert.match(css, /inset: auto 0 var\(--footer-height\) 0 !important/);
  assert.match(css, /width: 100vw !important/);
  assert.match(css, /border-radius: 24px 24px 0 0 !important/);
  assert.match(css, /overflow: hidden/);
});

test('header corrections preserve game-title descenders and pin the menu to the viewport edge', async () => {
  const css = await source('css/mobile-polish.css');
  assert.match(css, /#header-game-label[\s\S]*overflow: hidden[\s\S]*padding-bottom: \.16em[\s\S]*line-height: 1\.22/);
  assert.match(css, /\.site-header > \.site-header__brand-row > #header-about-button[\s\S]*position: absolute !important/);
  assert.match(css, /right: max\(6px, env\(safe-area-inset-right, 0px\)\) !important/);
  assert.match(css, /#near-me-button \.ui-icon[\s\S]*translate\(-1px, 1px\)/);
});

test('polish layer stays event-driven and removes runtime correction stylesheet injection', async () => {
  const html = await source('index.html');
  const script = await source('js/mobile-polish.mjs');
  assert.match(html, /css\/mobile-polish\.css/);
  assert.match(html, /js\/mobile-polish\.mjs/);
  assert.match(script, /CGBApp\?\.subscribe/);
  assert.doesNotMatch(script, /MutationObserver/);
  assert.doesNotMatch(script, /mobile-corrections\.css|ensureCorrectionStylesheet/);
});
