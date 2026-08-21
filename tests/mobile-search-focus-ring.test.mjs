import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('Search uses one restrained navy border with a gold inset accent and connected results panel', async () => {
  const [controller, polishCss] = await Promise.all([
    source('js/issue-121-controller.mjs'),
    source('css/mobile-polish.css')
  ]);

  assert.match(
    controller,
    /\.search-field:focus-within,[\s\S]*border-color: var\(--cgb-navy-900, #0b2856\) !important;[\s\S]*box-shadow: inset 0 -3px 0 var\(--cgb-gold-400, #fdb515\), var\(--shadow-sm\) !important;/
  );
  assert.match(controller, /search-suggestions:not\(\[hidden\]\)[\s\S]*border-bottom-left-radius: 0 !important/);
  assert.match(controller, /location-search > \.search-suggestions[\s\S]*margin-top: 0 !important;[\s\S]*border-top: 0 !important/);

  const inputFocusRule = polishCss.match(
    /\.command-surface \.search-field input:focus-visible\s*\{([^}]*)\}/
  )?.[1] || '';
  assert.match(inputFocusRule, /outline:\s*0;/);
  assert.match(inputFocusRule, /box-shadow:\s*none;/);
});
