import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fanIntentCss = readFileSync(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const watchPartyCss = readFileSync(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');
const heroCapSource = readFileSync(new URL('../js/mobile-profile-hero-cap.mjs', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8');
const finalPassSource = readFileSync(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8');

test('mobile selected intent keeps Undo while giving the selected action more room', () => {
  assert.match(fanIntentCss, /@media \(max-width: 899px\)[\s\S]*?\.action-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) clamp\(78px, 25vw, 96px\) !important;/);
  assert.match(fanIntentCss, /\.selected-card__share-label-full \{[\s\S]*?display: none;[\s\S]*?\.selected-card__share-label-short \{[\s\S]*?display: inline;/);
  assert.match(fanIntentCss, /tray--selected[\s\S]*?\.intent-button__undo \{[\s\S]*?margin-left: 2px !important;[\s\S]*?padding-left: 4px !important;[\s\S]*?font-size: \.62rem !important;/);
  assert.match(fanIntentCss, /\.intent-button__undo \{[\s\S]*?border-left-color: rgba\(255, 255, 255, \.22\) !important;/);
});

test('selected attendance keeps a navy surface with white label, gold check, and existing shadow treatment', () => {
  assert.match(
    fanIntentCss,
    /\.primary-button\.intent-button\[aria-pressed="true"\] \{[\s\S]*?border-color: var\(--cgb-gold-500, #e6a411\);[\s\S]*?background: var\(--cgb-navy-950, #010133\);[\s\S]*?color: var\(--cgb-white, #fff\);[\s\S]*?box-shadow:\s*\n\s*inset 0 1px 0 rgba\(255, 255, 255, \.28\),\s*\n\s*inset 0 -2px 0 rgba\(1, 1, 51, \.14\);/
  );
  assert.match(
    fanIntentCss,
    /\.primary-button\.intent-button\[aria-pressed="true"\] \.intent-button__main \.ui-icon \{[\s\S]*?color: var\(--cgb-gold-300, #ffd15a\);/
  );
  assert.match(
    finalPassSource,
    /\.action-row > \.intent-button \{[\s\S]*?font-family:[\s\S]*?text-transform: uppercase !important;\s*\}[\s\S]*?\.action-row > \.intent-button:not\(\[aria-pressed="true"\]\) \{[\s\S]*?color: var\(--cgb-white\) !important;[\s\S]*?background: var\(--cgb-navy-950\) !important;[\s\S]*?border-color: var\(--cgb-navy-950\) !important;/
  );
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

test('mobile hero splits venue identity and attendance inside the selected-profile gutter', () => {
  assert.match(
    watchPartyCss,
    /selected-card__header \{[\s\S]*?padding: 12px 14px 13px !important;/
  );
  assert.match(
    fanIntentCss,
    /selected-card__header > div:first-child \{[\s\S]*?grid-template-columns: minmax\(0, 3fr\) minmax\(0, 2fr\) !important;/
  );
  assert.match(
    fanIntentCss,
    /selected-card__header \.bear-count--hero \{[\s\S]*?grid-column: 2 !important;[\s\S]*?grid-row: 1 \/ 4 !important;[\s\S]*?margin: 0 !important;/
  );
});
