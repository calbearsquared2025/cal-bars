import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../js/core.mjs', import.meta.url), 'utf8');
const markerCss = await readFile(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');

test('marker semantic overrides load after the base marker styles', () => {
  const baseStyles = html.indexOf('css/styles.css');
  const markerOverrides = html.indexOf('css/watch-party-display.css');

  assert.ok(baseStyles >= 0);
  assert.ok(markerOverrides > baseStyles);
});

test('selected-game Watch Parties retain the event marker kind', () => {
  assert.match(core, /if \(getWatchParty\(snapshot, gameId, venue\?\.venue_id\)\) return 'watch-party'/);
  assert.match(app, /symbol\.className = kind === 'watch-party' \? 'marker-star' : 'marker-pin'/);
});

test('Watch Party markers use a gold outer treatment with a blue inner treatment', () => {
  assert.match(
    markerCss,
    /\.marker--watch-party \.marker-star\s*\{[^}]*color:\s*var\(--cal-blue\)[^}]*-webkit-text-stroke:\s*3px var\(--cal-gold\)[^}]*paint-order:\s*stroke fill/s
  );
});

test('Cal Bar markers use blue outer and white inner treatments', () => {
  assert.match(
    markerCss,
    /\.marker--cal-bar \.marker-pin\s*\{[^}]*background:\s*var\(--cal-blue\)[^}]*border-color:\s*white/s
  );
  assert.match(
    markerCss,
    /\.marker--cal-bar \.marker-pin::after\s*\{[^}]*background:\s*white/s
  );
});

test('Community Location markers remain white with a blue outline and center', () => {
  assert.match(
    markerCss,
    /\.marker--community-location \.marker-pin\s*\{[^}]*background:\s*white[^}]*border-color:\s*var\(--cal-blue\)/s
  );
  assert.match(
    markerCss,
    /\.marker--community-location \.marker-pin::after\s*\{[^}]*background:\s*var\(--cal-blue\)/s
  );
});
