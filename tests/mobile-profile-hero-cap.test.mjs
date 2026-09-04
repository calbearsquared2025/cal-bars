import test from 'node:test';
import assert from 'node:assert/strict';

import {
  heroHasPassedTrayCap,
  nextHeroCapPassedState
} from '../js/mobile-profile-hero-cap.mjs';

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
