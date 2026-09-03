import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('MapTiler maps use the SDK-owned compact attribution control exactly once', async () => {
  const [app, iconUpgrade] = await Promise.all([
    read('js/app.js'),
    read('js/icon-upgrade.mjs')
  ]);

  assert.match(app, /attributionControl:\s*\{\s*compact:\s*true\s*\}/);
  assert.doesNotMatch(app, /addControl\(\s*new\s+sdk\.AttributionControl/);
  assert.match(iconUpgrade, /attributionControl:\s*\{\s*compact:\s*true\s*\}/);
});
