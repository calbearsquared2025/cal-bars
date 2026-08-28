import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop Venue Profile renders attendance as one compact status row without helper copy', async () => {
  const css = await read('css/fan-intent.css');
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*?#venue-detail\.venue-detail > \.activity-card:has\(\.bear-count__number\)[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\)\s*!important;[\s\S]*?padding:\s*10px 18px\s*!important;/);
  assert.match(css, /activity-card:has\(\.bear-count__number\) > strong\s*\{[\s\S]*?display:\s*contents\s*!important;/);
  assert.match(css, /activity-card:has\(\.bear-count__number\) > \.activity-card__presence\s*\{[\s\S]*?display:\s*none\s*!important;/);
  assert.match(css, /activity-card:has\(\.bear-count__number\) > p:not\(\.activity-card__presence\)\s*\{[\s\S]*?grid-column:\s*2\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
});

test('search helper stays hidden during first paint until search opens it', async () => {
  const [css, html] = await Promise.all([
    read('css/external-venue.css'),
    read('index.html')
  ]);
  assert.match(html, /<div id="search-dropdown" class="search-suggestions" hidden>/);
  assert.match(css, /#search-dropdown\[hidden\]\s*\{[\s\S]*?display:\s*none\s*!important;[\s\S]*?\}/);
});
