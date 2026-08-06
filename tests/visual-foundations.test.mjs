import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [css, loader, mobilePolish] = await Promise.all([
  readFile(new URL('../css/visual-foundations.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/visual-foundations.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../js/mobile-polish.mjs', import.meta.url), 'utf8')
]);

test('approved typefaces are loaded and assigned through shared font roles', () => {
  assert.match(loader, /family=Barlow\+Condensed/);
  assert.match(loader, /family=Inter/);
  assert.match(loader, /family=Source\+Serif\+4/);
  assert.match(loader, /css\/visual-foundations\.css/);
  assert.match(mobilePolish, /import '\.\/visual-foundations\.mjs';/);

  assert.match(css, /--font-ui:\s*"Inter"/);
  assert.match(css, /--font-display:\s*"Source Serif 4"/);
  assert.match(css, /--font-condensed:\s*"Barlow Condensed"/);
  assert.match(css, /\.mobile-command[\s\S]*font-family:\s*var\(--font-ui\)/);
  assert.match(css, /\.eyebrow[\s\S]*font-family:\s*var\(--font-condensed\)/);
  assert.match(css, /\.selected-card h2[\s\S]*font-family:\s*var\(--font-display\)/);
});

test('one 20 to 24 point mobile gutter governs shared screens and venue surfaces', () => {
  assert.match(css, /--mobile-content-gutter:\s*clamp\(20px,[^;]*24px\)/);
  for (const selector of [
    '.site-header',
    '.command-surface__shell',
    '.detail-shell',
    '.tray-summary',
    '.tray-list__header',
    '.selected-card',
    '.location-card'
  ]) {
    assert.ok(css.includes(selector), `missing shared gutter selector ${selector}`);
  }
  assert.match(css, /padding-left:\s*max\(var\(--mobile-content-gutter\)/);
  assert.match(css, /padding-right:\s*max\(var\(--mobile-content-gutter\)/);
});

test('interactive controls preserve quiet styling with at least 44 point targets', () => {
  assert.match(css, /button,[\s\S]*\[role="button"\][\s\S]*min-height:\s*44px/);
  assert.match(css, /button,[\s\S]*\[role="button"\][\s\S]*min-width:\s*44px/);
  assert.match(css, /\.tray-handle\s*\{[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.command-surface__back,[\s\S]*width:\s*44px[\s\S]*height:\s*44px/);
});

test('bottom navigation uses Inter and one active-state pattern for all destinations', () => {
  assert.match(css, /\.mobile-command\s*\{[\s\S]*font-size:\s*\.8125rem[\s\S]*font-weight:\s*500/);
  assert.match(css, /\.mobile-command:is\(\[aria-current="page"\], \.mobile-command--active\)::after/);
  assert.match(css, /\.mobile-command--add:is\(\[aria-current="page"\], \.mobile-command--active\)::after\s*\{[\s\S]*display:\s*block/);
  assert.match(css, /\.mobile-command__add-mark\s*\{[\s\S]*background:\s*var\(--cgb-neutral-100\)/);
  assert.match(css, /\.mobile-command--add:is\(\[aria-current="page"\], \.mobile-command--active\) \.mobile-command__add-mark\s*\{[\s\S]*background:\s*var\(--cgb-gold-400\)/);
});

test('the work package adds no important override', () => {
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(loader, /!important/);
});
