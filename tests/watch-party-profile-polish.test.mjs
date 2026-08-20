import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [display, icons, css] = await Promise.all([
  read('../js/watch-party-display.js'),
  read('../js/icon-upgrade.mjs'),
  read('../css/watch-party-display.css')
]);

test('Watch Party host name is emphasized without bolding the Hosted by label', () => {
  assert.match(display, /hosted\.append\(document\.createTextNode\('Hosted by '\)\)/);
  assert.match(display, /const hostName = document\.createElement\('strong'\)[\s\S]*hostName\.textContent = party\.organizer_name/);
});

test('Watch Party external links use text-only presentation', () => {
  assert.match(display, /link\.textContent = detail \? 'External event details' : 'Open event information'/);
  assert.doesNotMatch(display, /createIcon\('external'\)/);
  assert.doesNotMatch(icons, /party-module a\[target="_blank"\][\s\S]*appendIcon/);
});

test('Share actions settle as text-only controls', () => {
  const iconResolver = icons.match(/function actionIconName\(element\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(iconResolver, /share/);
  assert.match(icons, /share\.replaceChildren\(document\.createTextNode\(detail \? 'Share' : hasWatchParty \? 'Share Watch Party' : 'Share'\)\)/);
});

test('Report an Issue is a right-aligned muted utility link', () => {
  assert.match(css, /\.party-module__report \{[\s\S]*justify-self: end;[\s\S]*margin: 0\.65rem 0 0 auto;[\s\S]*color: var\(--cgb-ink-500\);[\s\S]*text-align: right;/);
});
