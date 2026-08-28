import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  directVenueRoute,
  shouldBridgeMobileDirectVenueProfile
} from '../js/mobile-direct-venue-profile.mjs';

const snapshot = {
  venues: [
    { venue_id: 'venue-1', slug: 'kingfish-pub' },
    { venue_id: 'venue-2', slug: 'busbys-west' }
  ]
};

test('direct venue route resolves the canonical venue from the query string', () => {
  assert.equal(directVenueRoute(snapshot, '?venue=kingfish-pub&game=ucla')?.venue_id, 'venue-1');
  assert.equal(directVenueRoute(snapshot, '?game=ucla'), null);
  assert.equal(directVenueRoute(snapshot, '?venue=missing'), null);
});

test('mobile direct venue detail presentation bridges into the map only from detail view', () => {
  assert.equal(shouldBridgeMobileDirectVenueProfile({
    mobile: true,
    detailMode: true,
    selectedVenueId: 'venue-1',
    routeVenueId: 'venue-1',
    bodyView: 'detail'
  }), true);

  assert.equal(shouldBridgeMobileDirectVenueProfile({
    mobile: true,
    detailMode: true,
    selectedVenueId: 'venue-1',
    routeVenueId: 'venue-1',
    bodyView: 'map'
  }), false);

  assert.equal(shouldBridgeMobileDirectVenueProfile({
    mobile: false,
    detailMode: true,
    selectedVenueId: 'venue-1',
    routeVenueId: 'venue-1',
    bodyView: 'detail'
  }), false);

  assert.equal(shouldBridgeMobileDirectVenueProfile({
    mobile: true,
    detailMode: true,
    selectedVenueId: 'venue-2',
    routeVenueId: 'venue-1',
    bodyView: 'detail'
  }), false);
});

test('the direct-route bridge is loaded by the existing refinement entry point', async () => {
  const source = await readFile(new URL('../js/icon-upgrade.mjs', import.meta.url), 'utf8');
  assert.match(source, /import '\.\/mobile-direct-venue-profile\.mjs';/);
});
