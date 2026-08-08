import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-profile-aesthetic-refinement.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('expanded profile no longer owns an alternate attendance layout', () => {
  assert.doesNotMatch(source, /bear-count/);
  assert.doesNotMatch(source, /grid-template-columns: minmax\(0, 1fr\) minmax\(112px, 34%\)/);
});

test('planned Watch Party details remain visible in a compact light treatment', () => {
  assert.match(source, /dark navy is reserved for the primary RSVP action/);
  assert.match(source, /selected-card > \.party-module[\s\S]*display: grid !important/);
  assert.match(source, /background: linear-gradient\(135deg, var\(--cgb-gold-50\), var\(--cgb-white\) 78%\)/);
  assert.match(source, /border-left: 4px solid var\(--cgb-gold-400\)/);
  assert.match(source, /party-module__report[\s\S]*color: var\(--cgb-ink-500\)/);
});

test('empty Watch Party prompt includes the approved period and secondary action', () => {
  assert.match(source, /No Watch Party for this game\./);
  assert.match(source, /\+ Plan a Watch Party/);
  assert.match(source, /selected-card__plan-party-status/);
  assert.match(source, /selected-card__plan-party-action/);
});

test('utility actions are text-only and presented as one segmented control', () => {
  assert.match(source, /secondary-button \.ui-icon[\s\S]*display: none !important/);
  assert.match(source, /intent-button \+ \.secondary-button[\s\S]*border-radius: 10px 0 0 10px/);
  assert.match(source, /secondary-button:last-child[\s\S]*border-radius: 0 10px 10px 0/);
  assert.match(source, /min-height: 46px !important/);
});


test('bottom navigation uses a pale navy treatment', () => {
  assert.match(source, /\.mobile-command-bar/);
  assert.match(source, /var\(--cgb-navy-50\)/);
  assert.match(source, /#f4f7ff/);
});

test('aesthetic refinement is loaded after the functional mobile refinements', () => {
  assert.match(icons, /import '\.\/mobile-tab-location-refinement\.mjs';[\s\S]*import '\.\/map-profile-aesthetic-refinement\.mjs';/);
  assert.match(icons, /import '\.\/search-map-refinement\.mjs';/);
});
