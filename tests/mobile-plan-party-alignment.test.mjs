import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const finalPass = await readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8');
const firstPass = await readFile(new URL('../js/map-profile-first-pass.mjs', import.meta.url), 'utf8');
const enhancement = await readFile(new URL('../js/venue-profile-enhancement.mjs', import.meta.url), 'utf8');

test('mobile no-Watch-Party prompt uses the final profile rule for left alignment and inset', () => {
  assert.match(finalPass, /\.selected-card__plan-party\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?justify-items:\s*start\s*!important;[\s\S]*?padding:\s*9px 12px\s*!important;[\s\S]*?text-align:\s*left\s*!important;/);
  assert.doesNotMatch(firstPass, /\.selected-card__plan-party\s*\{/);
  assert.doesNotMatch(enhancement, /cgb-mobile-plan-party-alignment|installMobilePlanPartyAlignmentStyles/);
});
