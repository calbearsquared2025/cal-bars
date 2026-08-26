import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

function openingStatBlocks(css) {
  return [...css.matchAll(/\.opening-stat\s*\{([^}]*)\}/g)].map((match) => match[1]);
}

test('map legend is static markup with one canonical structural CSS owner', async () => {
  const [html, board, legacyCss, designSystem, firstPaint, mobilePolish, desktopCss, supportCss] = await Promise.all([
    source('index.html'),
    source('css/design-board-1.css'),
    source('css/styles.css'),
    source('css/design-system.css'),
    source('css/mobile-first-paint.css'),
    source('css/mobile-polish.css'),
    source('css/design-board-4.css'),
    source('css/support-dialog.css')
  ]);

  assert.doesNotMatch(html, /css\/map-legend\.css/);
  assert.match(html, /class="map-legend" role="list" aria-label="Map key"/);
  assert.match(html, /map-legend__marker--watch-party[\s\S]*Watch Party/);
  assert.match(html, /map-legend__marker--cal-bar[\s\S]*Cal Bar/);
  assert.match(html, /map-legend__marker--fan-added[\s\S]*Fan-Added/);

  assert.match(
    board,
    /\.opening-stat \{[\s\S]*height: 78px;[\s\S]*grid-template-rows: 54px 22px;[\s\S]*gap: 0;[\s\S]*padding: 0;[\s\S]*overflow: hidden;/
  );
  assert.match(board, /\.opening-stat__item \{[\s\S]*grid-row: 1;/);
  assert.match(board, /\.map-legend \{[\s\S]*grid-column: 1 \/ -1;[\s\S]*grid-row: 2;/);

  assert.doesNotMatch(legacyCss, /\.opening-stat\b/);
  assert.doesNotMatch(designSystem, /\.opening-stat\b/);
  assert.doesNotMatch(mobilePolish, /\.opening-stat\s*\{/);
  assert.match(firstPaint, /data-command-surface="map"\] \.opening-stat \{\s*bottom: -56px !important;/);
  for (const block of openingStatBlocks(desktopCss)) {
    assert.doesNotMatch(block, /\b(?:height|min-height|padding|gap|grid-template-rows|overflow)\s*:/);
  }
  assert.doesNotMatch(supportCss, /maplibregl-ctrl-bottom-right/);
  assert.match(desktopCss, /@media \(min-width: 900px\)[\s\S]*maplibregl-ctrl-bottom-right[\s\S]*bottom: 0;[\s\S]*left: 0;/);
});

test('no loaded stylesheet can silently reintroduce structural opening-stat geometry', async () => {
  const html = await source('index.html');
  const stylesheets = [...html.matchAll(/<link[^>]+href="(css\/[^"?]+\.css)"/g)].map((match) => match[1]);
  const structural = /\b(?:height|min-height|padding|gap|grid-template-rows|overflow)\s*:/;

  for (const path of stylesheets) {
    if (path === 'css/design-board-1.css') continue;
    const css = await source(path);
    for (const block of openingStatBlocks(css)) {
      assert.doesNotMatch(block, structural, `${path} must not own opening-stat structure`);
    }
  }
});

test('legend work does not rewrite venue taxonomy', async () => {
  const core = await source('js/core.mjs');
  assert.match(core, /'CAL BAR' : 'COMMUNITY LOCATION'/);
  assert.match(core, /verification_status === 'user_added'/);
});
