import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mobilePolish = await readFile(new URL('../js/mobile-polish.mjs', import.meta.url), 'utf8');
const firstPass = await readFile(new URL('../js/map-profile-first-pass.mjs', import.meta.url), 'utf8');
const fanExperiences = await readFile(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8');
const mobileCss = await readFile(new URL('../css/mobile-polish.css', import.meta.url), 'utf8');

test('mobile opening stats and legend follow the existing tray data-state', () => {
  assert.match(mobilePolish, /function shouldHideOpeningStat\([\s\S]*?mobile && trayState !== 'peek'/);
  assert.match(mobilePolish, /const trayState = document\.querySelector\('#venue-tray'\)\?\.dataset\.state \|\| 'peek';/);
  assert.match(mobilePolish, /panel\.hidden = shouldHideOpeningStat\(\{ mobile: isMobile\(\), trayState \}\);/);
  assert.match(mobilePolish, /function sync\(\) \{[\s\S]*?syncOpeningStatVisibility\(\);/);
});

test('mobile list navigation reuses the app tray transition instead of writing duplicate state', () => {
  assert.match(firstPass, /window\.CGBApp\?\.showLocations\?\.\(\);/);
  assert.doesNotMatch(firstPass, /state\.trayState\s*=|tray\.dataset\.state\s*=|function setTrayState\(/);
});

test('WHAT TO KNOW keeps Add info adjacent to the section title', () => {
  assert.match(fanExperiences, /\.selected-card__what-to-know-header\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?gap:\s*8px;/);
});

test('selected mobile tray has a modestly stronger upper shadow without changing desktop rules', () => {
  assert.match(mobileCss, /@media \(max-width: 899px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?box-shadow:\s*0 -18px 42px rgba\(1,1,51,\.26\);/);
  assert.match(mobileCss, /@media \(min-width: 900px\)/);
});
