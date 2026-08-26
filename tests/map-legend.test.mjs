import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('map legend has one structural geometry owner with no conflicting breakpoint heights', async () => {
  const [html, legendCss, mobilePolish, firstPaint, desktopCss] = await Promise.all([
    source('index.html'),
    source('css/map-legend.css'),
    source('css/mobile-polish.css'),
    source('css/mobile-first-paint.css'),
    source('css/design-board-4.css')
  ]);

  assert.match(html, /css\/map-legend\.css/);
  assert.match(html, /class="map-legend" role="list" aria-label="Map key"/);
  assert.match(html, /map-legend__marker--watch-party[\s\S]*Watch Party/);
  assert.match(html, /map-legend__marker--cal-bar[\s\S]*Cal Bar/);
  assert.match(html, /map-legend__marker--fan-added[\s\S]*Fan-Added/);
  assert.match(legendCss, /\.opening-stat \{[\s\S]*height: 76px;[\s\S]*grid-template-rows: 54px 22px;/);
  assert.match(legendCss, /\.map-legend \{[\s\S]*grid-column: 1 \/ -1;[\s\S]*grid-row: 2;/);
  assert.doesNotMatch(legendCss, /@media \(max-width: 899px\)[\s\S]*bottom: -38px/);

  assert.doesNotMatch(mobilePolish, /\.opening-stat \{\s*bottom: -31px;\s*height: 62px;/);
  assert.doesNotMatch(firstPaint, /opening-stat \{\s*height: 56px !important;/);
  assert.match(firstPaint, /data-command-surface="map"\] \.opening-stat \{\s*bottom: -56px !important;/);
  assert.doesNotMatch(desktopCss, /\.opening-stat \{[\s\S]{0,180}height: 58px;/);
});

test('legend work does not rewrite venue taxonomy', async () => {
  const core = await source('js/core.mjs');
  assert.match(core, /'CAL BAR' : 'COMMUNITY LOCATION'/);
  assert.match(core, /verification_status === 'user_added'/);
});
