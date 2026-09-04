import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const refinementSource = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');
const cohesionSource = readFileSync(new URL('../js/desktop-visual-cohesion.mjs', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('../js/shell-controls.mjs', import.meta.url), 'utf8');
const supportDialogSource = readFileSync(new URL('../js/support-dialog.mjs', import.meta.url), 'utf8');

test('desktop reuses the shared Add command as a restrained global CGB contribution action', () => {
  assert.match(refinementSource, /function syncDesktopContributionEntry\(\)/);
  assert.match(refinementSource, /#mobile-add-button/);
  assert.match(refinementSource, /gridTemplateColumns = 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(refinementSource, /Object\.assign\(locations\.style,[\s\S]*?gridColumn: '1',[\s\S]*?width: '100%'/);
  assert.match(refinementSource, /Object\.assign\(selected\.style,[\s\S]*?gridColumn: '2',[\s\S]*?width: '100%'/);
  assert.match(refinementSource, /Object\.assign\(button\.style,[\s\S]*?gridColumn: '3',[\s\S]*?width: '100%'/);
  assert.match(refinementSource, /height: '40px'/);
  assert.match(refinementSource, /padding: '0'/);
  assert.match(refinementSource, /color: 'var\(--cgb-white/);
  assert.match(refinementSource, /background: 'transparent'/);
  assert.match(refinementSource, /border: '1px solid rgba\(255, 255, 255, \.38\)'/);
  assert.match(refinementSource, /borderRadius: 'var\(--radius-sm, 8px\)'/);
  assert.match(refinementSource, /Object\.assign\(mark\.style,[\s\S]*?color: 'var\(--cgb-gold-500/);
  assert.match(refinementSource, /whiteSpace: 'nowrap'/);
});

test('desktop Locations and Selected navigation sit on one navy identity surface', () => {
  assert.match(refinementSource, /@media \(min-width: 900px\)/);
  assert.match(refinementSource, /\.mobile-command-bar \{[\s\S]*?background: var\(--cgb-navy-950/);
  assert.match(refinementSource, /#mobile-list-button,[\s\S]*?#mobile-map-button \{[\s\S]*?background: transparent !important;[\s\S]*?color: rgba\(255, 255, 255, \.62\)/);
  assert.match(refinementSource, /#mobile-list-button\[aria-current="page"\],[\s\S]*?#mobile-map-button\[aria-current="page"\] \{[\s\S]*?color: var\(--cgb-white/);
  assert.match(refinementSource, /\[aria-current="page"\]::after[\s\S]*?background: var\(--cgb-gold-400/);
  assert.match(refinementSource, /#mobile-add-button:hover,[\s\S]*?#mobile-add-button:focus-visible \{[\s\S]*?background: transparent !important;[\s\S]*?border-color: var\(--cgb-gold-400/);
  assert.doesNotMatch(cohesionSource, /\.mobile-command-bar #mobile-add-button/);
});

test('desktop Browse header uses navy identity styling without restyling result rows', () => {
  assert.match(refinementSource, /#tray-list \.tray-list__header \{[\s\S]*?background: var\(--cgb-navy-950/);
  assert.match(refinementSource, /#tray-list \.tray-list__header \.eyebrow \{[\s\S]*?color: var\(--cgb-gold-400[\s\S]*?font-family: var\(--font-condensed/);
  assert.match(refinementSource, /#tray-list \.tray-list__header h2 \{[\s\S]*?color: var\(--cgb-white[\s\S]*?font-family: var\(--font-display/);
  assert.match(refinementSource, /#tray-list \.tray-list__intro \{[\s\S]*?color: rgba\(255, 255, 255, \.72\)/);
  assert.doesNotMatch(refinementSource, /#tray-list \.location-list[\s\S]*?background: var\(--cgb-navy-950/);
});

test('desktop CGB SAYS and YOU SAY use the condensed editorial label role', () => {
  assert.match(cohesionSource, /@media \(min-width: 900px\)/);
  assert.match(cohesionSource, /#tray-selected #venue-detail \.detail-editorial h2,[\s\S]*?#tray-selected #venue-detail \.detail-fan-experiences h2,[\s\S]*?font-family: var\(--font-condensed/);
});

test('desktop rail uses text-led Locations and Selected navigation', () => {
  assert.match(refinementSource, /#mobile-list-button > \.ui-icon/);
  assert.match(refinementSource, /#mobile-map-button > \.ui-icon/);
  assert.match(refinementSource, /display: none;/);
  assert.match(refinementSource, /\[aria-current="page"\]::after/);
  assert.match(refinementSource, /background: var\(--cgb-gold-400/);
});

test('desktop Add keeps the shared search form inside the contribution modal', () => {
  assert.match(refinementSource, /function ensureDesktopAddSearchSlot\(\)/);
  assert.match(refinementSource, /desktop-add-search-slot/);
  assert.match(refinementSource, /if \(form\.parentElement !== slot\) slot\.append\(form\)/);
  assert.match(refinementSource, /state\.searchMode = 'add-location'/);
  assert.match(refinementSource, /input\.placeholder = 'Venue or address'/);
  assert.match(refinementSource, /#add-surface #add-new-location-button/);
  assert.match(refinementSource, /#add-surface \.add-somewhere-else > \.add-actions/);
});

test('desktop contribution copy explains existing and unlisted location paths', () => {
  assert.match(refinementSource, /To add a Watch Party, contribute details, or report a problem for a location already in CGB, select it on the map or in Locations first/);
  assert.match(refinementSource, /If the place isn’t listed yet, search below to add it/);
  assert.match(refinementSource, /Choose an action for this location\. To add a different place, search below\./);
  assert.match(refinementSource, /venue \? 'Different location\?' : 'Place not listed yet\?'/);
  assert.match(refinementSource, /Search for the venue or address below\./);
  assert.match(refinementSource, /Search for a venue or address that isn’t listed in CGB yet\./);
  assert.match(shellSource, /add: 'Add to CGB'/);
  assert.match(shellSource, /add: 'Add'/);
});

test('normal desktop Search still uses the contextual helper only after typing', () => {
  assert.match(refinementSource, /const showSearchHelper = existingMode && desktopSearchEngaged && Boolean\(query\)/);
  assert.match(refinementSource, /button\.hidden = !showSearchHelper/);
  assert.match(refinementSource, /Search for another location\./);
  assert.match(refinementSource, /#search-add-location-button/);
});

test('desktop no longer contains the obsolete missing-location Form fallback controller', () => {
  assert.doesNotMatch(refinementSource, /syncDesktopMissingLocationFallback/);
  assert.doesNotMatch(refinementSource, /#add-missing-location-link/);
  assert.doesNotMatch(shellSource, /missingLocationLink/);
  assert.doesNotMatch(shellSource, /configureMissingLocationLink/);
  assert.doesNotMatch(shellSource, /buildMissingLocationFormUrl/);
  assert.doesNotMatch(supportDialogSource, /missing-location-embed\.mjs/);
});

test('desktop no longer creates a list-specific Add location control', () => {
  assert.doesNotMatch(refinementSource, /list-add-location-button/);
  assert.doesNotMatch(refinementSource, /desktopListActions/);
  assert.doesNotMatch(refinementSource, /styleDesktopListAddButton/);
});