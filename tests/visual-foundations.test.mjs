import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [css, html] = await Promise.all([
  readFile(new URL('../css/visual-foundations.css', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);

test('approved typefaces load from the document head and use shared font roles', () => {
  assert.match(html, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
  assert.match(html, /family=Barlow\+Condensed:wght@600\.\.900/);
  assert.match(html, /family=Inter:wght@400\.\.900/);
  assert.match(html, /family=Source\+Serif\+4:opsz,wght@8\.\.60,400\.\.800/);
  assert.match(html, /css\/mobile-polish\.css[\s\S]*css\/visual-foundations\.css/);

  assert.match(css, /--font-ui:\s*"Inter"/);
  assert.match(css, /--font-display:\s*"Source Serif 4"/);
  assert.match(css, /--font-condensed:\s*"Barlow Condensed"/);
  assert.match(css, /\.mobile-command[\s\S]*font-family:\s*var\(--font-ui\)/);
  assert.match(css, /\.eyebrow[\s\S]*font-family:\s*var\(--font-condensed\)/);
  assert.match(css, /\.selected-card h2[\s\S]*font-family:\s*var\(--font-display\)/);
  assert.match(css, /\.bear-count,[\s\S]*\.location-card__count[\s\S]*font-family:\s*var\(--font-ui\)/);
  assert.match(css, /\.bear-count,[\s\S]*\.location-card__count\s*\{[\s\S]*text-transform:\s*none/);
});

test('one 20 to 24 point mobile gutter governs shared screens and venue surfaces', () => {
  assert.match(css, /--mobile-content-gutter:\s*clamp\(20px,[^;]*24px\)/);
  for (const selector of [
    '.site-header',
    '.map-toolbar',
    '.command-surface__shell',
    '.tray-summary',
    '.tray-list__header',
    '.selected-card',
    '.location-card',
    '.detail-hero',
    '.detail-game-context'
  ]) {
    assert.ok(css.includes(selector), `missing shared gutter selector ${selector}`);
  }
  assert.match(css, /padding-left:\s*max\(var\(--mobile-content-gutter\)/);
  assert.match(css, /padding-right:\s*max\(var\(--mobile-content-gutter\)/);
  assert.match(css, /margin-left:\s*var\(--mobile-content-gutter\)/);
  assert.match(css, /margin-right:\s*var\(--mobile-content-gutter\)/);
});

test('interactive controls preserve quiet styling with at least 44 point targets', () => {
  assert.match(css, /button,[\s\S]*\[role="button"\][\s\S]*min-height:\s*44px/);
  assert.match(css, /button,[\s\S]*\[role="button"\][\s\S]*min-width:\s*44px/);
  assert.match(css, /\.brand,[\s\S]*\.party-module a[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.tray-handle,[\s\S]*\.maplibregl-ctrl button[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.command-surface__back,[\s\S]*width:\s*44px[\s\S]*height:\s*44px/);
});

test('bottom navigation uses Inter and one active-state pattern for all destinations', () => {
  assert.match(css, /\.mobile-command\s*\{[\s\S]*font-size:\s*\.8125rem[\s\S]*font-weight:\s*500/);
  assert.match(css, /\.mobile-command \.ui-icon,[\s\S]*fill:\s*none/);
  assert.match(css, /\.mobile-command:is\(\[aria-current="page"\], \.mobile-command--active\)::after/);
  assert.match(css, /\.mobile-command--add:is\(\[aria-current="page"\], \.mobile-command--active\)::after\s*\{[\s\S]*display:\s*block/);
  assert.match(css, /\.mobile-command__add-mark\s*\{[\s\S]*background:\s*var\(--cgb-neutral-100\)/);
  assert.match(css, /\.mobile-command--add:is\(\[aria-current="page"\], \.mobile-command--active\) \.mobile-command__add-mark\s*\{[\s\S]*background:\s*var\(--cgb-gold-400\)/);
});

test('the work package adds no important override', () => {
  assert.doesNotMatch(css, /!important/);
});
