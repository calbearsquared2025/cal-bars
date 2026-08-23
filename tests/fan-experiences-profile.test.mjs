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
    { venue_id: venueId, text: 'Newest' },
    { venue_id: venueId, text: 'Second' },
    { venue_id: venueId, text: 'Third' },
    { venue_id: 'venue_aaaaaaaaaaaaaaaaaaaaaaaa', text: 'Other venue' }
  ] }, venueId);
  assert.deepEqual(experiences.map((item) => item.text), ['Newest', 'Second', 'Third']);
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
  assert.match(sourceText, /quote\.textContent = item\.text/);
  assert.doesNotMatch(sourceText, /innerHTML/);
});

test('BEARS SAY remains adjacent to CGB SAYS and uses the analogous mobile-safe profile treatment', async () => {
  const [fanSource, profileSource, css, bootstrap] = await Promise.all([
    source('js/fan-experiences.mjs'),
    source('js/venue-profile-enhancement.mjs'),
    source('css/venue-profile.css'),
    source('js/icon-upgrade.mjs')
  ]);
  assert.match(profileSource, /CGB SAYS/);
  assert.match(fanSource, /detail\.querySelector\(':scope > \.detail-editorial'\)/);
  assert.match(fanSource, /editorial\.after\(section\)/);
  assert.match(css, /\.detail-fan-experiences\s*\{/);
  assert.match(css, /padding: 16px/);
  assert.match(css, /@media \(max-width: 359px\)[\s\S]*\.detail-fan-experiences/);
  assert.doesNotMatch(css, /star-rating|avatar|review-card|quote-icon/);
  assert.match(bootstrap, /renderFanExperiences/);
});
