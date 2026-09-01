import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/icon-upgrade.mjs', import.meta.url), 'utf8');

test('post-render venue-profile refinements settle before the next paint', () => {
  assert.match(source, /let postRenderUpgradeQueued = false/);
  assert.match(source, /function schedulePostRenderUpgrade\(\) \{[\s\S]*?queueMicrotask\(\(\) => \{[\s\S]*?runRefinements\(\);[\s\S]*?\}\);[\s\S]*?\}/);
  assert.match(source, /subscribe\?\.\('rendered', schedulePostRenderUpgrade\)/);
  assert.match(source, /subscribe\?\.\('ready', schedulePostRenderUpgrade\)/);
});

test('animation-frame scheduling remains limited to resize and media-settling work', () => {
  assert.match(source, /function scheduleUpgrade\(\) \{[\s\S]*?requestAnimationFrame\(/);
  assert.match(source, /matchMedia\?\.\(WIDE_DESKTOP_QUERY\)\?\.addEventListener\?\.\('change', scheduleUpgrade\)/);
  assert.doesNotMatch(source, /subscribe\?\.\('rendered', scheduleUpgrade\)/);
});
