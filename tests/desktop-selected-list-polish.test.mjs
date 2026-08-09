import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../css/design-board-4.css', import.meta.url), 'utf8');
const attendanceProfile = await readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8');
const desktop = css.slice(css.lastIndexOf('@media (min-width: 900px)'));

test('shared Bear count hides the people icon only after attendance exists', () => {
  assert.match(attendanceProfile, /\.bear-count:not\(\.bear-count--empty\) \.bear-count__icon\s*\{[^}]*display:\s*none/);
  assert.doesNotMatch(attendanceProfile, /\.bear-count--empty \.bear-count__icon\s*\{[^}]*display:\s*none/);
});

test('selected Venue and Locations use one full-height desktop panel state at a time', () => {
  assert.match(desktop, /\.venue-tray \.tray-selected,\s*\.venue-tray \.tray-list\s*\{[^}]*flex:\s*1 1 auto[^}]*overflow-y:\s*auto/);
  assert.match(desktop, /\.venue-tray \.tray-selected\[hidden\],\s*\.venue-tray \.tray-list\[hidden\]\s*\{[^}]*display:\s*none !important/);
  assert.doesNotMatch(desktop, /max-height:\s*48%/);
  assert.doesNotMatch(desktop, /border-bottom:\s*3px solid var\(--cgb-gold-400\)/);
  assert.match(desktop, /\.venue-tray \.tray-list\s*\{[^}]*background:\s*var\(--cgb-neutral-50\)/);
  assert.match(desktop, /\.selected-card\s*\{[^}]*background:\s*linear-gradient\(180deg, var\(--cgb-white\) 0%, #fffdf7 100%\)/);
});

test('desktop Bear count uses the shared centered attendance component', () => {
  assert.doesNotMatch(desktop, /\.selected-card \.bear-count/);
  assert.match(attendanceProfile, /\.selected-card > \.bear-count\s*\{[^}]*grid-template-columns:\s*1fr !important[^}]*justify-items:\s*center !important[^}]*text-align:\s*center !important/);
  assert.match(attendanceProfile, /\.selected-card \.bear-count__prompt\s*\{[^}]*margin-top:\s*2px !important[^}]*font-weight:\s*850 !important/);
});

test('desktop primary and Share actions grow while Details stays untouched', () => {
  assert.match(desktop, /\.selected-card \.action-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 44px 96px[^}]*align-items:\s*center/);
  assert.match(desktop, /\.selected-card \.action-row > \.intent-button\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px/);
  assert.match(desktop, /\.selected-card \.action-row > \.selected-card__share\s*\{[^}]*min-width:\s*96px[^}]*min-height:\s*48px[^}]*font-size:\s*\.76rem/);
  assert.doesNotMatch(desktop, /selected-card__details/);
});
