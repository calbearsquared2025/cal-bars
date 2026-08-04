import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVenueSeasonCount,
  legacyActivityCopy,
  legacyActivitySeason,
  seasonActivityCopy,
  venueActivityPresentation
} from '../js/venue-activity-core.mjs';

const venue = {
  venue_id: 'venue_test',
  short_description: 'Hosted Chicago’s 2025 Big Game watch party.'
};
const upcomingGame = { season: 2026, game_status: 'upcoming' };
const completedGame = { season: 2026, game_status: 'completed' };

function snapshot(count = 0) {
  return {
    venueSeasonCounts: count > 0
      ? [{ season: 2026, venue_id: 'venue_test', count }]
      : []
  };
}

test('season activity count is selected by season and venue', () => {
  assert.equal(getVenueSeasonCount(snapshot(12), 2026, 'venue_test'), 12);
  assert.equal(getVenueSeasonCount(snapshot(12), 2025, 'venue_test'), 0);
  assert.equal(getVenueSeasonCount(snapshot(12), 2026, 'another_venue'), 0);
});

test('season activity copy is cumulative Bear activity rather than distinct games', () => {
  assert.equal(seasonActivityCopy(1), '1 Bear watched Cal games here this season.');
  assert.equal(seasonActivityCopy(12), '12 Bears watched Cal games here this season.');
  assert.equal(seasonActivityCopy(0), '');
});

test('migrated watch-party evidence is standardized to the approved 2025 history', () => {
  assert.equal(legacyActivitySeason(venue), 2025);
  assert.equal(legacyActivityCopy(2025), 'Bears watched Cal games here in 2025.');
  assert.equal(legacyActivitySeason({ short_description: 'Previously hosted a Cal watch party.' }), 2025);
  assert.equal(legacyActivitySeason({ short_description: 'Rocky Mountain Golden Bears 2025 Big Game watch party.' }), 2025);
});

test('ordinary current venue descriptions do not become migrated history', () => {
  assert.equal(legacyActivitySeason({ short_description: 'Opened in 2025.' }), null);
  assert.equal(legacyActivitySeason({ short_description: 'Shows Cal games every week.' }), null);
  assert.equal(legacyActivitySeason({ short_description: 'A friendly neighborhood sports bar.' }), null);
});

test('upcoming games show current selection copy plus real current-season history', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(12),
    game: upcomingGame,
    venue,
    currentCopy: '3 Bears watching here'
  }), {
    primary: '3 Bears watching here',
    secondary: ['12 Bears watched Cal games here this season.']
  });
});

test('migrated history is the standardized two-line fallback until season data exists', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(0),
    game: upcomingGame,
    venue,
    currentCopy: 'No Bears are watching here yet. Be the first.'
  }), {
    primary: 'No Bears are watching here yet. Be the first.',
    secondary: [
      'Bears watched Cal games here in 2025.',
      'Be part of the 2026 season.'
    ]
  });
});

test('completed-game views use season history instead of an incorrect live zero count', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(12),
    game: completedGame,
    venue,
    currentCopy: 'No Bears are watching here yet. Be the first.'
  }), {
    primary: '12 Bears watched Cal games here this season.',
    secondary: []
  });
});
