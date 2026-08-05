import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-profile-aesthetic-refinement.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('expanded profile restores an asymmetric identity and attendance layout', () => {
  assert.match(source, /grid-template-columns: minmax\(0, 1fr\) minmax\(112px, 34%\)/);
  assert.match(source, /selected-card__header[\s\S]*grid-column: 1 !important/);
  assert.match(source, /bear-count[\s\S]*grid-column: 2 !important/);
  assert.match(source, /padding: 30px 2px 0 0 !important/);
});

test('planned Watch Party details remain visible in expanded small-phone profiles', () => {
  assert.match(source, /Watch Party details remain decision-critical on small phones/);
  assert.match(source, /tray--selected:not\(\[data-selected-density="compact"\]\)[\s\S]*selected-card > \.party-module[\s\S]*display: grid !important/);
  assert.match(source, /selected-card > \.party-module p[\s\S]*font-size: \.72rem !important/);
  assert.match(source, /selected-card > \.party-module \.party-module__report/);
});

test('empty Watch Party prompt includes the approved period and secondary action', () => {
  assert.match(source, /No Watch Party for this game\./);
  assert.match(source, /\+ Plan a Watch Party/);
  assert.match(source, /selected-card__plan-party-status/);
  assert.match(source, /selected-card__plan-party-action/);
});

test('utility actions become text-only touch targets with dividers', () => {
  assert.match(source, /secondary-button \.ui-icon[\s\S]*display: none !important/);
  assert.match(source, /secondary-button \+ \.secondary-button[\s\S]*border-left/);
  assert.match(source, /min-height: 44px !important/);
});

test('bottom navigation uses a pale navy treatment', () => {
  assert.match(source, /\.mobile-command-bar/);
  assert.match(source, /var\(--cgb-navy-50\)/);
  assert.match(source, /#f4f7ff/);
});

test('aesthetic refinement is loaded after the functional mobile refinements', () => {
  assert.match(icons, /import '\.\/mobile-tab-location-refinement\.mjs';[\s\S]*import '\.\/map-profile-aesthetic-refinement\.mjs';/);
});
