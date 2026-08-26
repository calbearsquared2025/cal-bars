import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const [stabilization, icons, iconUpgrade, sprite, selectedRenderer] = await Promise.all([
  readFile(new URL('js/final-functional-stabilization.mjs', root), 'utf8'),
  readFile(new URL('js/icons.mjs', root), 'utf8'),
  readFile(new URL('js/icon-upgrade.mjs', root), 'utf8'),
  readFile(new URL('assets/icons.svg', root), 'utf8'),
  readFile(new URL('js/selected-profile-renderer.mjs', root), 'utf8')
]);

test('Nearby and All locations preserve the List surface after application rerenders', () => {
  assert.match(stabilization, /#mobile-list-button, #list-location-toggle/);
  assert.doesNotMatch(stabilization, /#clear-search-button/);
  assert.match(stabilization, /listSurfaceLocked = true/);
  assert.match(stabilization, /state\.trayState = next/);
  assert.match(stabilization, /setTrayState\('full'\)/);
  assert.match(stabilization, /setCommandActive\('list'\)/);
  assert.match(stabilization, /function connectApp\(\)/);
  assert.match(stabilization, /window\.setTimeout\(connectApp, 25\)/);
  assert.match(stabilization, /app\.subscribe\('rendered', schedulePostRender\)/);
  assert.match(stabilization, /if \(listSurfaceLocked\) restoreListSurface\(\)/);
  assert.doesNotMatch(stabilization, /app\.render\s*=/);
});

test('Add preserves an existing Venue context without injecting another new-location action', () => {
  assert.match(stabilization, /let addContextVenueId = ''/);
  assert.match(stabilization, /captureAddContext/);
  assert.match(stabilization, /state\.selectedVenueId = addContextVenueId/);
  assert.doesNotMatch(stabilization, /\.selected-card__plan-party/);
  assert.doesNotMatch(stabilization, /ensureAddLocationOption/);
  assert.doesNotMatch(stabilization, /id = 'add-location-button'/);
  assert.doesNotMatch(stabilization, /Add a new location/);
  assert.doesNotMatch(stabilization, /fetch\(|XMLHttpRequest|joinExternalVenue/);
});

test('Share and all rendered interface icons use inline SVG geometry', () => {
  assert.match(icons, /share:[\s\S]*M12 16V3[\s\S]*m7 8 5-5 5 5/);
  assert.doesNotMatch(icons, /assets\/icons\.svg/);
  assert.match(icons, /inlineSpriteIcons/);
  assert.match(iconUpgrade, /inlineSpriteIcons\(root\)/);
  assert.match(iconUpgrade, /function connectApp\(\)/);
  assert.match(iconUpgrade, /CGBApp\?\.subscribe/);
  assert.match(iconUpgrade, /import '\.\/final-functional-stabilization\.mjs'/);
  assert.match(sprite, /id="icon-share"[\s\S]*M12 16V3/);
  assert.doesNotMatch(sprite.match(/<symbol id="icon-share"[\s\S]*?<\/symbol>/)?.[0] || '', /<circle/);
});

test('Directions has no rendered separator and iOS safe areas receive explicit surface colors', () => {
  assert.match(stabilization, /selected-card__directions-inline::before[\s\S]*content: none !important/);
  assert.doesNotMatch(selectedRenderer, /selected-card__location-separator/);
  assert.doesNotMatch(selectedRenderer, /separator\.textContent = '·'/);
  assert.doesNotMatch(stabilization, /fixDirectionsSeparator|link\.before\(separator\)/);
  assert.match(stabilization, /safe-area-inset-top/);
  assert.match(stabilization, /safe-area-inset-bottom/);
  assert.match(stabilization, /cgb-safe-area-fill--top/);
  assert.match(stabilization, /cgb-safe-area-fill--bottom/);
});
