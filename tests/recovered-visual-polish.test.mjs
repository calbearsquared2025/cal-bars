import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../css/support-dialog.css', import.meta.url), 'utf8');

test('search focus uses navy structure with a restrained outer gold accent and connected results', () => {
  assert.match(css, /\.search-field:focus-within,[\s\S]*border-color: var\(--cgb-navy-900[^;]*;[\s\S]*box-shadow: 0 0 0 1px var\(--cgb-gold-400/);
  assert.match(css, /\.search-field input:focus-visible,[\s\S]*outline: 0 !important;[\s\S]*box-shadow: none !important;/);
  assert.doesNotMatch(css.slice(css.indexOf('Recovered #121 visual polish')), /var\(--focus-ring\)/);
  assert.match(css, /\.location-search:has\(\.search-suggestions:not\(\[hidden\]\)\) \.search-field/);
  assert.match(css, /\.location-search > \.search-suggestions,[\s\S]*top: 100% !important;[\s\S]*margin-top: 0 !important;[\s\S]*border-top: 0 !important;/);
  assert.match(css, /\.map-toolbar \.search-suggestions[\s\S]*max-height: calc\(100dvh - var\(--header-height\) - 104px\) !important;/);
});

test('venue title preserves descenders and PR B leaves selected-card Directions untouched', () => {
  assert.match(css, /#venue-detail \.detail-hero h1[\s\S]*overflow: visible !important;[\s\S]*padding-bottom: \.08em !important;/);
  assert.doesNotMatch(css.slice(css.indexOf('Recovered #121 visual polish')), /selected-card__directions-inline|selected-card__location-separator|tray--selected \.venue-location/);
});

test('support CTA is regular weight and visual-polish CSS no longer owns tray sizing', () => {
  assert.match(css, /\.about-support \.secondary-button > span[\s\S]*font-weight: 400 !important;/);
  assert.doesNotMatch(css.slice(css.indexOf('Recovered #121 visual polish')), /text-transform: lowercase/);
  assert.doesNotMatch(css, /#location-list > :only-child/);
  assert.doesNotMatch(css, /\.venue-tray\.tray--full:has/);
});
