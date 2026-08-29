import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('About contact and support actions share the same link treatment', async () => {
  const css = await read('css/support-dialog.css');

  assert.match(css, /\.about-contact-line a,\s*\.about-support \.text-button \{/);
  assert.match(css, /color: var\(--cgb-navy-900, var\(--cal-blue\)\);/);
  assert.match(css, /text-decoration: underline;/);
  assert.match(css, /text-underline-offset: 2px;/);
});
