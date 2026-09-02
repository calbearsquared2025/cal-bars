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

test('mobile split-photo layout has one grid owner and no specificity fight', async () => {
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

  assert.match(continuationSource, /photo\.classList\.add\('detail-photo--mobile-opening'\)/);
  assert.match(continuationSource, /header\.after\(photo\)/);
  assert.match(continuationSource, /card\.dataset\.mobilePhotoForward = 'true'/);
  assert.doesNotMatch(continuationSource, /\.selected-card\[data-mobile-photo-forward="true"\]/);
  assert.match(continuationSource, /detail-hero--mobile-opening-empty/);
  assert.match(continuationSource, /if \(!venue\.photo_url\) \{[\s\S]*?createLocalMapElement/);

  assert.doesNotMatch(firstPass, /\.selected-card\s*\{/);
  assert.doesNotMatch(firstPass, /\.selected-card\s*>\s*\*/);

  assert.match(finalPass, /\.selected-card:not\(\[data-mobile-photo-forward="true"\]\) > \.bear-count/);
  assert.match(finalPass, /--cgb-selected-card-aside-width:\s*minmax\(124px, 40%\)/);

  const photoBlock = finalPass.match(/\.selected-card\[data-mobile-photo-forward="true"\] > \.detail-photo--mobile-opening\s*\{([\s\S]*?)\}/)?.[1] || '';
  const attendanceBlock = finalPass.match(/\.selected-card\[data-mobile-photo-forward="true"\] > \.bear-count\s*\{([\s\S]*?)\}/)?.[1] || '';
  const whatToKnowBlock = finalPass.match(/\.selected-card\[data-mobile-photo-forward="true"\] > \.selected-card__what-to-know\s*\{([\s\S]*?)\}/)?.[1] || '';

  assert.match(photoBlock, /grid-column:\s*2;/);
  assert.match(photoBlock, /grid-row:\s*1;/);
  assert.match(attendanceBlock, /grid-column:\s*2;/);
  assert.match(attendanceBlock, /grid-row:\s*2;/);
  assert.match(whatToKnowBlock, /grid-column:\s*1;/);
  assert.match(whatToKnowBlock, /grid-row:\s*2;/);
  assert.doesNotMatch(photoBlock, /!important/);
  assert.doesNotMatch(attendanceBlock, /!important/);
  assert.doesNotMatch(whatToKnowBlock, /!important/);

  assert.doesNotMatch(enhancementSource, /figure\.style\.width/);
  assert.doesNotMatch(enhancementSource, /figure\.style\.margin/);
});

test('mobile approved photos use the shared 3:2 cover crop without a local override', async () => {
  const [enhancementSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(enhancementSource, /const VENUE_PHOTO_ASPECT_RATIO = '3 \/ 2'/);
  assert.match(enhancementSource, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.doesNotMatch(continuationSource, /aspect-ratio:\s*4 \/ 3/);
  assert.doesNotMatch(continuationSource, /object-fit:\s*contain/);
});

test('mobile no-photo profile keeps the photo contribution in the normal maintenance flow', async () => {
  const [photoFormSource, balanceSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/photo-form.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/desktop-profile-final-balance.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(continuationSource, /renderPhotoFormEntry\(\{ app: continuationApp, documentObject \}\)/);
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
  assert.match(photoFormSource, /label: 'Add a new photo'/);
  assert.equal((photoFormSource.match(/entryPoint: 'contribution'/g) || []).length, 1);
  assert.match(balanceSource, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.doesNotMatch(balanceSource, /WIDE_DESKTOP_QUERY|1180px/);
  assert.match(balanceSource, /detail\?\.dataset\?\.profilePresentation === 'desktop'/);
});
