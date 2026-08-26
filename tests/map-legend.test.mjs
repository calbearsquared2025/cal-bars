import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('map legend is structural markup with dedicated static CSS', async () => {
  const [html, css, mobilePolish] = await Promise.all([
    source('index.html'),
    source('css/map-legend.css'),
    source('js/mobile-polish.mjs')
  ]);

  assert.match(html, /css\/map-legend\.css/);
  assert.match(html, /class="map-legend" role="list" aria-label="Map key"/);
  assert.match(html, /map-legend__marker--watch-party[\s\S]*Watch Party/);
  assert.match(html, /map-legend__marker--cal-bar[\s\S]*Cal Bar/);
  assert.match(html, /map-legend__marker--fan-added[\s\S]*Fan-Added/);
  assert.match(css, /\.opening-stat[\s\S]*height: 76px[\s\S]*grid-template-rows: 54px 22px/);
  assert.match(css, /\.map-legend[\s\S]*grid-column: 1 \/ -1[\s\S]*grid-row: 2/);
  assert.doesNotMatch(mobilePolish, /ensureMapLegend|map-legend|gridTemplateRows/);
});

test('legend work does not rewrite venue taxonomy', async () => {
  const core = await source('js/core.mjs');
  assert.match(core, /'CAL BAR' : 'COMMUNITY LOCATION'/);
  assert.match(core, /verification_status === 'user_added'/);
});
