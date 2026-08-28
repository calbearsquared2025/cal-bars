import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const refinementSource = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');
const fanIntentCore = readFileSync(new URL('../js/fan-intent-core.mjs', import.meta.url), 'utf8');
const watchPartyDisplayCss = readFileSync(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');

test('desktop location list folds CGB activity into the venue metadata line', () => {
  assert.match(fanIntentCore, /return `\$\{total\} \$\{total === 1 \? 'Bear' : 'Bears'\} on CGB`/);
  assert.match(refinementSource, /function syncDesktopLocationListPresentation\(\)/);
  assert.match(refinementSource, /location-card__meta-line/);
  assert.match(refinementSource, /metaLine\.append\(locationMeta, count\)/);
  assert.match(refinementSource, /compactListFanCountCopy\(fanCount\)/);
  assert.match(refinementSource, /count\.hidden = fanCount <= 0/);
});

test('desktop activity and Watch Party host copy share the UI typography hierarchy', () => {
  assert.match(refinementSource, /location-card__meta-line[\s\S]*font-family: var\(--font-ui\);[\s\S]*font-weight: 500;/);
  assert.match(refinementSource, /location-card__count[\s\S]*font-family: var\(--font-ui\) !important;[\s\S]*font-weight: 650 !important;/);
  assert.match(refinementSource, /location-card__party[\s\S]*font-family: var\(--font-ui\);[\s\S]*font-weight: 500;/);
  assert.match(refinementSource, /location-card__party-host[\s\S]*font-family: var\(--font-ui\) !important;[\s\S]*font-size: inherit !important;[\s\S]*font-weight: 700;/);
});

test('desktop Watch Party host line names the event context and emphasizes the organizer', () => {
  assert.match(refinementSource, /Watch Party hosted by /);
  assert.match(refinementSource, /location-card__party-host/);
  assert.match(refinementSource, /color: var\(--cgb-gold-600/);
});

test('desktop restores breathing room below the location-range control without restyling the toggle', () => {
  assert.match(refinementSource, /#tray-list \.tray-list__header \{[\s\S]*padding-bottom: 14px !important;/);
  assert.doesNotMatch(refinementSource, /list-location-toggle__option[^}]*border-radius/);
});

test('desktop Watch Party and Cal Bar badges stay distinct while final event styling is warmer', () => {
  assert.match(watchPartyDisplayCss, /#tray-list \.location-card \.badge--party,[\s\S]*background: #f3c24f !important;/);
  assert.match(refinementSource, /\.badge--cal \{[\s\S]*background: var\(--cgb-navy-700/);
  assert.doesNotMatch(refinementSource, /\.badge--fan-added \{/);
});

test('desktop selected surfaces reuse the compact Locations badge treatment', () => {
  assert.match(watchPartyDisplayCss, /#venue-tray \.selected-card \.venue-badge,[\s\S]*min-height: 19px !important;[\s\S]*padding: 2px 7px !important;[\s\S]*font-size: \.54rem !important;/);
  assert.match(watchPartyDisplayCss, /#tray-selected > #venue-detail\.venue-detail \.venue-badge/);
  assert.match(watchPartyDisplayCss, /body\[data-view="detail"\] #venue-detail\.venue-detail \.venue-badge/);
  assert.match(watchPartyDisplayCss, /#venue-tray \.selected-card \.badge--cal,[\s\S]*background: var\(--cgb-navy-700/);
});

test('desktop Watch Party host line has deliberate separation from venue metadata', () => {
  assert.match(watchPartyDisplayCss, /#tray-list \.location-card__party \{[\s\S]*margin-top: 3px !important;/);
});
