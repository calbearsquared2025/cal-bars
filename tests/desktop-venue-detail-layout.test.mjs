import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('desktop Venue Detail styles load through the existing Venue profile stylesheet entry point', async () => {
  const entry = await source('css/watch-party-form.css');
  assert.match(entry, /@import url\('\.\/venue-profile\.css'\);/);
  assert.match(entry, /@import url\('\.\/venue-detail-desktop\.css'\);/);
});

test('desktop Venue Detail uses page-level Back navigation and a deliberate two-column composition', async () => {
  const css = await source('css/venue-detail-desktop.css');
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /html body\[data-view="detail"\] \.back-link \{[\s\S]*position: static !important/);
  assert.match(css, /\.back-link \{[\s\S]*margin: 0 0 14px !important/);
  assert.match(css, /\.venue-detail \{[\s\S]*grid-template-columns: minmax\(0, 1\.04fr\) minmax\(390px, \.96fr\) !important/);
  assert.match(css, /\.detail-hero,[\s\S]*display: flex !important;[\s\S]*flex-direction: column !important/);
});

test('desktop Venue identity is visually ordered before approved photo or local-map media', async () => {
  const css = await source('css/venue-detail-desktop.css');
  assert.match(css, /\.detail-hero \.venue-badges \{[\s\S]*order: 1/);
  assert.match(css, /\.detail-hero h1 \{[\s\S]*order: 2/);
  assert.match(css, /\.detail-hero \.detail-city \{[\s\S]*order: 3/);
  assert.match(css, /\.detail-hero \.detail-address \{[\s\S]*order: 4/);
  assert.match(css, /\.detail-hero \.detail-address-actions \{[\s\S]*order: 5/);
  assert.match(css, /\.detail-desktop-description \{[\s\S]*order: 6/);
  assert.match(css, /\.detail-hero \.detail-photo,[\s\S]*\.detail-hero \.detail-local-map \{[\s\S]*order: 7/);
});

test('desktop selected-game activity groups existing game, attendance, primary action, and Share before tertiary contributions', async () => {
  const [profile, css] = await Promise.all([
    source('js/venue-profile-enhancement.mjs'),
    source('css/venue-detail-desktop.css')
  ]);
  assert.match(profile, /import \{ formatKickoff, gameTitle \} from '\.\/core\.mjs'/);
  assert.match(profile, /function syncDesktopGameSummary/);
  assert.match(profile, /section\.className = 'detail-desktop-game-summary'/);
  assert.match(profile, /section\.querySelector\('h2'\)\.textContent = gameTitle\(game\)/);
  assert.match(profile, /formatKickoff\(game\)/);
  assert.match(css, /\.detail-desktop-game-summary \{[\s\S]*order: 1/);
  assert.match(css, /\.venue-detail > \.party-module \{[\s\S]*order: 2/);
  assert.match(css, /\.activity-card \{[\s\S]*order: 3/);
  assert.match(css, /\.action-row\.detail-primary-actions \{[\s\S]*order: 4/);
  assert.match(css, /\.detail-contribution \{[\s\S]*order: 5/);
  assert.match(css, /\.action-row\.detail-primary-actions[\s\S]*position: static !important/);
});

test('desktop CGB description is reused without changing canonical Venue photo or editorial data', async () => {
  const profile = await source('js/venue-profile-enhancement.mjs');
  assert.match(profile, /function syncDesktopDescription/);
  assert.match(profile, /detail-editorial > \.detail-editorial__copy/);
  assert.match(profile, /section\.className = 'detail-desktop-description'/);
  assert.match(profile, /heading\.textContent = 'CGB SAYS'/);
  assert.match(profile, /hero\.prepend\(photo\)/);
  assert.match(profile, /presentation\.photoUrl/);
  assert.match(profile, /presentation\.creditUrl/);
});

test('desktop contribution actions retain the existing two-column DOM treatment but lose mobile-card visual weight', async () => {
  const css = await source('css/venue-detail-desktop.css');
  assert.match(css, /\.detail-contribution__actions \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /\.detail-contribution__action \{[\s\S]*min-height: 32px !important/);
  assert.match(css, /\.detail-contribution__action \{[\s\S]*background: transparent !important/);
  assert.match(css, /\.detail-contribution__action \{[\s\S]*border: 0 !important/);
  assert.match(css, /\.detail-contribution__action \{[\s\S]*text-decoration: underline !important/);
});

test('desktop polish stylesheet does not redefine existing mobile layout selectors outside the desktop breakpoint', async () => {
  const css = await source('css/venue-detail-desktop.css');
  const desktopStart = css.indexOf('@media (min-width: 900px)');
  assert.ok(desktopStart > 0);
  const preDesktop = css.slice(0, desktopStart);
  assert.match(preDesktop, /\.detail-desktop-description,[\s\S]*\.detail-desktop-game-summary \{\s*display: none;\s*\}/);
  assert.doesNotMatch(preDesktop, /\.back-link|\.venue-detail|\.detail-hero|\.activity-card|\.detail-contribution__action/);
});
