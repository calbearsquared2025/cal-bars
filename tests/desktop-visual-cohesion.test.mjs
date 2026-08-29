import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/desktop-visual-cohesion.mjs', import.meta.url), 'utf8');
const profileSource = await readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8');

test('desktop cohesion module is loaded without changing mobile rules', () => {
  assert.match(profileSource, /import '\.\/desktop-visual-cohesion\.mjs';/);
  assert.match(source, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(source, /@media \(max-width: 899px\)/);
});

test('desktop map search uses a white field surface', () => {
  assert.match(source, /\.map-toolbar \.search-field[\s\S]*?background: var\(--cgb-white, #fff\) !important;/);
});

test('desktop Add surface uses warm cream with white action cards and a gold selected-place accent', () => {
  assert.match(source, /#add-surface > \.command-surface__shell[\s\S]*?background: var\(--cgb-warm-50, #f7f6f2\)/);
  assert.match(source, /#add-surface \.add-context[\s\S]*?background: #fbfaf5[\s\S]*?border-left: 4px solid var\(--cgb-gold-400, #fdb515\)/);
  assert.match(source, /#add-surface \.add-context \.add-action[\s\S]*?background: var\(--cgb-white, #fff\)/);
  assert.match(source, /title\.textContent = 'Add somewhere else'/);
});

test('desktop footer contains only the requested compact utility content', () => {
  assert.match(source, /brand\.textContent = 'CAL GOLDEN BARS'/);
  assert.match(source, /addButton\.textContent = 'Add to CGB'/);
  assert.match(source, /socialLink\.textContent = '@calbearsquared'/);
  assert.match(source, /disclaimer\.textContent = 'Not affiliated with Cal Athletics or the California Alumni Association'/);
  assert.doesNotMatch(source, /CrowdMapped/i);
  assert.match(source, /background: var\(--cgb-warm-50, #f7f6f2\)/);
});

test('desktop footer is flush with square corners', () => {
  assert.match(source, /\.site-footer\.site-footer--desktop-cohesion[\s\S]*?border-radius: 0 !important;[\s\S]*?clip-path: none !important;/);
});
