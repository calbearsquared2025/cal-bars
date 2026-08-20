import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('mobile Search uses the search field as the sole visible focus-ring owner', async () => {
  const [navigationCss, polishCss] = await Promise.all([
    source('css/mobile-command-navigation.css'),
    source('css/mobile-polish.css')
  ]);

  assert.match(
    navigationCss,
    /\.command-surface \.search-field:focus-within\s*\{[^}]*border-color:\s*var\(--cgb-gold-400\);[^}]*box-shadow:\s*var\(--focus-ring\),\s*var\(--shadow-sm\);/
  );

  const inputFocusRule = polishCss.match(
    /\.command-surface \.search-field input:focus-visible\s*\{([^}]*)\}/
  )?.[1] || '';

  assert.match(inputFocusRule, /outline:\s*0;/);
  assert.match(inputFocusRule, /box-shadow:\s*none;/);
});
