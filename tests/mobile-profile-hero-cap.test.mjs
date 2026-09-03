import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { heroHasPassedTrayCap } from '../js/mobile-profile-hero-cap.mjs';

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

test('mobile selected tray cap latches after passing and resets for another profile session', async () => {
  const source = await read('js/mobile-profile-hero-cap.mjs');
  assert.match(source, /const PASSED_VENUE_ATTR = 'profileHeroPassedVenue'/);
  assert.match(source, /const selectedCard = tray\.querySelector\?\.\('#tray-selected > \.selected-card'\)/);
  assert.match(source, /selectedCard\?\.dataset\?\.venueId/);
  assert.match(source, /if \(alreadyPassed && venueId && passedVenueId === venueId\) return true;/);
  assert.match(source, /if \(alreadyPassed \|\| passedVenueId\) clearPassedState\(tray\);/);
  assert.match(source, /tray\.dataset\[PASSED_VENUE_ATTR\] = venueId/);
  assert.match(source, /delete tray\.dataset\[PASSED_VENUE_ATTR\]/);
  assert.doesNotMatch(source, /if \(passed\)[\s\S]{0,120}else clearPassedState\(tray\)/);
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
