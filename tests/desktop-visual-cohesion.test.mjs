import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/desktop-visual-cohesion.mjs', import.meta.url), 'utf8');
const profileSource = await readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('desktop cohesion module is loaded without changing mobile rules', () => {
  assert.match(profileSource, /import '\.\/desktop-visual-cohesion\.mjs';/);
  assert.match(source, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(source, /@media \(max-width: 899px\)/);
});

test('desktop primary navigation labels use uppercase treatment', () => {
  assert.match(source, /\.mobile-command-bar \.mobile-command\s*\{[\s\S]*?text-transform:\s*uppercase;/);
});

test('desktop map search uses a white field surface', () => {
  assert.match(source, /\.map-toolbar \.search-field[\s\S]*?background: var\(--cgb-white, #fff\) !important;/);
});

test('desktop map licensing controls do not overlap', () => {
  assert.match(source, /\.maptiler-logo\s*\{[\s\S]*?left:\s*24px !important;[\s\S]*?bottom:\s*16px !important;/);
  assert.match(source, /\.maplibregl-ctrl-bottom-right\s*\{[\s\S]*?bottom:\s*16px !important;[\s\S]*?left:\s*90px !important;/);
});

test('desktop Add to CGB reads as an outlined button while preserving its equal-width nav column', () => {
  assert.match(source, /\.mobile-command-bar #mobile-add-button\s*\{[\s\S]*?width:\s*100% !important;[\s\S]*?justify-self:\s*stretch !important;[\s\S]*?border:\s*1px solid var\(--cgb-neutral-300, #cbd0d6\) !important;[\s\S]*?border-radius:\s*8px !important;/);
  assert.doesNotMatch(source, /grid-column:\s*3/);
});

test('desktop local map photo prompt is a compact upper-left overlay', () => {
  assert.match(source, /\.detail-local-map__photo-action\s*\{[\s\S]*?top:\s*12px !important;[\s\S]*?right:\s*auto !important;[\s\S]*?bottom:\s*auto !important;[\s\S]*?left:\s*12px !important;/);
  assert.match(source, /\.detail-local-map__photo-action\s*\{[\s\S]*?text-transform:\s*uppercase !important;/);
});

test('desktop game selector opens as a nonmodal dropdown anchored to the selector', () => {
  assert.match(source, /function openDesktopGameDropdown/);
  assert.match(source, /dialog\.show\(\)/);
  assert.doesNotMatch(source, /dialog\.showModal\(\)/);
  assert.match(source, /const rect = button\.getBoundingClientRect\(\)/);
  assert.match(source, /dialog\.style\.top = `\$\{Math\.round\(rect\.bottom \+ 6\)\}px`/);
  assert.match(source, /button\.addEventListener\('click',[\s\S]*?event\.stopImmediatePropagation\(\)[\s\S]*?openDesktopGameDropdown/);
  assert.match(source, /\.game-dialog\.game-dialog--dropdown \.dialog-header\s*\{[\s\S]*?display:\s*none;/);
});

test('desktop Add surface uses warm cream with white action cards and a gold selected-place accent', () => {
  assert.match(source, /#add-surface > \.command-surface__shell[\s\S]*?background: var\(--cgb-warm-50, #f7f6f2\)/);
  assert.match(source, /#add-surface \.add-context[\s\S]*?background: #fbfaf5[\s\S]*?border-left: 4px solid var\(--cgb-gold-400, #fdb515\)/);
  assert.match(source, /#add-surface \.add-context \.add-action[\s\S]*?background: var\(--cgb-white, #fff\)/);
  assert.match(source, /title\.textContent = 'Add somewhere else'/);
});

test('desktop footer uses static HTML with the full affiliation disclaimer in the approved order', () => {
  assert.match(indexSource, /<footer class="site-footer">[\s\S]*?>@CalBearSquared<\/a>[\s\S]*?id="about-button"[^>]*>About<\/button>[\s\S]*?id="privacy-button"[^>]*>Privacy<\/button>[\s\S]*?Not affiliated with Cal Athletics or the California Alumni Association[\s\S]*?<\/footer>/);
  assert.doesNotMatch(source, /syncDesktopFooter/);
  assert.doesNotMatch(source, /footer\.replaceChildren/);
  assert.doesNotMatch(source, /FOOTER_READY/);
  assert.match(source, /\.site-footer\s*\{[\s\S]*?background: var\(--cgb-warm-50, #f7f6f2\)/);
});

test('desktop footer is flush with square corners', () => {
  assert.match(source, /\.site-footer\s*\{[\s\S]*?border-radius: 0 !important;[\s\S]*?clip-path: none !important;/);
});
