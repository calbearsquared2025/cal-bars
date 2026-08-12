import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeHttpUrl,
  venuePhotoAltText,
  venuePhotoPresentation
} from '../js/venue-profile-enhancement.mjs';

test('Venue photo presentation accepts safe http(s) asset and optional metadata', () => {
  const model = venuePhotoPresentation({
    name: 'Molly O’s',
    photo_url: 'https://calgoldenbars.com/assets/venues/molly-os.webp',
    photo_caption: 'Cal fans at Molly O’s for the 2025 Louisville game.',
    photo_credit: '@oskistraw',
    photo_credit_url: 'https://x.com/oskistraw'
  });
  assert.equal(model.photoUrl, 'https://calgoldenbars.com/assets/venues/molly-os.webp');
  assert.equal(model.caption, 'Cal fans at Molly O’s for the 2025 Louisville game.');
  assert.equal(model.credit, '@oskistraw');
  assert.equal(model.creditUrl, 'https://x.com/oskistraw');
  assert.equal(model.alt, model.caption);
});

test('credit URL is linkable only for safe http(s) URLs', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('data:text/html,bad'), '');
  assert.equal(safeHttpUrl('https://example.com/profile'), 'https://example.com/profile');
  assert.equal(venuePhotoPresentation({
    name: 'Example',
    photo_url: 'https://example.com/photo.webp',
    photo_credit: '@credit',
    photo_credit_url: 'javascript:alert(1)'
  }).creditUrl, '');
});

test('alt text uses caption first and Venue name fallback', () => {
  assert.equal(venuePhotoAltText({ name: 'Example Pub', photo_caption: 'A Cal crowd.' }), 'A Cal crowd.');
  assert.equal(venuePhotoAltText({ name: 'Example Pub' }), 'Photo of Example Pub');
});

test('unsafe or absent photo URL does not produce an image presentation', () => {
  assert.equal(venuePhotoPresentation({ photo_url: '' }), null);
  assert.equal(venuePhotoPresentation({ photo_url: 'file:///tmp/photo.webp' }), null);
});
