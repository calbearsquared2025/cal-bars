import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  isSelectedProfileGestureTarget,
  preventSelectedProfileMagnification
} from '../js/mobile-profile-pinch-guard.mjs';

const PROFILE_SELECTOR = '#venue-tray.tray--selected .tray-selected';

test('pinch guard applies only to the selected profile surface', () => {
  const profileTarget = {
    closest(selector) {
      return selector === PROFILE_SELECTOR ? this : null;
    }
  };
  const mapTarget = { closest: () => null };

  assert.equal(isSelectedProfileGestureTarget(profileTarget), true);
  assert.equal(isSelectedProfileGestureTarget(mapTarget), false);
});

test('selected profile magnification is prevented without blocking gestures elsewhere', () => {
  let prevented = 0;
  const profileEvent = {
    target: { closest: (selector) => selector === PROFILE_SELECTOR ? {} : null },
    preventDefault: () => { prevented += 1; }
  };
  const mapEvent = {
    target: { closest: () => null },
    preventDefault: () => { prevented += 100; }
  };

  assert.equal(preventSelectedProfileMagnification(profileEvent), true);
  assert.equal(preventSelectedProfileMagnification(mapEvent), false);
  assert.equal(prevented, 1);
});

test('mobile profile pinch guard preserves vertical scroll and browser/map zoom outside the profile', async () => {
  const [guardSource, bridgeSource] = await Promise.all([
    readFile(new URL('../js/mobile-profile-pinch-guard.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../js/mobile-direct-venue-profile.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(guardSource, /touch-action: pan-y !important/);
  assert.match(guardSource, /gesturestart/);
  assert.match(guardSource, /gesturechange/);
  assert.match(guardSource, /passive: false/);
  assert.match(bridgeSource, /import '\.\/mobile-profile-pinch-guard\.mjs';/);
  assert.doesNotMatch(guardSource, /user-scalable|maximum-scale|minimum-scale/);
  assert.doesNotMatch(guardSource, /#map\b[^\n]*touch-action/);
});
