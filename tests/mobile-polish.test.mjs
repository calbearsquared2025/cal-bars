import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('map preview targets remain available while List owns the full list', async () => {
  const html = await source('index.html');
  const script = await source('js/mobile-polish.mjs');
  assert.match(html, /id="tray-summary-title"/);
  assert.match(html, /id="tray-summary-count"/);
  assert.doesNotMatch(script, /function updatePeek/);
  assert.doesNotMatch(script, /tray-summary-title|tray-summary-count/);
  assert.match(script, /openListFromMap/);
  assert.match(script, /mobile-list-button/);
  assert.match(script, /dataset\.state === 'full' \? 'list' : 'map'/);
});

test('polish tracks the active view without owning command-button state', async () => {
  const [script, shell] = await Promise.all([
    source('js/mobile-polish.mjs'),
    source('js/shell-controls.mjs')
  ]);
  assert.match(script, /const VALID_VIEWS = new Set\(\['map', 'search', 'add', 'list'\]\)/);
  assert.match(script, /function setActiveView/);
  assert.match(script, /function inferActiveView/);
  assert.doesNotMatch(script, /commandButtons|mobile-command--active|aria-current/);
  assert.match(shell, /mobile-command--active/);
  assert.match(shell, /aria-current/);
});

test('polish does not post-process selected-place Add context', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.doesNotMatch(script, /function updateAddContext/);
  assert.doesNotMatch(script, /#add-context-name|#add-context-copy/);
  assert.doesNotMatch(script, /querySelector\('\.add-context'\)/);
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

test('secondary header compaction stays portrait-only and hidden back controls do not compress headings', async () => {
  const css = await source('css/mobile-polish.css');
  assert.match(css, /@media \(orientation: portrait\)[\s\S]*Secondary destinations keep game context/);
  assert.match(css, /body\[data-command-surface="search"\] \.command-surface__header,[\s\S]*body\[data-command-surface="add"\] \.command-surface__header[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
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
