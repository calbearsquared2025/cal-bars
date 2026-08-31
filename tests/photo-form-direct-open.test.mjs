import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const photoFormSource = readFileSync(new URL('../js/photo-form.js', import.meta.url), 'utf8');
const balanceSource = readFileSync(new URL('../js/desktop-profile-final-balance.mjs', import.meta.url), 'utf8');

test('wide desktop no-photo profile promotes the photo form into the map fallback', () => {
  assert.match(photoFormSource, /syncDesktopProfileFinalBalance/);
  assert.match(photoFormSource, /balance\.mode === 'map'/);
  assert.match(photoFormSource, /entryPoint: 'map-overlay'/);
  assert.match(photoFormSource, /className: 'detail-local-map__photo-action'/);
  assert.match(photoFormSource, /label: 'Add photo'/);
  assert.match(balanceSource, /desktopFallbackMap = 'true'/);
  assert.match(balanceSource, /\[data-desktop-fallback-map="true"\] > \.detail-local-map/);
  assert.match(balanceSource, /const localMap = detail\.querySelector\(':scope > \.detail-local-map'\)/);
});

test('photo form keeps the normal contribution entry outside the desktop map fallback', () => {
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
  assert.match(photoFormSource, /label: 'Add a new photo'/);
});
