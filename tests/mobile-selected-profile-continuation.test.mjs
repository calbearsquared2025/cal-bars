import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { shouldRenderContinuousProfile } from '../js/mobile-selected-profile-continuation.mjs';

const continuationSource = readFileSync(new URL('../js/mobile-selected-profile-continuation.mjs', import.meta.url), 'utf8');
const fanExperiencesSource = readFileSync(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8');

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

test('mobile selected profile puts Watch Party before What to Know and attendance', () => {
  assert.match(
    fanExperiencesSource,
    /querySelectorAll\(':scope > \.party-module, :scope > \.selected-card__plan-party'\)/,
    'What to Know should anchor after the selected-game event block.'
  );
  assert.match(
    fanExperiencesSource,
    /const eventAnchor = eventBlocks\[eventBlocks\.length - 1\] \|\| header;[\s\S]*?eventAnchor\.after\(section\);/,
    'What to Know should follow the Watch Party or no-Watch-Party block.'
  );
  assert.match(
    fanExperiencesSource,
    /\.selected-card__what-to-know \{[\s\S]*?grid-row: auto !important;/,
    'What to Know should use flow order after the Watch Party.'
  );
  assert.match(
    fanExperiencesSource,
    /> \.bear-count \{[\s\S]*?grid-row: auto !important;/,
    'Attendance should share the auto-placed row with What to Know.'
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
