import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const guard = await readFile(new URL('../js/map-layout-guard.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/map-layout-fix.css', import.meta.url), 'utf8');

test('MapLibre resize guard loads after MapLibre and before the application module', () => {
  const mapLibreIndex = html.indexOf('maplibre-gl.js');
  const guardIndex = html.indexOf('map-layout-guard.js');
  const appIndex = html.indexOf('js/app.js');

  assert.ok(mapLibreIndex >= 0);
  assert.ok(guardIndex > mapLibreIndex);
  assert.ok(appIndex > guardIndex);
});

test('map resize is skipped while the container has zero or unstable dimensions', () => {
  assert.match(guard, /getBoundingClientRect/);
  assert.match(guard, /rect\.width < 2 \|\| rect\.height < 2/);
  assert.match(guard, /failed to invert matrix/i);
});

test('map shell receives an explicit viewport-derived height', () => {
  assert.match(css, /#app,[\s\S]*\.map-view,[\s\S]*\.map/);
  assert.match(css, /height: calc\(100dvh - var\(--header-height\) - var\(--footer-height\)\)/);
  assert.match(css, /@supports not \(height: 100dvh\)/);
});
