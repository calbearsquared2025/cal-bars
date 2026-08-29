import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Venue Profile contribution actions use sentence case', async () => {
  const [listingUpdateSource, photoFormSource, calBarSource] = await Promise.all([
    read('js/listing-update.js'),
    read('js/photo-form.js'),
    read('js/cal-bar-nomination.js')
  ]);

  assert.match(calBarSource, /'Tell us about this location'/);
  assert.match(listingUpdateSource, /'Suggest an update or report an issue'/);
  assert.doesNotMatch(listingUpdateSource, /'Suggest an Update or Report an Issue'/);
  assert.match(photoFormSource, /label: 'Add a new photo'/);
  assert.match(photoFormSource, /label: 'Add a photo!'/);
  assert.doesNotMatch(photoFormSource, /label: 'Add a New Photo'/);
  assert.doesNotMatch(photoFormSource, /label: 'Add a Photo!'/);
});
