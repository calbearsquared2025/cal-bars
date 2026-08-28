import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const refinementSource = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');
const fanIntentCore = readFileSync(new URL('../js/fan-intent-core.mjs', import.meta.url), 'utf8');

test('desktop location list folds CGB activity into the venue metadata line', () => {
  assert.match(fanIntentCore, /return `\$\{total\} \$\{total === 1 \? 'Bear' : 'Bears'\} on CGB`/);
  assert.match(refinementSource, /function syncDesktopLocationListPresentation\(\)/);
  assert.match(refinementSource, /location-card__meta-line/);
  assert.match(refinementSource, /metaLine\.append\(locationMeta, count\)/);
  assert.match(refinementSource, /location-card__count:not\(\[hidden\]\)::before/);
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

test('desktop Watch Party and Cal Bar badges use lighter fills while Fan-Added stays outlined', () => {
  assert.match(refinementSource, /\.badge--party \{[\s\S]*background: #ffd35a;/);
  assert.match(refinementSource, /\.badge--cal \{[\s\S]*background: var\(--cgb-navy-700/);
  assert.doesNotMatch(refinementSource, /\.badge--fan-added \{/);
});
