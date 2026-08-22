import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../css/support-dialog.css', import.meta.url), 'utf8');

test('search focus uses a restrained navy border with an inset gold accent and connected results', () => {
  assert.match(css, /\.search-field:focus-within,[\s\S]*border-color: var\(--cgb-navy-900[^;]*;[\s\S]*box-shadow: inset 0 -3px 0 var\(--cgb-gold-400/);
  assert.doesNotMatch(css.slice(css.indexOf('Recovered #121 visual polish')), /var\(--focus-ring\)/);
  assert.match(css, /\.location-search:has\(\.search-suggestions:not\(\[hidden\]\)\) \.search-field/);
  assert.match(css, /\.location-search > \.search-suggestions,[\s\S]*margin-top: 0 !important;[\s\S]*border-top: 0 !important;/);
});

test('venue title preserves descenders and PR B leaves selected-card Directions untouched', () => {
  assert.match(css, /#venue-detail \.detail-hero h1[\s\S]*overflow: visible !important;[\s\S]*padding-bottom: \.08em !important;/);
  assert.doesNotMatch(css.slice(css.indexOf('Recovered #121 visual polish')), /selected-card__directions-inline|selected-card__location-separator|tray--selected \.venue-location/);
});

test('support lead-in is regular weight and sparse desktop lists shrink to content', () => {
  assert.match(css, /\.about-support \.secondary-button > span:first-child[\s\S]*font-weight: 400 !important;/);
  assert.doesNotMatch(css.slice(css.indexOf('Recovered #121 visual polish')), /text-transform: lowercase/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.venue-tray\.tray--full:has\(#location-list > :only-child\)[\s\S]*bottom: auto !important;/);
  assert.match(css, /\.venue-tray\.tray--full:has\(#location-list > :only-child\) \.tray-list[\s\S]*flex: 0 1 auto !important;/);
});
