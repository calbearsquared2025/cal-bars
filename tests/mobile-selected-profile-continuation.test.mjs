import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { shouldRenderContinuousProfile } from '../js/mobile-selected-profile-continuation.mjs';

const continuationSource = readFileSync(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8');

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

test('mobile supporting photos open an accessible uncropped viewer', () => {
  assert.match(continuationSource, /const PHOTO_VIEWER_SELECTOR = 'dialog\[data-mobile-photo-viewer\]'/);
  assert.match(continuationSource, /detail-photo--supporting \.detail-photo__frame\[data-mobile-photo-expandable="true"\]/);
  assert.match(continuationSource, /frame\.setAttribute\('role', 'button'\)/);
  assert.match(continuationSource, /frame\.setAttribute\('tabindex', '0'\)/);
  assert.match(continuationSource, /frame\.setAttribute\('aria-haspopup', 'dialog'\)/);
  assert.match(continuationSource, /frame\.setAttribute\('aria-label', 'Expand venue photo'\)/);
  assert.match(continuationSource, /enableMobilePhotoViewer\([\s\S]*?detail-photo--supporting/);
  assert.match(continuationSource, /dialog\.className = 'detail-photo-viewer'/);
  assert.match(continuationSource, /typeof dialog\.showModal === 'function'/);
  assert.match(continuationSource, /event\.target !== dialog/);
  assert.match(continuationSource, /captionText \? ' · Photo: ' : 'Photo: '/);
  assert.match(continuationSource, /creditIdentity\.cloneNode\(true\)/);
  assert.match(continuationSource, /\.detail-photo-viewer\s*\{[\s\S]*?width: min\(94vw, 720px\)/);
  assert.match(continuationSource, /\.detail-photo-viewer__image\s*\{[\s\S]*?max-height: 74dvh;[\s\S]*?object-fit: contain;/);
  assert.match(continuationSource, /if \(windowObject\?\.matchMedia\?\.\(MOBILE_QUERY\)\?\.matches !== true\) return false;/);
  assert.match(continuationSource, /if \(changedVenue\) closeMobilePhotoViewer\(documentObject\)/);
  assert.match(continuationSource, /function clearContinuation\(documentObject\) \{[\s\S]*?closeMobilePhotoViewer\(documentObject\)/);
});
