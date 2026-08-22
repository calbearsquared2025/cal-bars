import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVenueSeasonCount,
  lastSeasonActivityCopy,
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

test('last-season baseline copy is evergreen', () => {
  assert.equal(lastSeasonActivityCopy(), 'Bears watched Cal games here last season.');
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

test('current-game Fan Intent suppresses the last-season baseline before archived season history exists', () => {
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

test('zero current and archived Fan Intent shows the evergreen last-season baseline', () => {
  assert.deepEqual(venueActivityPresentation({
    snapshot: snapshot(),
    game: upcomingGame,
    venue,
    currentCopy: 'No Bears are watching here yet. Be the first.'
  }), {
    primary: 'No Bears are watching here yet. Be the first.',
    secondary: [
      'Bears watched Cal games here last season.',
      'Be part of the 2026 season.'
    ]
  });
});

test('venue description text does not determine whether the baseline appears', () => {
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
    secondary: [
      'Bears watched Cal games here last season.',
      'Be part of the 2026 season.'
    ]
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

test('completed-game views use season history instead of an incorrect live zero count', () => {
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
