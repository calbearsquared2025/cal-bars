import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [display, renderer, selectedProfile, icons, css] = await Promise.all([
  read('../js/watch-party-display.js'),
  read('../js/watch-party-renderer.mjs'),
  read('../js/selected-profile-renderer.mjs'),
  read('../js/icon-upgrade.mjs'),
  read('../css/watch-party-display.css')
]);

test('Watch Party host name is emphasized without bolding the Hosted by label', () => {
  assert.ok(renderer.includes("hosted.append(documentObject.createTextNode('Hosted by '))"));
  assert.ok(renderer.includes('host.textContent = party.organizer_name'));
});

test('Watch Party external links use text-only presentation', () => {
  assert.match(renderer, /link\.textContent = detail \? 'External event details' : 'Event information'/);
  assert.doesNotMatch(renderer, /createIcon\('external'/);
  assert.doesNotMatch(icons, /party-module a\[target="_blank"\][\s\S]*appendIcon/);
  assert.doesNotMatch(display, /Open event information/);
});

test('Share actions settle as text-only controls', () => {
  const iconResolver = icons.match(/function actionIconName\(element\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(iconResolver, /share/);
  assert.ok(selectedProfile.includes("share.textContent = hasWatchParty ? 'Share Watch Party' : 'Share'"));
  assert.doesNotMatch(renderer, /share\.append\(createIcon\('share'/);
  assert.doesNotMatch(icons, /clarifyShareLabels/);
});

test('Report an Issue is a right-aligned muted utility link', () => {
  assert.match(css, /\.party-module__report \{[\s\S]*justify-self: end;[\s\S]*margin: 0\.65rem 0 0 auto;[\s\S]*color: var\(--cgb-ink-500\);[\s\S]*text-align: right;/);
});
