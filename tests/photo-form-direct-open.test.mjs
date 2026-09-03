import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const photoFormSource = readFileSync(new URL('../js/photo-form.js', import.meta.url), 'utf8');

test('photo form no longer promotes an Add photo action into a profile map fallback', () => {
  assert.doesNotMatch(photoFormSource, /syncDesktopProfileFinalBalance/);
  assert.doesNotMatch(photoFormSource, /balance\.mode === 'map'/);
  assert.doesNotMatch(photoFormSource, /entryPoint: 'map-overlay'/);
  assert.doesNotMatch(photoFormSource, /className: 'detail-local-map__photo-action'/);
});

test('photo form keeps the normal prefilled contribution entry', () => {
  assert.match(photoFormSource, /buildPhotoFormPrefillUrl\(readPhotoFormConfig\(documentObject\), venue\)/);
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
  assert.match(photoFormSource, /label: 'Add a new photo'/);
});
