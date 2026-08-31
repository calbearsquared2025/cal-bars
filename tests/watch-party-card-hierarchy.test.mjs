import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const renderer = readFileSync(new URL('../js/watch-party-renderer.mjs', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');

test('watch party card separates matchup, date, and timing context', () => {
  assert.match(renderer, /date\.className = 'party-module__date'/);
  assert.match(renderer, /date\.textContent = formatGameDate\(game\)\.toUpperCase\(\)/);
  assert.match(renderer, /`CAL \$\{gameTitle\(game\)\.toUpperCase\(\)\}`/);
  assert.match(renderer, /return 'Kickoff Time TBD'/);
  assert.match(renderer, /\[kickoffLabel\(game\), arrivalLabel\(party\)\]\.filter\(Boolean\)\.join\(' · '\)/);
});

test('watch party card uses the header right edge for the game date', () => {
  assert.match(styles, /\.party-module__title \{[\s\S]*display: flex;[\s\S]*width: 100%;/);
  assert.match(styles, /\.party-module__date \{[\s\S]*margin-left: auto;[\s\S]*white-space: nowrap;/);
  assert.match(styles, /\.party-game-context \{[\s\S]*font-weight: 800;/);
  assert.match(styles, /\.party-module__time \{[\s\S]*font-weight: 600;/);
});

test('mobile keeps the trailing watch party star beside the title', () => {
  assert.match(
    styles,
    /@media \(max-width: 899px\) \{[\s\S]*\.party-module__date \{[\s\S]*margin-left: 0;/
  );
});
