import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/support-dialog.mjs', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../css/support-dialog.css', import.meta.url), 'utf8');

test('support entry points use the CGB Ko-fi panel without loading it at first paint', () => {
  assert.match(html, /data-support-open>Buy me a beer<\/button>/);
  assert.match(html, /id="kofiframe"/);
  assert.match(html, /data-src="https:\/\/ko-fi\.com\/calgoldenbars\/\?hidefeed=true&amp;widget=true&amp;embed=true&amp;preview=true"/);
  assert.doesNotMatch(html, /id="kofiframe"[^>]*\ssrc=/s);
  assert.match(html, /href="https:\/\/ko-fi\.com\/calgoldenbars"/);
});

test('support dialog loads Ko-fi only after an explicit open action', () => {
  assert.match(script, /frame\.hasAttribute\('src'\)/);
  assert.match(script, /frame\.setAttribute\('src', frame\.dataset\.src\)/);
  assert.match(script, /button\.addEventListener\('click', openDialog\)/);
  assert.match(script, /dialog\.showModal\(\)/);
});

test('support dialog stays compact and viewport-bounded', () => {
  assert.match(styles, /width: min\(92vw, 480px\)/);
  assert.match(styles, /max-height: 80dvh/);
  assert.match(styles, /height: min\(600px, calc\(80dvh - 108px\)\)/);
  assert.match(styles, /background: rgba\(1, 1, 51, \.5\)/);
});
