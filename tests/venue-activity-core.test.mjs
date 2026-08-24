import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVenueSeasonCount,
  seasonActivityCopy,
  venueActivityPresentation
} from '../js/venue-activity-core.mjs';

const venue = {
  venue_id: 'venue_test',
  short_description: 'A friendly neighborhood sports bar.'
};
const upcomingGame = { game_id: 'game_ucla', season: 2026, game_status: 'upcoming' };
const completedGame = { game_id: 'game_ucla', season: 2026, game_status: 'completed' };

function snapshot({ seasonCount = 0, currentCount = 0 } = {}) {
  return {
    venueSeasonCounts: seasonCount > 0
      ? [{ season: 2026, venue_id: 'venue_test', count: seasonCount }]
      : [],
    fanCounts: currentCount > 0
      ? [{ game_id: 'game_ucla', venue_id: 'venue_test', count: currentCount }]
      : []
  };
}

test('season activity count is selected by season and venue', () => {
  assert.equal(getVenueSeasonCount(snapshot({ seasonCount: 12 }), 2026, 'venue_test'), 12);
  assert.equal(getVenueSeasonCount(snapshot({ seasonCount: 12 }), 2025, 'venue_test'), 0);
  assert.equal(getVenueSeasonCount(snapshot({ seasonCount: 12 }), 2026, 'another_venue'), 0);
});

test('season activity copy is cumulative Bear activity rather than distinct games', () => {
  assert.equal(seasonActivityCopy(1), '1 Bear watched Cal games here this season.');
  assert.equal(seasonActivityCopy(12), '12 Bears watched Cal games here this season.');
  assert.equal(seasonActivityCopy(0), '');
});

test('upcoming games show current selection copy plus real current-season history', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot({ seasonCount: 12, currentCount: 3 }),
    game: upcomingGame,
    venue,
    currentCopy: '3 Bears watching here'
  }), {
    primary: '3 Bears watching here',
    secondary: ['12 Bears watched Cal games here this season.']
  });
});

test('current-game Fan Intent remains primary before archived current-season history exists', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot({ currentCount: 3 }),
    game: upcomingGame,
    venue,
    currentCopy: '3 Bears watching here'
  }), {
    primary: '3 Bears watching here',
    secondary: []
  });
});

test('upcoming games do not synthesize a prior-season fallback when current-season history is empty', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(),
    game: upcomingGame,
    venue,
    currentCopy: 'No Bears are watching here yet. Be the first.'
  }), {
    primary: 'No Bears are watching here yet. Be the first.',
    secondary: []
  });
});

test('venue description text does not create historical activity without current-season aggregates', () => {
  const historicalDescription = {
    ...venue,
    short_description: 'Hosted Chicago’s 2025 Big Game watch party.'
  };
  const ordinaryDescription = {
    ...venue,
    short_description: 'Opened in 2025.'
  };
  const expected = {
    primary: 'No Bears are watching here yet. Be the first.',
    secondary: []
  };

  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(),
    game: upcomingGame,
    venue: historicalDescription,
    currentCopy: expected.primary
  }), expected);
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(),
    game: upcomingGame,
    venue: ordinaryDescription,
    currentCopy: expected.primary
  }), expected);
});

test('completed-game views use current-season history instead of an incorrect live zero count', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot({ seasonCount: 12 }),
    game: completedGame,
    venue,
    currentCopy: 'No Bears are watching here yet. Be the first.'
  }), {
    primary: '12 Bears watched Cal games here this season.',
    secondary: []
  });
});
