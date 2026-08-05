import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');

test('selected venues focus the map at city scale with tray-aware offset', () => {
  assert.match(source, /const FOCUS_ZOOM = 11/);
  assert.match(source, /zoom: Math\.max\(currentZoom, FOCUS_ZOOM\)/);
  assert.match(source, /offset: \[0, verticalOffset\]/);
});

test('zoom controls are removed and hidden', () => {
  assert.match(source, /maplibregl-ctrl-top-right/);
  assert.match(source, /maplibregl-ctrl-zoom-in/);
  assert.match(source, /button\.remove\(\)/);
});

test('Nearby is a shorter edge-anchored sheet', () => {
  assert.match(source, /tray--peek[\s\S]*inset: auto 0 0 0 !important/);
  assert.match(source, /height: 92px !important/);
  assert.match(source, /border-radius: 22px 22px 0 0 !important/);
});

test('attribution follows the visible tray instead of creating layout space', () => {
  assert.match(source, /function positionAttribution/);
  assert.match(source, /attribution\.style\.bottom/);
});
