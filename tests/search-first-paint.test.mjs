import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [firstPaintCss, searchRefinement, mapProfileFirstPass, mobileTabLocationRefinement] = await Promise.all([
  readFile(new URL('../css/mobile-first-paint.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../js/map-profile-first-pass.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../js/mobile-tab-location-refinement.mjs', import.meta.url), 'utf8')
]);

test('mobile Search result styling is available before JavaScript refinements run', () => {
  assert.match(
    firstPaintCss,
    /body\[data-command-surface="search"\] \.command-surface \.search-suggestions button,[\s\S]*color:\s*var\(--cgb-ink-900, #101626\)/
  );
  assert.match(
    firstPaintCss,
    /body\[data-command-surface="search"\] \.command-surface \.search-suggestions button strong,[\s\S]*color:\s*var\(--cgb-navy-950, #010133\)/
  );
  assert.match(
    firstPaintCss,
    /body\[data-command-surface="search"\] #map-view > #venue-tray\.venue-tray\s*\{[\s\S]*display:\s*none !important/
  );
});

test('Search styling is no longer injected by deferred refinement modules', () => {
  assert.doesNotMatch(searchRefinement, /createElement\(['"]style['"]\)/);
  assert.doesNotMatch(searchRefinement, /style\.textContent/);

  for (const runtimeModule of [mapProfileFirstPass, mobileTabLocationRefinement]) {
    assert.doesNotMatch(runtimeModule, /body\[data-command-surface="search"\]/);
  }
});
