import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { shouldRenderContinuousProfile } from '../js/mobile-selected-profile-continuation.mjs';

const continuationSource = readFileSync(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8');
const fanExperiencesSource = readFileSync(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8');
const selectedProfileSource = readFileSync(new URL('../js/selected-profile-renderer.mjs', import.meta.url), 'utf8');
const fanIntentCss = readFileSync(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const mapProfileFinalPassSource = readFileSync(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8');

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

test('mobile selected profile keeps primary actions immediately below Watch Party', () => {
  assert.match(
    selectedProfileSource,
    /if \(parties\.length\) \{[\s\S]*?card\.append\(createPlanWatchPartyAction\(documentObject\)\);[\s\S]*?card\.append\(createSelectedActionRow\(/,
    'The selected card should render the I’ll be here/share row immediately after the Watch Party block.'
  );
  assert.match(
    fanExperiencesSource,
    /const actionRow = card\.querySelector\(':scope > \.action-row'\);\s*const informationAnchor = actionRow \|\| eventAnchor;/,
    'What to Know should anchor after the primary action row when it exists.'
  );
  assert.match(
    fanExperiencesSource,
    /informationAnchor\.after\(section\);/,
    'What to Know should follow I’ll be here/share rather than interrupting the selected-game decision flow.'
  );
  assert.match(
    fanExperiencesSource,
    /selected-card__what-to-know \{[\s\S]*?grid-column: 1 \/ -1 !important;[\s\S]*?grid-row: auto !important;/,
    'What to Know should continue full width below the primary actions.'
  );
});

test('mobile selected profile renders attendance inside the hero only', () => {
  assert.match(
    selectedProfileSource,
    /const attendance = createAttendance\(state, game, venue, documentObject, \{ hero: mobile \}\);/,
    'The selected renderer should explicitly request the hero attendance treatment on mobile.'
  );
  assert.match(
    selectedProfileSource,
    /if \(mobile\) \{\s*heading\.append\(attendance\.count\);[\s\S]*?header\.append\(heading\);/,
    'Mobile attendance should be appended to the selected-profile heading before the hero closes.'
  );
  assert.match(
    selectedProfileSource,
    /if \(!mobile\) \{\s*card\.append\(attendance\.count\);/,
    'Only the non-mobile renderer should append attendance as a separate card block.'
  );
  assert.equal(
    selectedProfileSource.match(/card\.append\(attendance\.count\);/g)?.length,
    1,
    'Attendance should have only the guarded non-mobile separate-card append.'
  );
  assert.match(
    fanIntentCss,
    /selected-card__header \.bear-count--hero:not\(\.bear-count--empty\) \{[\s\S]*?grid-template-columns: auto auto !important;/,
    'Positive mobile attendance should use the compact numeral/label hero treatment.'
  );
});

test('zero mobile attendance uses BE THE FIRST without the legacy users icon', () => {
  assert.match(
    selectedProfileSource,
    /prompt\.textContent = hero \? 'BE THE FIRST\.' : 'Be the first\.';/,
    'The hero zero state should render the approved BE THE FIRST. copy.'
  );
  assert.match(
    selectedProfileSource,
    /if \(hero\) \{\s*count\.append\(prompt\);\s*\} else \{\s*const icon = createIcon\('users'/,
    'The users icon should remain available only for the non-hero empty state.'
  );
  assert.match(
    fanIntentCss,
    /bear-count--hero\.bear-count--empty \.bear-count__prompt \{[\s\S]*?text-transform: uppercase !important;/,
    'The zero hero state should share the bold compact attendance visual language.'
  );
});

test('mobile hero address renders locality and inline Directions on the same line', () => {
  assert.match(
    selectedProfileSource,
    /documentObject\.createTextNode\(locality\),\s*documentObject\.createTextNode\(' · '\),\s*createDirectionsLink\(directionsHref, documentObject\)/,
    'The mobile address should render City, ST · Directions inline.'
  );
  assert.doesNotMatch(
    selectedProfileSource,
    /selected-card__proximity-row|selected-card__distance/,
    'The old separate mobile proximity row should be removed.'
  );
  assert.doesNotMatch(
    mapProfileFinalPassSource,
    /selected-card__proximity-row|selected-card__distance/,
    'Obsolete proximity-row CSS should be removed with the renderer.'
  );
});

test('mobile continuation pairs CGB Says and You Say when both exist', () => {
  assert.match(
    continuationSource,
    /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) \{[\s\S]*?display: grid !important;[\s\S]*?grid-template-columns: minmax\(0, 48fr\) minmax\(0, 52fr\) !important;/,
    'The mobile continuation should use a compact two-column voice row only when both sections exist.'
  );
  assert.match(
    continuationSource,
    /> \.detail-editorial \{[\s\S]*?grid-column: 1 !important;[\s\S]*?grid-row: 2 !important;/,
    'CGB Says should occupy the left side of the paired mobile row.'
  );
  assert.match(
    continuationSource,
    /> \.detail-fan-experiences \{[\s\S]*?grid-column: 2 !important;[\s\S]*?grid-row: 2 !important;/,
    'You Say should occupy the right side of the paired mobile row.'
  );
  assert.match(
    continuationSource,
    /> \.detail-photo,[\s\S]*?> \.detail-contribution \{[\s\S]*?grid-column: 1 \/ -1 !important;/,
    'Supporting media and contributions should remain full width below the paired voices.'
  );
});
