import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-profile-aesthetic-refinement.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('superseded aesthetic layer no longer owns Map or Tray presentation', () => {
  assert.match(source, /retires this module's Map\/Tray overrides/);
  assert.doesNotMatch(source, /selected-card|bear-count|party-module|action-row|fullscreen-button/);
  assert.doesNotMatch(source, /!important/);
});

test('aesthetic compatibility module remains loaded after functional refinements', () => {
  assert.match(icons, /import '\.\/mobile-tab-location-refinement\.mjs';[\s\S]*import '\.\/map-profile-aesthetic-refinement\.mjs';/);
  assert.match(source, /data-visual-foundation/);
});
