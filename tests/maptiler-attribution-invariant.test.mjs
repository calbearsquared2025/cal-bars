import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('MapTiler attribution has one SDK logo and one compact text control', async () => {
  const [app, iconUpgrade, index] = await Promise.all([
    read('js/app.js'),
    read('js/icon-upgrade.mjs'),
    read('index.html')
  ]);

  assert.match(app, /attributionControl:\s*false/);
  assert.match(app, /addControl\(new sdk\.AttributionControl\(\{ compact: true \}\), 'bottom-right'\)/);
  assert.equal((app.match(/new sdk\.AttributionControl/g) || []).length, 1);
  assert.match(iconUpgrade, /attributionControl:\s*false/);
  assert.doesNotMatch(index, /<a\s+class="maptiler-logo"/);
  assert.doesNotMatch(index, /assets\/maptiler-logo\.svg/);
});
