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

test('continuous profile places photo or fallback map before the editorial sections', async () => {
  const source = await readFile(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8');
  const heroPlacement = source.indexOf('cachedVenueDetail.append(hero);');
  const editorialPlacement = source.indexOf('if (editorial) cachedVenueDetail.append(editorial);');
  assert.ok(heroPlacement >= 0);
  assert.ok(editorialPlacement > heroPlacement);
  assert.doesNotMatch(source, /if \(fanSection\) hero\.after\(fanSection\)/);
});

test('no-photo profile keeps the photo contribution in the normal maintenance flow', async () => {
  const source = await readFile(new URL('../js/photo-form.js', import.meta.url), 'utf8');
  assert.match(source, /entryPoint: 'contribution'/);
  assert.match(source, /className: 'detail-contribution__action'/);
  assert.doesNotMatch(source, /entryPoint: 'map-overlay'/);
  assert.doesNotMatch(source, /detail-local-map__photo-action/);
  assert.equal((source.match(/entryPoint: 'contribution'/g) || []).length, 1);
});
