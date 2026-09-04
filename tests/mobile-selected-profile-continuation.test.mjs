import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { shouldRenderContinuousProfile } from '../js/mobile-selected-profile-continuation.mjs';

const continuationSource = readFileSync(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8');
const fanExperiencesSource = readFileSync(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8');
const selectedProfileSource = readFileSync(new URL('../js/selected-profile-renderer.mjs', import.meta.url), 'utf8');

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
    /if \(parties\.length\) \{[\s\S]*?card\.append\(createPlanWatchPartyAction\(documentObject\)\);[\s\S]*?card\.append\(createSelectedActionRow\([\s\S]*?const attendance = createAttendance\(/,
    'The selected card should render the I’ll be here/share row after the Watch Party block and before attendance.'
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
    /#map-view > #venue-tray\.venue-tray\.tray--selected #tray-selected > \.selected-card > \.selected-card__what-to-know \{[\s\S]*?grid-row: auto !important;/,
    'What to Know should use flow order after the primary actions.'
  );
  assert.match(
    fanExperiencesSource,
    /#map-view > #venue-tray\.venue-tray\.tray--selected #tray-selected > \.selected-card > \.bear-count \{[\s\S]*?grid-row: auto !important;/,
    'Attendance should share the auto-placed information row with What to Know.'
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
