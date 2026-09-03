import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { shouldRenderContinuousProfile } from '../js/mobile-selected-profile-continuation.mjs';

test('continuous profile renders only for the mobile selected map tray', () => {
  assert.equal(shouldRenderContinuousProfile({
    mobile: true,
    mapView: true,
    selectedVenueId: 'venue-1',
    trayState: 'selected',
    commandSurface: 'map'
  }), true);

  assert.equal(shouldRenderContinuousProfile({
    mobile: false,
    mapView: true,
    selectedVenueId: 'venue-1',
    trayState: 'selected',
    commandSurface: 'map'
  }), false);

  assert.equal(shouldRenderContinuousProfile({
    mobile: true,
    mapView: false,
    selectedVenueId: 'venue-1',
    trayState: 'selected',
    commandSurface: 'map'
  }), false);

  assert.equal(shouldRenderContinuousProfile({
    mobile: true,
    mapView: true,
    selectedVenueId: 'venue-1',
    trayState: 'full',
    commandSurface: 'list'
  }), false);
});

test('continuous profile requires a selected venue', () => {
  assert.equal(shouldRenderContinuousProfile({
    mobile: true,
    mapView: true,
    selectedVenueId: '',
    trayState: 'selected',
    commandSurface: 'map'
  }), false);
});

test('selected cards do not render the superseded detail gateway', async () => {
  const source = await readFile(new URL('../js/selected-profile-renderer.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /selected-card__details/);
  assert.doesNotMatch(source, /More About This Location/);
  assert.doesNotMatch(source, /detailHref/);
});

test('mobile selected profile keeps compact What to know context before Watch Party without duplicating tags under You Say', async () => {
  const source = await readFile(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8');
  assert.match(source, /title\.textContent = 'WHAT TO KNOW'/);
  assert.match(source, /link\.textContent = 'Add info →'/);
  assert.match(source, /empty\.textContent = 'Nothing shared yet\.'/);
  assert.match(source, /header\.after\(section\)/);
  assert.match(source, /venueTagsForVenue\(venue\)/);
  assert.match(source, /heading\.textContent = 'YOU SAY'/);
  assert.match(source, /if \(!mobileContinuation\) \{[\s\S]*?createVenueTagList\(documentObject, venueTags\)/);
});

test('mobile selected card uses a full-width navy identity hero with What to know and attendance below', async () => {
  const [continuationSource, finalPass, enhancementSource] = await Promise.all([
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(continuationSource, /placeMobileOpeningMedia/);
  assert.doesNotMatch(continuationSource, /createLocalMapElement/);
  assert.doesNotMatch(continuationSource, /syncLocalMap/);
  assert.doesNotMatch(finalPass, /data-mobile-media-forward/);
  assert.doesNotMatch(finalPass, /detail-local-map--mobile-opening/);
  assert.match(finalPass, /> \.selected-card__header\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;[\s\S]*?background:\s*var\(--cgb-navy-950\)\s*!important;[\s\S]*?border-bottom:\s*3px solid var\(--cgb-gold-400\)\s*!important;/);
  assert.match(finalPass, /> \.selected-card__header h2\s*\{[\s\S]*?font-family:\s*var\(--font-condensed[\s\S]*?font-weight:\s*900\s*!important;/);
  assert.match(finalPass, /> \.selected-card__what-to-know\s*\{[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
  assert.match(finalPass, /\.selected-card > \.bear-count\s*\{[\s\S]*?grid-column:\s*2\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
  assert.match(enhancementSource, /fonts\.googleapis\.com\/css2\?family=Barlow\+Condensed/);
});

test('mobile approved photos remain 3:2 cover and render as supporting content below You Say', async () => {
  const [enhancementSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(enhancementSource, /const VENUE_PHOTO_ASPECT_RATIO = '3 \/ 2'/);
  assert.match(enhancementSource, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.match(enhancementSource, /figure\.className = 'detail-photo detail-photo--supporting'/);
  assert.match(continuationSource, /function placeSupportingPhoto\(detail\)/);
  assert.match(continuationSource, /const community = detail\.querySelector\(':scope > \.detail-fan-experiences'\)/);
  assert.match(continuationSource, /cursor\?\.after\(photo\)/);
  assert.match(continuationSource, /if \(contribution && photo\.nextElementSibling !== contribution\) photo\.after\(contribution\)/);
});

test('mobile no-photo profile has no map placeholder and keeps the existing contribution photo action', async () => {
  const [photoFormSource, continuationSource, enhancementSource] = await Promise.all([
    readFile(new URL('../js/photo-form.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(continuationSource, /renderPhotoFormEntry\(\{ app: continuationApp, documentObject \}\)/);
  assert.doesNotMatch(continuationSource, /mobile-map-overlay/);
  assert.doesNotMatch(continuationSource, /Add a photo'\;[\s\S]*?openingMedia/);
  assert.doesNotMatch(enhancementSource, /createLocalMapFallback/);
  assert.doesNotMatch(enhancementSource, /ensureLocalMapFallback/);
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
});
