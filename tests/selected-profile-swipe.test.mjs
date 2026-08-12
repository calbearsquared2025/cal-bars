import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobileRefinement = await readFile(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');
const firstPaintCss = await readFile(new URL('../css/mobile-first-paint.css', import.meta.url), 'utf8');

test('mobile selected-profile upward handle swipe opens Venue Detail', () => {
  assert.match(mobileRefinement, /buildVenueUrl/);
  assert.match(mobileRefinement, /const SELECTED_DETAIL_SWIPE_THRESHOLD = 48/);
  assert.match(mobileRefinement, /function trackSelectedHandleSwipe\(event\)[\s\S]*tray\?\.dataset\.state !== 'selected'[\s\S]*venueId: state\.selectedVenueId/);
  assert.match(mobileRefinement, /function handleSelectedHandleSwipe\(event\)[\s\S]*delta >= -SELECTED_DETAIL_SWIPE_THRESHOLD[\s\S]*tray\?\.dataset\.state !== 'selected'[\s\S]*openSelectedVenueDetail\(gesture\.venueId\)/);
  assert.match(mobileRefinement, /window\.location\.assign\(buildVenueUrl\(venue\.slug, state\.gameId, window\.location\.href\)\)/);
  assert.match(mobileRefinement, /document\.addEventListener\('pointerup', handleSelectedHandleSwipe, \{ capture: true \}\)/);
});

test('selected-profile tap-to-collapse remains separate from swipe-to-detail', () => {
  assert.match(mobileRefinement, /function handleTrayTopTap\(event\)[\s\S]*selected-card__header > \.icon-button'\)\?\.click\(\)/);
  assert.match(mobileRefinement, /if \(suppressSelectedHandleClick\)[\s\S]*return;/);
  assert.doesNotMatch(mobileRefinement, /setTrayState\('full'\)/);
});

test('mobile map shell is viewport-locked while Detail remains outside the lock', () => {
  assert.match(firstPaintCss, /body\[data-view="map"\][\s\S]*position: fixed[\s\S]*height: 100dvh[\s\S]*overflow: hidden[\s\S]*overscroll-behavior: none/);
  assert.match(firstPaintCss, /@supports not \(height: 100dvh\)[\s\S]*body\[data-view="map"\][\s\S]*height: 100vh/);
  assert.doesNotMatch(firstPaintCss, /body\[data-view="detail"\][\s\S]*position: fixed/);
});
