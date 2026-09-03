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
  assert.match(source, /buildCalBarNominationPrefillUrl/);
  assert.match(source, /CGBSnapshotRefresh\?\.refresh\?\.\(\)/);
  assert.match(source, /heading\.textContent = 'YOU SAY'/);
  assert.match(source, /if \(!mobileContinuation\) \{[\s\S]*?createVenueTagList\(documentObject, venueTags\)/);
});

test('mobile selected card uses a full-width navy identity hero without opening media', async () => {
  const [continuationSource, profileCss] = await Promise.all([
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../css/watch-party-display.css', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(continuationSource, /placeMobileOpeningMedia/);
  assert.doesNotMatch(continuationSource, /createLocalMapElement/);
  assert.doesNotMatch(continuationSource, /card\.dataset\.mobileMediaForward\s*=/);
  assert.match(profileCss, /#tray-selected > \.selected-card > \.selected-card__header\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;[\s\S]*?background:\s*var\(--cgb-navy-950\)\s*!important;[\s\S]*?border-bottom:\s*3px solid var\(--cgb-gold-400\)\s*!important;/);
  assert.match(profileCss, /#tray-selected > \.selected-card > \.selected-card__what-to-know\s*\{[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
  assert.match(profileCss, /#tray-selected > \.selected-card > \.bear-count\s*\{[\s\S]*?grid-column:\s*2\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
});

test('mobile approved photos remain 3:2 cover and are owned as root-level supporting content', async () => {
  const [enhancementSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(enhancementSource, /const VENUE_PHOTO_ASPECT_RATIO = 'var\(--cgb-venue-media-aspect, 3 \/ 2\)'/);
  assert.match(enhancementSource, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.match(enhancementSource, /function isMobileContinuation\(detail\)/);
  assert.match(enhancementSource, /function placePhotoForPresentation\(detail, hero, photo\)/);
  assert.match(enhancementSource, /if \(!isMobileContinuation\(detail\)\) \{[\s\S]*?hero\.prepend\(photo\);/);
  assert.match(enhancementSource, /photo\.classList\.add\('detail-photo--supporting'\)/);
  assert.match(enhancementSource, /if \(contribution\) detail\.insertBefore\(photo, contribution\)/);
  assert.match(enhancementSource, /if \(!isMobileContinuation\(detail\) && media\.parentElement !== hero\) hero\.prepend\(media\)/);

  assert.match(continuationSource, /const photo = detail\?\.querySelector\?\.\(':scope > \.detail-photo'\)/);
  assert.doesNotMatch(continuationSource, /:scope > \.detail-hero > \.detail-photo/);
  assert.match(continuationSource, /const community = detail\.querySelector\(':scope > \.detail-fan-experiences'\)/);
  assert.match(continuationSource, /cursor\?\.after\(photo\)/);
  assert.match(continuationSource, /if \(contribution && photo\.nextElementSibling !== contribution\) photo\.after\(contribution\)/);
});

test('mobile no-photo profile keeps the normal contribution photo action without restoring opening media', async () => {
  const [photoFormSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/photo-form.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(continuationSource, /renderPhotoFormEntry\(\{ app: continuationApp, documentObject \}\)/);
  assert.doesNotMatch(continuationSource, /mobile-map-overlay/);
  assert.doesNotMatch(continuationSource, /movePhotoActionToOpeningMap/);
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
});
