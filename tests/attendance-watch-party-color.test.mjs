import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('active attendance uses the Watch Party yellow on desktop and mobile', async () => {
  const [fanIntentSource, watchPartySource] = await Promise.all([
    read('css/fan-intent.css'),
    read('css/watch-party-display.css')
  ]);

  assert.match(watchPartySource, /\.badge--party[\s\S]*?background: #f3c24f !important;/);
  assert.match(
    fanIntentSource,
    /\.primary-button\.intent-button\[aria-pressed="true"\][\s\S]*?background: #f3c24f;/
  );
  assert.doesNotMatch(
    fanIntentSource,
    /\.primary-button\.intent-button\[aria-pressed="true"\][\s\S]*?background: var\(--cal-gold\)/
  );
});
