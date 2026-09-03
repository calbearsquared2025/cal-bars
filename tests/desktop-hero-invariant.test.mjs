import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/desktop-photo-forward-profile.mjs', import.meta.url), 'utf8');

test('desktop selected profiles always use the universal hero treatment', () => {
  assert.match(
    source,
    /#venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero \{/,
    'Desktop hero styling should target every direct detail hero.'
  );
  assert.doesNotMatch(
    source,
    /\.detail-hero\.detail-hero--identity/,
    'Desktop hero styling must not depend on an extra identity-state class.'
  );
});
