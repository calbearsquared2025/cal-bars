import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../css/venue-detail.css', import.meta.url), 'utf8');
const marker = '/* Mobile portrait: compact global header + full-width white venue surface. */';
const mobileSurface = css.slice(css.indexOf(marker));

test('mobile detail reuses the compact portrait header height', () => {
  assert.ok(mobileSurface.startsWith(marker));
  assert.match(mobileSurface, /--header-height: calc\(94px \+ env\(safe-area-inset-top, 0px\)\) !important/);
  assert.match(mobileSurface, /\.site-header \{[\s\S]*height: var\(--header-height\) !important;[\s\S]*display: block !important/);
});

test('mobile detail uses a full-width white surface after a small navy gap', () => {
  assert.match(mobileSurface, /\.detail-view \{[\s\S]*padding: 14px 0 0 !important;[\s\S]*background: var\(--cgb-navy-900\) !important/);
  assert.match(mobileSurface, /\.detail-shell \{[\s\S]*width: 100% !important;[\s\S]*max-width: none !important;[\s\S]*background: var\(--cgb-white\) !important;[\s\S]*border-radius: 22px 22px 0 0 !important/);
  assert.match(mobileSurface, /\.venue-detail \{[\s\S]*background: var\(--cgb-white\) !important;[\s\S]*border-radius: 0 !important;[\s\S]*box-shadow: none !important/);
});

test('back to map participates in the white detail surface instead of overlaying the hero', () => {
  assert.match(mobileSurface, /\.back-link \{[\s\S]*position: relative !important;[\s\S]*top: auto !important;[\s\S]*left: auto !important;[\s\S]*margin: 0 16px 4px !important/);
});
