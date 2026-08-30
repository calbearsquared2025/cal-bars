import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Venue Profile contribution actions use sentence case while the map photo overlay stays compact and uppercase', async () => {
  const [listingUpdateSource, photoFormSource, calBarSource] = await Promise.all([
    read('js/listing-update.js'),
    read('js/photo-form.js'),
    read('js/cal-bar-nomination.js')
  ]);

  assert.match(calBarSource, /'Tell us about this location'/);
  assert.match(listingUpdateSource, /'Add or update location details'/);
  assert.doesNotMatch(listingUpdateSource, /'Add or Update Location Details'/);
  assert.match(photoFormSource, /label: 'Add a new photo'/);
  assert.match(photoFormSource, /label: 'ADD A PHOTO'/);
  assert.doesNotMatch(photoFormSource, /label: 'Add a New Photo'/);
  assert.doesNotMatch(photoFormSource, /label: 'Add a Photo!'/);
});
