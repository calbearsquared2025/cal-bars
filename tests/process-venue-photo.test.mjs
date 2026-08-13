import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  PHOTO_DEFAULTS,
  normalizeOptionalHttpUrl,
  normalizeVenueSlug,
  parsePhotoArgs,
  venuePhotoOutputPath,
  venuePhotoPublicUrl
} from '../scripts/process-venue-photo.mjs';

test('photo processor uses safe production defaults', () => {
  const options = parsePhotoArgs(['--input', 'photo.jpg', '--slug', 'molly-o-s-san-carlos']);
  assert.equal(options.input, 'photo.jpg');
  assert.equal(options.slug, 'molly-o-s-san-carlos');
  assert.equal(options.maxWidth, 1600);
  assert.equal(options.quality, 82);
  assert.equal(options.targetKb, 500);
  assert.equal(options.force, false);
});

test('photo processor accepts optional public metadata and overrides', () => {
  const options = parsePhotoArgs([
    '--input', 'photo.png',
    '--slug', 'molly-o-s-san-carlos',
    '--caption', 'Cal fans on game day.',
    '--credit', '@oskistraw',
    '--credit-url', 'https://x.com/oskistraw',
    '--max-width', '1400',
    '--quality', '76',
    '--target-kb', '450',
    '--force'
  ]);

  assert.equal(options.caption, 'Cal fans on game day.');
  assert.equal(options.credit, '@oskistraw');
  assert.equal(options.creditUrl, 'https://x.com/oskistraw');
  assert.equal(options.maxWidth, 1400);
  assert.equal(options.quality, 76);
  assert.equal(options.targetKb, 450);
  assert.equal(options.force, true);
});

test('photo processor rejects unsafe slugs and credit URLs', () => {
  assert.throws(() => normalizeVenueSlug('../venue'), /lowercase kebab-case/);
  assert.throws(() => normalizeVenueSlug('Molly O'), /lowercase kebab-case/);
  assert.throws(() => normalizeOptionalHttpUrl('javascript:alert(1)'), /http\(s\)/);
});

test('photo processor rejects missing and out-of-range arguments', () => {
  assert.throws(() => parsePhotoArgs(['--slug', 'molly-o-s-san-carlos']), /--input is required/);
  assert.throws(() => parsePhotoArgs(['--input', 'photo.jpg']), /--slug is required/);
  assert.throws(
    () => parsePhotoArgs(['--input', 'photo.jpg', '--slug', 'molly-o-s-san-carlos', '--quality', String(PHOTO_DEFAULTS.minQuality - 1)]),
    /--quality must be an integer/
  );
  assert.throws(
    () => parsePhotoArgs(['--input', 'photo.jpg', '--slug', 'molly-o-s-san-carlos', '--max-width', '200']),
    /--max-width must be an integer/
  );
});

test('photo processor derives the canonical asset path and public URL from the slug', () => {
  const root = path.join('tmp', 'repo');
  assert.equal(
    venuePhotoOutputPath('molly-o-s-san-carlos', root),
    path.join(root, 'assets', 'venues', 'molly-o-s-san-carlos.webp')
  );
  assert.equal(
    venuePhotoPublicUrl('molly-o-s-san-carlos'),
    'https://calgoldenbars.com/assets/venues/molly-o-s-san-carlos.webp'
  );
});
