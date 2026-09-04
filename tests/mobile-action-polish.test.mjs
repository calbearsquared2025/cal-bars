import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fanIntentCss = readFileSync(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const watchPartyCss = readFileSync(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');
const heroCapSource = readFileSync(new URL('../js/mobile-profile-hero-cap.mjs', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8');

test('mobile selected intent keeps Undo while giving the selected action more room', () => {
  assert.match(fanIntentCss, /@media \(max-width: 899px\)[\s\S]*?\.action-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) clamp\(78px, 25vw, 96px\) !important;/);
  assert.match(fanIntentCss, /\.selected-card__share-label-full \{[\s\S]*?display: none;[\s\S]*?\.selected-card__share-label-short \{[\s\S]*?display: inline;/);
  assert.match(fanIntentCss, /tray--selected[\s\S]*?\.intent-button__undo \{[\s\S]*?margin-left: 2px !important;[\s\S]*?padding-left: 4px !important;[\s\S]*?font-size: \.62rem !important;/);
  assert.match(fanIntentCss, /\.intent-button__undo \{[\s\S]*?border-left-color: rgba\(1, 1, 51, \.18\) !important;/);
});

test('mobile Venue Profile shortens the visible Watch Party share label without losing its accessible name', () => {
  assert.match(profileSource, /const mobile = globalThis\.window\?\.matchMedia\?\.\('\(max-width: 899px\)'\)\?\.matches === true;/);
  assert.match(profileSource, /share\.textContent = mobile \? 'Share' : label;/);
  assert.match(profileSource, /share\.setAttribute\('aria-label', label\);/);
  assert.match(profileSource, /getWatchParty\(snapshot, gameId, venueId\) \? 'Share Watch Party' : 'Share'/);
});

test('mobile tray handle remains visible and inverts between navy and white tray surfaces', () => {
  assert.doesNotMatch(fanIntentCss, /\.tray-handle span[\s\S]*?display: none !important;/);
  assert.match(heroCapSource, /tray--selected \.tray-handle span \{[\s\S]*?background: var\(--cgb-gold-400\) !important;/);
  assert.match(heroCapSource, /data-profile-hero-passed="true"\] \.tray-handle \{[\s\S]*?background: var\(--cgb-white, #fff\) !important;/);
  assert.match(heroCapSource, /data-profile-hero-passed="true"\] \.tray-handle span \{[\s\S]*?background: var\(--cgb-navy-950\) !important;/);
});

test('mobile selected attendance keeps a right inset matching the profile content gutter', () => {
  assert.match(
    watchPartyCss,
    /> \.selected-card > \.bear-count \{[\s\S]*?margin: 0 14px 0 0 !important;/
  );
});
