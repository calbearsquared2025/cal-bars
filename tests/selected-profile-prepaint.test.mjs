import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const finalPass = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const fanIntent = await readFile(new URL('js/fan-intent.js', root), 'utf8');

test('selected-profile final pass runs after synchronous feature renderers but before browser paint', () => {
  assert.match(fanIntent, /subscribeAppEvent\('rendered', renderVenueActivity\)/);
  assert.match(fanIntent, /subscribeAppEvent\('rendered', renderIntentButtons\)/);
  assert.match(finalPass, /let refinementQueued = false;/);
  assert.match(finalPass, /function scheduleRefinement\(\) \{[\s\S]*queueMicrotask\(\(\) => \{[\s\S]*refine\(\);[\s\S]*\}\);[\s\S]*\}/);
});

test('selected-profile refinement no longer waits for animation frames', () => {
  const schedule = finalPass.match(/function scheduleRefinement\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.ok(schedule, 'scheduleRefinement should exist');
  assert.doesNotMatch(schedule, /requestAnimationFrame/);
});
