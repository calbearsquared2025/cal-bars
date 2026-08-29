import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile Add context separates place from helper copy without redundant selected wording', async () => {
  const source = await read('js/shell-controls.mjs');
  const start = source.indexOf('function updateAddContext()');
  const end = source.indexOf('\nfunction showAdd()', start);
  const block = source.slice(start, end);

  assert.match(block, /const place = \[venue\.city, venue\.region\]/);
  assert.match(block, /document\.createElement\('br'\)/);
  assert.match(block, /Available actions will use this place when possible\./);
  assert.doesNotMatch(block, /is selected/);
  assert.match(block, /dom\.addContextCopy\.textContent = place \|\| 'Selected location';/);
});
