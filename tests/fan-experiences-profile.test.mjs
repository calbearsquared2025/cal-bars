import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  fanExperiencesForVenue,
  visibleFanExperiences
} from '../js/fan-experiences.mjs';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

const venueId = 'venue_5977e35a58d8b18f22a51f1e';

test('missing fanExperiences is treated as an empty collection', () => {
  assert.deepEqual(fanExperiencesForVenue({}, venueId), []);
  assert.deepEqual(fanExperiencesForVenue({ fanExperiences: null }, venueId), []);
});

test('Venue Profile selects experiences for the canonical Venue and defaults to two newest items', () => {
  const experiences = fanExperiencesForVenue({ fanExperiences: [
    { venue_id: venueId, text: 'Newest', display_name: 'Matthew', year: 2026 },
    { venue_id: venueId, text: 'Second', display_name: '', year: 2026 },
    { venue_id: venueId, text: 'Third', display_name: 'Oski', year: 2025 },
    { venue_id: 'venue_aaaaaaaaaaaaaaaaaaaaaaaa', text: 'Other venue', year: 2026 }
  ] }, venueId);
  assert.deepEqual(experiences.map((item) => item.text), ['Newest', 'Second', 'Third']);
  assert.deepEqual(experiences.map((item) => item.display_name), ['Matthew', '', 'Oski']);
  assert.deepEqual(experiences.map((item) => item.year), [2026, 2026, 2025]);
  assert.deepEqual(visibleFanExperiences(experiences).map((item) => item.text), ['Newest', 'Second']);
  assert.deepEqual(visibleFanExperiences(experiences, true).map((item) => item.text), ['Newest', 'Second', 'Third']);
});

test('BEARS SAY source covers zero, one, and expandable multi-experience states', async () => {
  const sourceText = await source('js/fan-experiences.mjs');
  assert.match(sourceText, /BEARS SAY/);
  assert.match(sourceText, /Watched a Cal game here\?/);
  assert.match(sourceText, /Tell other Bears what to expect\./);
  assert.match(sourceText, /Share your experience/);
  assert.match(sourceText, /experiences\.length > 2/);
  assert.match(sourceText, /See all experiences/);
  assert.match(sourceText, /Show fewer/);
  assert.match(sourceText, /visibleFanExperiences\(experiences, expanded\)/);
  assert.match(sourceText, /mark\.className = 'detail-fan-experiences__mark'/);
  assert.match(sourceText, /name\.textContent = item\.display_name \|\| 'Anonymous'/);
  assert.match(sourceText, /createTextNode\(' · '\)/);
  assert.match(sourceText, /year\.className = 'detail-fan-experiences__year'/);
  assert.match(sourceText, /year\.textContent = String\(item\.year\)/);
  assert.match(sourceText, /quote\.textContent = item\.text/);
  assert.doesNotMatch(sourceText, /dataset\.year|innerHTML/);
});

test('BEARS SAY remains adjacent to CGB SAYS with restrained year and typography polish', async () => {
  const [fanSource, profileSource, css, bootstrap, formCss] = await Promise.all([
    source('js/fan-experiences.mjs'),
    source('js/venue-profile-enhancement.mjs'),
    source('css/venue-profile.css'),
    source('js/icon-upgrade.mjs'),
    source('css/watch-party-form.css')
  ]);
  assert.match(profileSource, /CGB SAYS/);
  assert.match(fanSource, /detail\.querySelector\(':scope > \.detail-editorial'\)/);
  assert.match(fanSource, /editorial\.after\(section\)/);
  assert.match(formCss, /@import url\('\.\/venue-profile\.css'\)/);
  assert.match(css, /\.venue-detail \.detail-fan-experiences\s*\{/);
  assert.doesNotMatch(css, /body\[data-view="detail"\] \.detail-fan-experiences/);
  assert.match(css, /padding: 16px/);
  assert.match(css, /body\[data-view="detail"\] \.detail-editorial h2,[\s\S]*\.venue-detail \.detail-fan-experiences h2\s*\{[\s\S]*font-weight: 850;/);
  assert.match(css, /body\[data-view="detail"\] \.detail-editorial__copy\s*\{[\s\S]*font-size: var\(--text-sm\);/);
  assert.match(css, /\.detail-fan-experiences__mark\s*\{[\s\S]*font-size: 24px;/);
  assert.match(css, /\.detail-fan-experiences__quote\s*\{[\s\S]*font-size: 13px;[\s\S]*font-weight: 400;[\s\S]*line-height: 1\.45;/);
  assert.match(css, /\.detail-fan-experiences__attribution\s*\{[\s\S]*font-size: 12px;/);
  assert.match(css, /\.detail-fan-experiences__year\s*\{[\s\S]*color: var\(--cgb-ink-500\);[\s\S]*font-size: inherit;/);
  assert.doesNotMatch(css, /detail-fan-experiences__quote\[data-year\]::before/);
  assert.match(css, /\.detail-fan-experiences__share\s*\{[\s\S]*font-size: 14px;[\s\S]*font-weight: 700;/);
  assert.match(css, /@media \(max-width: 359px\)[\s\S]*\.detail-fan-experiences/);
  assert.doesNotMatch(css, /star-rating|avatar|review-card|quote-icon/);
  assert.match(bootstrap, /renderFanExperiences/);
});
