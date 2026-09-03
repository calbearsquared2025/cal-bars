import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  heroHasPassedTrayCap,
  nextHeroCapPassedState
} from '../js/mobile-profile-hero-cap.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

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

test('mobile selected tray cap starts navy and becomes gold after the hero passes', async () => {
  const source = await read('js/mobile-profile-hero-cap.mjs');
  assert.match(source, /\.tray-handle \{[\s\S]*?background: var\(--cgb-navy-950\) !important;/);
  assert.match(source, /\.tray-handle span \{[\s\S]*?background: var\(--cgb-gold-400\) !important;/);
  assert.match(source, /data-profile-hero-passed="true"\] \.tray-handle \{[\s\S]*?background: var\(--cgb-gold-400\) !important;/);
  assert.match(source, /data-profile-hero-passed="true"\] \.tray-handle span \{[\s\S]*?background: var\(--cgb-navy-950\) !important;/);
  assert.match(source, /heroBottom: heroRect\?\.bottom/);
  assert.match(source, /capBottom: handleRect\?\.bottom/);
  assert.match(source, /#tray-selected'\)\?\.addEventListener\('scroll'/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});

test('mobile selected tray cap is reversible rather than latched', async () => {
  const source = await read('js/mobile-profile-hero-cap.mjs');
  assert.match(source, /const EXIT_TOLERANCE_PX = 6/);
  assert.match(source, /const wasPassed = tray\.dataset\[PASSED_ATTR\] === 'true'/);
  assert.match(source, /nextHeroCapPassedState\(\{[\s\S]*?wasPassed[\s\S]*?\}\)/);
  assert.match(source, /if \(passed\) tray\.dataset\[PASSED_ATTR\] = 'true';\n  else clearPassedState\(tray\);/);
  assert.doesNotMatch(source, /PASSED_VENUE_ATTR/);
  assert.doesNotMatch(source, /alreadyPassed && venueId/);
});

test('collapsed selected venue preview is the same navy identity surface as the expanded hero', async () => {
  const source = await read('js/mobile-profile-hero-cap.mjs');
  assert.match(source, /tray--peek:has\(#browse-locations-button\[data-preview-mode="selected"\]\)[\s\S]*?background: var\(--cgb-navy-950\) !important;/);
  assert.match(source, /#browse-locations-button\[data-preview-mode="selected"\][\s\S]*?background: var\(--cgb-navy-950\) !important;/);
  assert.match(source, /data-preview-mode="selected"\][\s\S]*?\.tray-summary__copy strong[\s\S]*?font-family: var\(--font-condensed/);
  assert.match(source, /data-preview-mode="selected"\][\s\S]*?\.tray-summary__copy strong[\s\S]*?color: var\(--cgb-white\) !important;/);
  assert.match(source, /data-preview-mode="selected"\][\s\S]*?\.tray-summary__copy \.eyebrow[\s\S]*?color: var\(--cgb-gold-300\) !important;/);
  assert.match(source, /data-preview-mode="selected"\][\s\S]*?\.tray-summary__count,[\s\S]*?color: var\(--cgb-gold-300\) !important;/);
  assert.match(source, /\.tray-summary__marker\[data-kind="cal-bar"\][\s\S]*?background: var\(--cgb-white\) !important;/);
});

test('hero cap behavior is loaded through the existing mobile profile bootstrap', async () => {
  const source = await read('js/mobile-direct-venue-profile.mjs');
  assert.match(source, /import '\.\/mobile-profile-hero-cap\.mjs';/);
});
