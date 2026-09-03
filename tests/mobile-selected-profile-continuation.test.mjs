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

test('mobile selected profile uses one navy identity hero with supporting media below profile content', async () => {
  const [continuationSource, finalPass, firstPass, enhancementSource, displayCss] = await Promise.all([
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/map-profile-first-pass.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../css/watch-party-display.css', import.meta.url), 'utf8')
  ]);

  assert.match(continuationSource, /photo\.classList\.add\('detail-photo--supporting'\)/);
  assert.match(continuationSource, /placeSupportingPhoto\(cachedVenueDetail\)/);
  assert.doesNotMatch(continuationSource, /placeMobileOpeningMedia/);
  assert.doesNotMatch(continuationSource, /createLocalMapElement/);
  assert.doesNotMatch(continuationSource, /syncLocalMap/);

  assert.doesNotMatch(firstPass, /\.selected-card\s*\{/);
  assert.doesNotMatch(firstPass, /\.selected-card\s*>\s*\*/);

  assert.match(finalPass, /> \.selected-card__header\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;[\s\S]*?background:\s*var\(--cgb-navy-950\)\s*!important;[\s\S]*?border-bottom:\s*3px solid var\(--cgb-gold-400\)\s*!important;/);
  assert.match(displayCss, /#tray-selected > \.selected-card > \.selected-card__header\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;[\s\S]*?background:\s*var\(--cgb-navy-950\)\s*!important;/);
  assert.match(displayCss, /#tray-selected > \.selected-card > \.selected-card__what-to-know\s*\{[\s\S]*?grid-row:\s*2\s*!important;/);
  assert.match(displayCss, /#tray-selected > \.selected-card > \.bear-count\s*\{[\s\S]*?grid-row:\s*2\s*!important;/);

  assert.doesNotMatch(enhancementSource, /figure\.style\.width/);
  assert.doesNotMatch(enhancementSource, /figure\.style\.margin/);
});

test('mobile approved photos keep the shared responsive crop when rendered as supporting media', async () => {
  const [enhancementSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(enhancementSource, /const VENUE_PHOTO_ASPECT_RATIO = 'var\(--cgb-venue-media-aspect, 3 \/ 2\)'/);
  assert.match(enhancementSource, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.match(continuationSource, /photo\.classList\.remove\('detail-photo--mobile-opening', 'detail-photo--mobile-deferred', 'detail-profile-media--desktop'\)/);
  assert.match(continuationSource, /photo\.classList\.add\('detail-photo--supporting'\)/);
  assert.doesNotMatch(continuationSource, /object-fit:\s*contain/);
});

test('mobile photo contribution remains in the profile rather than being promoted into the opening card', async () => {
  const [photoFormSource, continuationSource] = await Promise.all([
    readFile(new URL('../js/photo-form.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(continuationSource, /renderPhotoFormEntry\(\{ app: continuationApp, documentObject \}\)/);
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
  assert.doesNotMatch(continuationSource, /mobile-map-overlay/);
  assert.doesNotMatch(continuationSource, /movePhotoActionToOpeningMap/);
});

test('mobile selected profile keeps the approved Watch Party and primary-action hierarchy', async () => {
  const displayCss = await readFile(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');

  assert.match(displayCss, /#tray-selected > \.selected-card > \.party-module\s*\{[\s\S]*?background:\s*var\(--cgb-gold-300, #ffd15a\)\s*!important;[\s\S]*?border:\s*1px solid var\(--cgb-gold-500\)\s*!important;/);
  assert.match(displayCss, /> \.party-module \.party-module__title strong\s*\{[\s\S]*?font-family:\s*var\(--font-condensed[\s\S]*?font-weight:\s*900\s*!important;/);
  assert.match(displayCss, /> \.action-row > \.intent-button\s*\{[\s\S]*?background:\s*var\(--cgb-navy-950\)\s*!important;[\s\S]*?text-transform:\s*uppercase\s*!important;/);
  assert.match(displayCss, /> \.action-row > \.selected-card__share\s*\{[\s\S]*?font-weight:\s*800\s*!important;[\s\S]*?text-transform:\s*uppercase\s*!important;/);
});
