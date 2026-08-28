import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../css/design-board-4.css', import.meta.url), 'utf8');
const fanIntentCore = readFileSync(new URL('../js/fan-intent-core.mjs', import.meta.url), 'utf8');

test('desktop location list keeps Bear activity subordinate to venue/category labels', () => {
  assert.match(fanIntentCore, /return `\$\{total\} \$\{total === 1 \? 'Bear' : 'Bears'\}`/);
  assert.match(css, /\.location-card__count \{[\s\S]*font-weight: 700 !important;[\s\S]*text-transform: none;/);
});

test('desktop Watch Party and venue badges keep character with smaller chamfers', () => {
  assert.match(css, /\.location-card \.venue-badge \{[\s\S]*min-height: 19px;[\s\S]*font-size: \.54rem;[\s\S]*calc\(100% - \.2rem\)/);
  assert.match(css, /\.location-card \.badge--fan-added::before \{[\s\S]*calc\(100% - \.2rem\)/);
});

test('desktop host line and browse spacing are quieter without changing the list structure', () => {
  assert.match(css, /\.venue-tray #tray-list \.tray-list__header \{[\s\S]*padding-bottom: 0;/);
  assert.match(css, /\.location-card__party \{[\s\S]*color: var\(--cgb-ink-500[\s\S]*font-weight: 600;/);
});