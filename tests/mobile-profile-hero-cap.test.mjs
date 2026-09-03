import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { heroHasPassedTrayCap } from '../js/mobile-profile-hero-cap.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('tray cap changes only when the actual hero edge reaches the cap', () => {
  assert.equal(heroHasPassedTrayCap({ heroBottom: 240, capBottom: 120 }), false);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 121, capBottom: 120 }), true);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 120, capBottom: 120 }), true);
  assert.equal(heroHasPassedTrayCap({ heroBottom: 0, capBottom: 120 }), false);
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

test('hero cap behavior is loaded through the existing mobile profile bootstrap', async () => {
  const source = await read('js/mobile-direct-venue-profile.mjs');
  assert.match(source, /import '\.\/mobile-profile-hero-cap\.mjs';/);
});
