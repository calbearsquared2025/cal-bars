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

test('mobile selected profile puts compact What to know context before the Watch Party without duplicating tags under You Say', async () => {
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

test('mobile media opening has one grid owner and balances What to know against attendance', async () => {
  const [fanSource, continuationSource, finalPass, firstPass, enhancementSource] = await Promise.all([
    readFile(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/map-profile-first-pass.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(fanSource, /communitySection\.after\(photo\)/);
  assert.doesNotMatch(fanSource, /detail-photo--mobile-deferred/);
  assert.doesNotMatch(fanSource, /detail-hero--deferred-photo-empty/);

  assert.match(continuationSource, /media\.classList\.add\(isPhoto \? 'detail-photo--mobile-opening' : 'detail-local-map--mobile-opening'\)/);
  assert.match(continuationSource, /header\.after\(media\)/);
  assert.match(continuationSource, /card\.dataset\.mobileMediaForward = 'true'/);
  assert.match(continuationSource, /card\.dataset\.mobileMediaType = isPhoto \? 'photo' : 'map'/);
  assert.doesNotMatch(continuationSource, /\.selected-card\[data-mobile-media-forward="true"\]/);
  assert.match(continuationSource, /detail-hero--mobile-opening-empty/);
  assert.match(continuationSource, /if \(!venue\.photo_url\) \{[\s\S]*?createLocalMapElement/);

  assert.doesNotMatch(firstPass, /\.selected-card\s*\{/);
  assert.doesNotMatch(firstPass, /\.selected-card\s*>\s*\*/);

  assert.match(finalPass, /\.selected-card:not\(\[data-mobile-media-forward="true"\]\) > \.bear-count/);
  assert.match(finalPass, /--cgb-selected-card-aside-width:\s*minmax\(124px, 40%\)/);
  assert.match(finalPass, /--cgb-selected-card-row-gap:\s*8px;/);

  const headerBlock = finalPass.match(/\.selected-card\[data-mobile-media-forward="true"\] > \.selected-card__header\s*\{([\s\S]*?)\}/)?.[1] || '';
  const mediaBlock = finalPass.match(/\.selected-card\[data-mobile-media-forward="true"\] > \.detail-photo--mobile-opening,[\s\S]*?> \.detail-local-map--mobile-opening\s*\{([\s\S]*?)\}/)?.[1] || '';
  const attendanceBlock = finalPass.match(/\.selected-card\[data-mobile-media-forward="true"\] > \.bear-count\s*\{([\s\S]*?)\}/)?.[1] || '';
  const whatToKnowBlock = finalPass.match(/\.selected-card\[data-mobile-media-forward="true"\] > \.selected-card__what-to-know\s*\{([\s\S]*?)\}/)?.[1] || '';

  assert.match(headerBlock, /grid-column:\s*1;/);
  assert.match(headerBlock, /grid-row:\s*1;/);
  assert.doesNotMatch(headerBlock, /span 2/);
  assert.match(mediaBlock, /grid-column:\s*2;/);
  assert.match(mediaBlock, /grid-row:\s*1;/);
  assert.match(attendanceBlock, /grid-column:\s*2;/);
  assert.match(attendanceBlock, /grid-row:\s*2;/);
  assert.match(attendanceBlock, /align-self:\s*center;/);
  assert.match(whatToKnowBlock, /grid-column:\s*1;/);
  assert.match(whatToKnowBlock, /grid-row:\s*2;/);
  assert.doesNotMatch(mediaBlock, /!important/);
  assert.doesNotMatch(attendanceBlock, /!important/);
  assert.doesNotMatch(whatToKnowBlock, /!important/);

  assert.match(finalPass, /> \.bear-count:not\(\.bear-count--empty\)\s*\{[\s\S]*?min-height:\s*64px;[\s\S]*?padding:\s*0;/);
  assert.doesNotMatch(enhancementSource, /figure\.style\.width/);
  assert.doesNotMatch(enhancementSource, /figure\.style\.margin/);
});

test('mobile approved photos use the shared 3:2 cover crop without a local opening override', async () => {
  const [enhancementSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(enhancementSource, /const VENUE_PHOTO_ASPECT_RATIO = '3 \/ 2'/);
  assert.match(enhancementSource, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.doesNotMatch(continuationSource, /aspect-ratio:\s*4 \/ 3/);
  const openingImageBlock = continuationSource.match(/\.detail-photo--mobile-opening \.detail-photo__image\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.doesNotMatch(openingImageBlock, /object-fit:\s*contain/);
});

test('mobile approved photos open a lightweight accessible viewer without changing desktop', async () => {
  const source = await readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8');

  assert.match(source, /const PHOTO_VIEWER_SELECTOR = 'dialog\[data-mobile-photo-viewer\]'/);
  assert.match(source, /frame\.dataset\.mobilePhotoExpandable = 'true'/);
  assert.match(source, /frame\.setAttribute\('role', 'button'\)/);
  assert.match(source, /frame\.setAttribute\('aria-haspopup', 'dialog'\)/);
  assert.match(source, /frame\.setAttribute\('aria-label', 'Expand venue photo'\)/);
  assert.match(source, /enableMobilePhotoViewer\(openingMedia, documentObject, windowObject\)/);
  assert.match(source, /dialog\.className = 'detail-photo-viewer'/);
  assert.match(source, /typeof dialog\.showModal === 'function'/);
  assert.match(source, /event\.target === dialog/);
  assert.match(source, /cloneNode\(true\)/);
  assert.match(source, /\.detail-photo-viewer\s*\{[\s\S]*?width:\s*min\(94vw, 720px\)/);
  assert.match(source, /\.detail-photo-viewer__image\s*\{[\s\S]*?max-height:\s*74dvh;[\s\S]*?object-fit:\s*contain;/);
  assert.match(source, /if \(windowObject\?\.matchMedia\?\.\(MOBILE_QUERY\)\?\.matches !== true\) return false;/);
});

test('mobile no-photo profile uses the opening map and promotes the existing photo form action', async () => {
  const [photoFormSource, continuationSource, finalPass] = await Promise.all([
    readFile(new URL('../js/photo-form.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(continuationSource, /renderPhotoFormEntry\(\{ app: continuationApp, documentObject \}\)/);
  assert.match(continuationSource, /movePhotoActionToOpeningMap\(cachedVenueDetail, openingMedia\)/);
  assert.match(continuationSource, /link\.dataset\.photoFormEntry = 'mobile-map-overlay'/);
  assert.match(continuationSource, /link\.textContent = 'Add a photo'/);
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
  assert.match(finalPass, /\.detail-local-map--mobile-opening[\s\S]*?aspect-ratio:\s*3 \/ 2;/);
  assert.match(finalPass, /\.detail-local-map__photo-action[\s\S]*?min-height:\s*26px;[\s\S]*?padding:\s*4px 7px;/);
});