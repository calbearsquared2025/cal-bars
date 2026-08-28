import test from 'node:test';
import assert from 'node:assert/strict';

import { selectedTrayHeightForContinuation } from '../js/mobile-selected-profile-continuation.mjs';

test('selected tray expands enough to expose the start of the venue profile when room is available', () => {
  assert.equal(selectedTrayHeightForContinuation({
    viewportHeight: 700,
    selectedCardHeight: 360
  }), 448);
});

test('selected tray keeps the existing baseline height when the selected card is already compact', () => {
  assert.equal(selectedTrayHeightForContinuation({
    viewportHeight: 800,
    selectedCardHeight: 300
  }), 464);
});

test('selected tray caps profile reveal expansion so the map retains meaningful space', () => {
  assert.equal(selectedTrayHeightForContinuation({
    viewportHeight: 700,
    selectedCardHeight: 500
  }), 462);
});

test('selected tray reveal returns zero when layout measurements are unavailable', () => {
  assert.equal(selectedTrayHeightForContinuation({ viewportHeight: 0, selectedCardHeight: 360 }), 0);
  assert.equal(selectedTrayHeightForContinuation({ viewportHeight: 700, selectedCardHeight: 0 }), 0);
});
