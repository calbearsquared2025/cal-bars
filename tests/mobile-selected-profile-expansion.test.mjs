import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  draggedSelectedTrayHeight,
  expandedSelectedTrayHeight
} from '../js/mobile-selected-profile-expansion.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('expanded selected profile preserves a visible map strip above the sheet', () => {
  assert.equal(expandedSelectedTrayHeight({
    trayBottom: 800,
    mapContextBottom: 150,
    baseHeight: 480,
    mapRevealHeight: 72
  }), 578);

  assert.equal(expandedSelectedTrayHeight({
    trayBottom: 620,
    mapContextBottom: 160,
    baseHeight: 480,
    mapRevealHeight: 72
  }), 480);
});

test('profile drag is clamped between map-first and expanded reading heights', () => {
  assert.equal(draggedSelectedTrayHeight({
    startHeight: 480,
    deltaY: -60,
    minHeight: 480,
    maxHeight: 600
  }), 540);
  assert.equal(draggedSelectedTrayHeight({
    startHeight: 480,
    deltaY: -240,
    minHeight: 480,
    maxHeight: 600
  }), 600);
  assert.equal(draggedSelectedTrayHeight({
    startHeight: 600,
    deltaY: 220,
    minHeight: 480,
    maxHeight: 600
  }), 480);
});

test('mobile selected profile expansion is presentation-only and keeps canonical tray state ownership', async () => {
  const source = await read('js/mobile-selected-profile-expansion.mjs');
  assert.match(source, /--cgb-selected-tray-max-height/);
  assert.match(source, /MAP_REVEAL_PX = 72/);
  assert.match(source, /expandedVenueId/);
  assert.match(source, /Return to map-first profile/);
  assert.doesNotMatch(source, /state\.trayState\s*=/);
  assert.doesNotMatch(source, /state\.detailMode\s*=/);
  assert.doesNotMatch(source, /history\.(?:pushState|replaceState)/);
});

test('raised mobile profile softly collapses the opening stats and legend, then restores them with map-first presentation', async () => {
  const source = await read('js/mobile-selected-profile-expansion.mjs');
  assert.match(source, /RAISED_BODY_CLASS = 'cgb-profile-raised'/);
  assert.match(source, /opacity 160ms ease/);
  assert.match(source, /clip-path 160ms ease/);
  assert.match(source, /translateY\(-6px\) scaleY\(\.92\)/);
  assert.match(source, /clip-path: inset\(0 0 100% 0\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /raised \? null : documentObject\.querySelector\('\.opening-stat'\)/);
  assert.doesNotMatch(source, /\.opening-stat \{\s*display: none !important;/);
  assert.match(source, /setRaisedProfileChrome\(documentObject, true\);[\s\S]*?expandedTargetHeight\(tray, documentObject\)/);
  assert.match(source, /setRaisedProfileChrome\(documentObject, false\);[\s\S]*?applyHeight\(tray, current\.minHeight\)/);
  assert.match(source, /resetPresentation\(\{ documentObject \}\)/);
});

test('post-drag handle clicks are suppressed before the existing capture-phase collapse handler', async () => {
  const source = await read('js/mobile-selected-profile-expansion.mjs');
  assert.match(source, /window\.addEventListener\('click', interceptSuppressedHandleClick, \{ capture: true \}\)/);
  assert.match(source, /markHandleClickSuppressed\(windowObject\)/);
  assert.match(source, /event\.stopImmediatePropagation\?\.\(\)/);
});

test('the existing mobile profile bridge loads expansion without adding another application entrypoint', async () => {
  const source = await read('js/mobile-direct-venue-profile.mjs');
  assert.match(source, /import '\.\/mobile-selected-profile-expansion\.mjs';/);
});

test('expanded reading position keeps the same continuous selected profile rather than reopening Detail', async () => {
  const source = await read('js/mobile-selected-profile-expansion.mjs');
  assert.doesNotMatch(source, /window\.location\.assign/);
  assert.doesNotMatch(source, /buildVenueUrl/);
  assert.doesNotMatch(source, /data-selected-density/);
});
