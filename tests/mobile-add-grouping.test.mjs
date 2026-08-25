import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const [html, refinement, shell] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('js/search-map-refinement.mjs', root), 'utf8'),
  readFile(new URL('js/shell-controls.mjs', root), 'utf8')
]);

test('mobile Add separates selected-place actions from global location search', () => {
  const addSurface = html.match(/<section id="add-surface"[\s\S]*?<section id="about-surface"/)?.[0] || '';
  const selectedSection = addSurface.match(/<section class="add-context"[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(selectedSection, /hidden/);
  assert.match(selectedSection, /Selected place/);
  assert.match(selectedSection, /id="add-watch-party-button"[\s\S]*Add a Watch Party/);
  assert.match(selectedSection, /id="add-cal-bar-button"[\s\S]*Tell us about this location/);
  assert.match(selectedSection, /id="add-report-button"/);
  assert.doesNotMatch(selectedSection, /id="add-new-location-button"/);

  assert.match(addSurface, /<section class="add-somewhere-else"[\s\S]*Add somewhere else[\s\S]*id="add-new-location-button"[\s\S]*Search for another location/);
  assert.ok(addSurface.indexOf('add-somewhere-else') > addSurface.indexOf('add-context'));
});

test('another-location search reuses the existing handoff without new Add state', () => {
  assert.match(refinement, /#add-new-location-button[\s\S]*#search-add-location-button[\s\S]*\.click\(\)/);
  assert.match(shell, /dom\.addLocationSearch\.addEventListener\('click', showAddLocationSearch\)/);
  assert.match(shell, /function showAddLocationSearch\(\)[\s\S]*setSearchMode\('add-location'\)[\s\S]*setSurface\('search', \{ focus: true \}\)/);
  assert.match(shell, /Search for another location/);
  assert.match(shell, /dom\.addContext\.hidden = !venue/);
  assert.doesNotMatch(refinement, /MutationObserver/);
});