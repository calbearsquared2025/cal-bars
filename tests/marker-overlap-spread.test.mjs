import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { markerSpreadOffsets } from '../js/marker-overlap-spread.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('separate pins keep their exact marker positions', () => {
  const offsets = markerSpreadOffsets([
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 40, y: 0 }
  ]);

  assert.deepEqual(offsets.get('a'), [0, 0]);
  assert.deepEqual(offsets.get('b'), [0, 0]);
});

test('nearby pins get only a small outward spread', () => {
  const offsets = markerSpreadOffsets([
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 12, y: 0 }
  ]);

  assert.deepEqual(offsets.get('a'), [-9, 0]);
  assert.deepEqual(offsets.get('b'), [9, 0]);
});

test('pins at the same projected point separate deterministically without clustering', () => {
  const offsets = markerSpreadOffsets([
    { id: 'b', x: 10, y: 10 },
    { id: 'a', x: 10, y: 10 }
  ]);

  assert.deepEqual(offsets.get('a'), [9, 0]);
  assert.deepEqual(offsets.get('b'), [-9, 0]);
});

test('marker spreading is loaded with the existing map profile refinements', async () => {
  const firstPass = await read('js/map-profile-first-pass.mjs');
  const spread = await read('js/marker-overlap-spread.mjs');

  assert.match(firstPass, /import '\.\/marker-overlap-spread\.mjs';/);
  assert.match(spread, /marker\?\.setOffset\?\.\(offset\)/);
  assert.match(spread, /trackedMap\?\.on\?\.\('zoomend', scheduleSpread\)/);
});
