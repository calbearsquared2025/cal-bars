import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  bearCountCopy,
  buildVenueShareMessage
} from '../js/core.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Fan Intent copy describes planned attendance', () => {
  assert.equal(bearCountCopy(0), 'No Bears planning to watch here yet. Be the first.');
  assert.equal(bearCountCopy(1), '1 Bear planning to watch here');
  assert.equal(bearCountCopy(4), '4 Bears planning to watch here');
});

test('share copy changes from discovery to invitation after commitment', () => {
  const base = {
    venueName: 'Molly O’s',
    opponentName: 'UCLA',
    url: 'https://calgoldenbars.com/?venue=molly-o-s-san-carlos&game=game_example'
  };
  assert.equal(
    buildVenueShareMessage({ ...base, committed: false }),
    `Cal vs. UCLA at Molly O’s — see who’s planning to watch here: ${base.url}`
  );
  assert.equal(
    buildVenueShareMessage({ ...base, committed: true }),
    `I’ll be at Molly O’s for Cal vs. UCLA. Join me: ${base.url}`
  );
  assert.equal(
    buildVenueShareMessage({ ...base, hasWatchParty: true, committed: false }),
    `There’s a Cal vs. UCLA Watch Party at Molly O’s. Details: ${base.url}`
  );
  assert.equal(
    buildVenueShareMessage({ ...base, hasWatchParty: true, committed: true }),
    `I’ll be at Molly O’s for the Cal vs. UCLA Watch Party. Join me: ${base.url}`
  );
});

test('post-join duplicate share panel is retired', async () => {
  const source = await read('js/fan-intent.js');
  assert.doesNotMatch(source, /renderPostJoinInvitation|post-join-share|Invite other Bears/);
});

test('release candidate transforms persistent Share to Invite Bears', async () => {
  const source = await read('js/icon-upgrade.mjs');
  assert.match(source, /committed \? 'Invite Bears' : 'Share'/);
  assert.match(source, /release-candidate-refinement\.mjs/);
});

test('Venue Detail keeps map with photo and separates editorial fields', async () => {
  const source = await read('js/venue-profile-enhancement.mjs');
  assert.match(source, /ensureLocalMap\(hero, documentObject, venue\)/);
  assert.doesNotMatch(source, /querySelector\(':scope > \.detail-local-map'\)\?\.remove/);
  assert.match(source, /About this location/);
  assert.match(source, /venue\?\.cgb_says/);
  assert.match(source, /CGB SAYS/);
});

test('cgb_says is an optional public Venues field', async () => {
  const source = await read('apps-script/Code.gs');
  assert.match(source, /'updated_at', 'cgb_says'/);
  assert.match(source, /'short_description', 'cgb_says', 'photo_url'/);
});

test('Detail release refinement prioritizes current Watch Party and photo contribution', async () => {
  const source = await read('js/release-candidate-refinement.mjs');
  assert.match(source, /activity\.before\(party\)/);
  assert.match(source, /Add the first photo/);
  assert.match(source, /View venue details/);
});
