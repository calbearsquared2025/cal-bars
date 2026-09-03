import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('MapTiler attribution is SDK-owned without duplicate page branding or controls', async () => {
  const [app, iconUpgrade, index] = await Promise.all([
    read('js/app.js'),
    read('js/icon-upgrade.mjs'),
    read('index.html')
  ]);

  assert.match(app, /attributionControl:\s*\{\s*compact:\s*true\s*\}/);
  assert.doesNotMatch(app, /addControl\(\s*new\s+sdk\.AttributionControl/);
  assert.match(iconUpgrade, /attributionControl:\s*\{\s*compact:\s*true\s*\}/);
  assert.doesNotMatch(index, /<a\s+class="maptiler-logo"/);
  assert.doesNotMatch(index, /assets\/maptiler-logo\.svg/);
});
