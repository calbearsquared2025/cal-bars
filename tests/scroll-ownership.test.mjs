import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('the map application view owns the outer scroll lock without disabling detail scrolling', async () => {
  const [baseCss, shellControls] = await Promise.all([
    source('css/styles.css'),
    source('js/shell-controls.mjs')
  ]);

  assert.match(baseCss, /body\[data-view="map"\]\s*\{[^}]*overflow-y:\s*hidden/);
  assert.doesNotMatch(baseCss, /body\[data-view="detail"\]\s*\{[^}]*overflow(?:-y)?:\s*hidden/);
  assert.match(shellControls, /document\.body\.dataset\.view = detailVisible \? 'detail' : 'map'/);
});

test('existing internal scroll owners remain in place', async () => {
  const [baseCss, commandCss, desktopCss] = await Promise.all([
    source('css/styles.css'),
    source('css/mobile-command-navigation.css'),
    source('css/design-board-4.css')
  ]);

  assert.match(baseCss, /\.search-suggestions\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(baseCss, /\.tray-selected, \.tray-list\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(commandCss, /\.command-surface:not\(\[hidden\]\)\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(desktopCss, /\.venue-tray \.tray-selected:not\(:empty\)\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(desktopCss, /\.venue-tray \.tray-list\s*\{[^}]*overflow-y:\s*auto/);
});

test('scroll ownership does not rely on wheel or touch interception', async () => {
  const javascriptPaths = [
    'js/app.js',
    'js/shell-controls.mjs',
    'js/mobile-polish.mjs',
    'js/final-functional-stabilization.mjs',
    'js/mobile-tab-location-refinement.mjs',
    'js/map-mobile-refinement.mjs'
  ];
  const javascript = (await Promise.all(javascriptPaths.map(source))).join('\n');

  assert.doesNotMatch(javascript, /addEventListener\(\s*['"](?:touchmove|wheel)['"]/);
});
