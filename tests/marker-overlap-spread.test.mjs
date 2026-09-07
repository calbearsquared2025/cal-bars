import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  markerCollisionGroup,
  markerFanOffsets
} from '../js/marker-overlap-spread.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function finalPoint(entry, offsets) {
  const [dx, dy] = offsets.get(entry.id) || [0, 0];
  return { x: entry.x + dx, y: entry.y + dy };
}

test('separate pins stay at their exact coordinates', () => {
  const entries = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 70, y: 0 }
  ];
  const offsets = markerFanOffsets(entries, 'a');

  assert.deepEqual(markerCollisionGroup(entries, 'a'), [{ id: 'a', x: 0, y: 0, width: 48, height: 54 }]);
  assert.deepEqual(offsets.get('a'), [0, 0]);
  assert.deepEqual(offsets.get('b'), [0, 0]);
});

test('overlapping pins fan apart only after that stack is targeted', () => {
  const entries = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 40, y: 0 }
  ];
  const group = markerCollisionGroup(entries, 'a');
  const offsets = markerFanOffsets(entries, 'a');
  const first = finalPoint(entries[0], offsets);
  const second = finalPoint(entries[1], offsets);

  assert.deepEqual(group.map((entry) => entry.id).sort(), ['a', 'b']);
  assert.notDeepEqual(offsets.get('a'), [0, 0]);
  assert.notDeepEqual(offsets.get('b'), [0, 0]);
  assert.ok(Math.hypot(first.x - second.x, first.y - second.y) >= 62);
});

test('marker-footprint collision catches diagonal overlap missed by the old 28px center threshold', () => {
  const entries = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 50, y: 50 }
  ];

  assert.ok(Math.hypot(50, 50) > 28);
  assert.deepEqual(markerCollisionGroup(entries, 'a').map((entry) => entry.id).sort(), ['a', 'b']);
});

test('pins at the same projected point fan deterministically', () => {
  const offsets = markerFanOffsets([
    { id: 'b', x: 10, y: 10 },
    { id: 'a', x: 10, y: 10 }
  ], 'a');

  assert.deepEqual(offsets.get('a'), [0, -36]);
  assert.deepEqual(offsets.get('b'), [0, 36]);
});

test('tapping one stack leaves a separate overlapping stack at true coordinates', () => {
  const entries = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 20, y: 0 },
    { id: 'c', x: 200, y: 0 },
    { id: 'd', x: 220, y: 0 }
  ];
  const offsets = markerFanOffsets(entries, 'a');

  assert.notDeepEqual(offsets.get('a'), [0, 0]);
  assert.notDeepEqual(offsets.get('b'), [0, 0]);
  assert.deepEqual(offsets.get('c'), [0, 0]);
  assert.deepEqual(offsets.get('d'), [0, 0]);
});

test('overlap handling is tap-to-fan rather than automatic marker offsetting', async () => {
  const firstPass = await read('js/map-profile-first-pass.mjs');
  const spread = await read('js/marker-overlap-spread.mjs');

  assert.match(firstPass, /import '\.\/marker-overlap-spread\.mjs';/);
  assert.match(spread, /document\.addEventListener\('click', handleDocumentClick, \{ capture: true \}\)/);
  assert.match(spread, /if \(activeFanIds\.has\(venueId\)\) return;/);
  assert.match(spread, /event\.stopImmediatePropagation\?\.\(\)/);
  assert.match(spread, /trackedMap\?\.on\?\.\('movestart', collapseActiveFan\)/);
  assert.doesNotMatch(spread, /scheduleSpread|syncMarkerSpread|zoomend/);
});
