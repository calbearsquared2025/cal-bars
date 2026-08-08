import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../css/design-board-4.css', import.meta.url), 'utf8');
const desktop = css.slice(css.lastIndexOf('@media (min-width: 900px)'));

test('shared Bear count hides the people icon only after attendance exists', () => {
  assert.match(css, /\.bear-count:not\(\.bear-count--empty\) \.bear-count__icon\s*\{[^}]*display:\s*none/);
  assert.doesNotMatch(css, /\.bear-count--empty \.bear-count__icon\s*\{[^}]*display:\s*none/);
});

test('selected Venue and Browse surfaces have a clear desktop hierarchy', () => {
  assert.match(desktop, /\.venue-tray \.tray-selected:not\(:empty\)\s*\{[^}]*border-bottom:\s*3px solid var\(--cgb-gold-400\)[^}]*box-shadow:/);
  assert.match(desktop, /\.venue-tray \.tray-list\s*\{[^}]*background:\s*var\(--cgb-neutral-50\)/);
  assert.match(desktop, /\.venue-tray \.tray-list__header\s*\{[^}]*background:\s*rgba\(242, 242, 242, \.98\)/);
  assert.match(desktop, /\.selected-card\s*\{[^}]*background:\s*linear-gradient\(180deg, var\(--cgb-white\) 0%, #fffdf7 100%\)/);
});

test('desktop Bear count is centered with the existing shared markup', () => {
  assert.match(desktop, /\.selected-card \.bear-count\s*\{[^}]*grid-template-columns:\s*1fr[^}]*justify-items:\s*center[^}]*text-align:\s*center/);
  assert.match(desktop, /\.selected-card \.bear-count__icon\s*\{[^}]*grid-row:\s*auto/);
  assert.match(desktop, /\.selected-card \.bear-count__prompt\s*\{[^}]*max-width:\s*80px[^}]*text-align:\s*center/);
});

test('desktop primary and Share actions grow while Details stays untouched', () => {
  assert.match(desktop, /\.selected-card \.action-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 44px 96px[^}]*align-items:\s*center/);
  assert.match(desktop, /\.selected-card \.action-row > \.intent-button\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px/);
  assert.match(desktop, /\.selected-card \.action-row > \.selected-card__share\s*\{[^}]*min-width:\s*96px[^}]*min-height:\s*48px[^}]*font-size:\s*\.76rem/);
  assert.doesNotMatch(desktop, /selected-card__details/);
});
