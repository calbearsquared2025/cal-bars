import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('correction stylesheet is loaded by the existing mobile polish layer', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.match(script, /CORRECTION_STYLESHEET = 'css\/mobile-corrections\.css'/);
  assert.match(script, /ensureCorrectionStylesheet/);
});

test('Map collapses a full List before the existing command-state handler runs', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.match(script, /function collapseListBeforeMapCommand/);
  assert.match(script, /dataset\.state === 'full'/);
  assert.match(script, /close-list-button/);
  assert.match(script, /addEventListener\('click', collapseListBeforeMapCommand, \{ capture: true \}\)/);
});

test('map controls and markers use corrected visual geometry', async () => {
  const css = await source('css/mobile-corrections.css');
  assert.match(css, /#near-me-button \.ui-icon[\s\S]*translate\(-1px, 1px\)/);
  assert.match(css, /\.marker-pin[\s\S]*width: 34px[\s\S]*height: 34px/);
});

test('fullscreen selection reveals the selected Venue tray', async () => {
  const css = await source('css/mobile-corrections.css');
  assert.match(css, /\.map-fullscreen \.venue-tray\.tray--selected[\s\S]*display: block/);
  assert.match(css, /\.map-fullscreen \.venue-tray\.tray--full[\s\S]*display: none/);
});

test('fullscreen toggle remains stationary when entered from List', async () => {
  const css = await source('css/mobile-corrections.css');
  assert.match(css, /body\.map-fullscreen\[data-command-surface="list"\] \.map-toolbar[\s\S]*calc\(var\(--header-height\) \+ 40px\)/);
});
