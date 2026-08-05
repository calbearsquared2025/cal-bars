import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('map peek presents live Venue summary targets instead of instruction-only copy', async () => {
  const html = await source('index.html');
  const script = await source('js/mobile-polish.mjs');
  assert.match(html, /id="tray-summary-title"/);
  assert.match(html, /id="tray-summary-count"/);
  assert.match(script, /rankVenues/);
  assert.match(script, /markerKind/);
  assert.match(script, /bearCountCopy/);
});

test('search and add surfaces remove redundant and negative default states', async () => {
  const html = await source('index.html');
  assert.doesNotMatch(html, /search-surface__legend/);
  assert.doesNotMatch(html, /No place selected/);
  assert.match(html, /Choose what you would like to add or correct/);
  assert.match(html, /class="add-context" aria-live="polite" hidden/);
});

test('secondary destinations use compact context and selective geometry', async () => {
  const css = await source('css/mobile-polish.css');
  assert.match(css, /--header-height: calc\(82px/);
  assert.match(css, /\.site-header__brand-row/);
  assert.match(css, /\.opening-stat/);
  assert.match(css, /\.search-field[\s\S]*clip-path: none/);
  assert.match(css, /\.command-surface__back[\s\S]*clip-path: none/);
  assert.match(css, /\.mobile-command__add-mark[\s\S]*width: 26px/);
});

test('polish layer keeps app event delegation and avoids DOM-wide observation', async () => {
  const html = await source('index.html');
  const script = await source('js/mobile-polish.mjs');
  assert.match(html, /css\/mobile-polish\.css/);
  assert.match(html, /js\/mobile-polish\.mjs/);
  assert.match(script, /CGBApp\?\.subscribe/);
  assert.match(script, /data\.commandSurface|dataset\.commandSurface/);
  assert.doesNotMatch(script, /MutationObserver/);
});
