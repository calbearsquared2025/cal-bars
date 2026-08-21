import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssUrl = new URL('../css/support-dialog.css', import.meta.url);

test('search focus keeps the navy border and uses gold only as an inset accent', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.command-surface \.search-field:focus-within\s*\{[^}]*border-color:\s*var\(--cgb-navy-800[^}]*inset 0 -3px 0 var\(--cgb-gold-400/s);
  assert.match(css, /\.map-toolbar \.search-field:focus-within\s*\{[^}]*border-color:\s*var\(--cgb-navy-800[^}]*inset 0 -3px 0 var\(--cgb-gold-400/s);
  assert.doesNotMatch(css, /\.map-toolbar \.search-field:focus-within\s*\{[^}]*border-color:\s*var\(--cgb-gold/s);
  assert.doesNotMatch(css, /\.map-toolbar \.search-field:focus-within\s*\{[^}]*0 0 0 2px rgba\(253, 181, 21/s);
});
