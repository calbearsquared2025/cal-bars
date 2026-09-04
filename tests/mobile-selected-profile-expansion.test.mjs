import test from 'node:test';
import assert from 'node:assert/strict';

import {
  draggedSelectedTrayHeight,
  expandedSelectedTrayHeight
} from '../js/mobile-selected-profile-expansion.mjs';

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
