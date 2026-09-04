import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  heroHasPassedTrayCap,
  nextHeroCapPassedState
} from '../js/mobile-profile-hero-cap.mjs';

const source = readFileSync(new URL('../js/mobile-profile-hero-cap.mjs', import.meta.url), 'utf8');

test('tray cap changes only when the actual hero edge reaches or passes the cap', () => {
  assert.equal(heroHasPassedTrayCap({ heroBottom: 240, capBottom: 120 }), false);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 121, capBottom: 120 }), true);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 120, capBottom: 120 }), true);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 0, capBottom: 120 }), true);
  assert.equal(heroHasPassedTrayCap({ heroBottom: -40, capBottom: 120 }), true);
  assert.equal(heroHasPassedTrayCap({ capBottom: 120 }), false);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 80 }), false);
});

test('tray cap reverses on upward scroll with hysteresis around the boundary', () => {
  assert.equal(nextHeroCapPassedState({ heroBottom: 130, capBottom: 120, wasPassed: false }), false);
  assert.equal(nextHeroCapPassedState({ heroBottom: 121, capBottom: 120, wasPassed: false }), true);
  assert.equal(nextHeroCapPassedState({ heroBottom: 124, capBottom: 120, wasPassed: true }), true);
  assert.equal(nextHeroCapPassedState({ heroBottom: 126, capBottom: 120, wasPassed: true }), true);
  assert.equal(nextHeroCapPassedState({ heroBottom: 127, capBottom: 120, wasPassed: true }), false);
  assert.equal(nextHeroCapPassedState({ heroBottom: Number.NaN, capBottom: 120, wasPassed: true }), true);
  assert.equal(nextHeroCapPassedState({ heroBottom: Number.NaN, capBottom: 120, wasPassed: false }), false);
});

test('selected mobile tray keeps its handle surface but hides the decorative line', () => {
  assert.match(source, /tray--peek:has\(#browse-locations-button\[data-preview-mode="selected"\]\) \.tray-handle span,[\s\S]*?tray--selected \.tray-handle span \{[\s\S]*?display: none !important;/);
  assert.match(source, /tray--selected\[data-profile-hero-passed="true"\] \.tray-handle \{[\s\S]*?background: var\(--cgb-gold-400\) !important;/);
  assert.doesNotMatch(source, /tray--selected\[data-profile-hero-passed="true"\] \.tray-handle span/);
});
