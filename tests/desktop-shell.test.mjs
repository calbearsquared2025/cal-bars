import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [baseCss, designSystemCss, desktopCss] = await Promise.all([
  readFile(new URL('../css/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/design-system.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/design-board-4.css', import.meta.url), 'utf8')
]);
const desktopLayer = desktopCss.slice(desktopCss.lastIndexOf('@media (min-width: 900px)'));

test('desktop map owns the complete application canvas without a legacy grid split', () => {
  assert.doesNotMatch(baseCss, /\.map-view\s*\{[^}]*grid-template-columns:/);
  assert.doesNotMatch(baseCss, /\.map\s*\{[^}]*grid-column:\s*1/);
  assert.doesNotMatch(designSystemCss, /\.map-view\s*\{[^}]*grid-template-columns:/);
});

test('desktop rail geometry and independent scrolling have one authoritative rule', () => {
  assert.match(desktopCss, /@media \(min-width: 900px\)[\s\S]*\.venue-tray\s*\{[^}]*top:\s*22px[^}]*right:\s*24px[^}]*bottom:\s*22px[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*width:\s*min\(390px, 34vw\)[^}]*height:\s*auto[^}]*max-height:\s*none/);
  assert.match(desktopCss, /\.venue-tray \.tray-selected:not\(:empty\)\s*\{[^}]*flex:\s*0 0 auto[^}]*max-height:\s*48%[^}]*overflow-y:\s*auto/);
  assert.match(desktopCss, /\.venue-tray \.tray-list\s*\{[^}]*flex:\s*1 1 auto[^}]*min-height:\s*0[^}]*max-height:\s*none[^}]*overflow-y:\s*auto/);
  assert.doesNotMatch(baseCss, /\.venue-tray\s*\{[^}]*height:\s*auto\s*!important/);
  assert.doesNotMatch(desktopLayer, /\.tray--(?:peek|selected|full)\s*\{[^}]*\b(?:top|height|max-height)\s*:/);
});

test('desktop footer consumes its declared viewport allocation', () => {
  assert.match(desktopCss, /\.site-footer\s*\{[^}]*display:\s*flex[^}]*height:\s*var\(--footer-height\)[^}]*min-height:\s*var\(--footer-height\)[^}]*padding-block:\s*0/);
  assert.match(desktopCss, /\.site-footer \.text-button\s*\{[^}]*min-height:\s*0/);
});
