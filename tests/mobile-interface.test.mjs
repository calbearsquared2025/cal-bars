import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');

test('interface uses the normalized v2 JSON fallback instead of the public CSV', () => {
  assert.match(app, /data\/fallback-v2\.json/);
  assert.doesNotMatch(html, /papaparse/i);
  assert.doesNotMatch(html, /output=csv|docs\.google\.com\/spreadsheets/i);
});

test('mobile shell includes game selection, map, search, and draggable tray states', () => {
  assert.match(html, /id="game-dialog"/);
  assert.match(html, /id="map"/);
  assert.match(html, /id="location-search"/);
  assert.match(html, /id="venue-tray"/);
  assert.match(css, /tray--peek/);
  assert.match(css, /tray--selected/);
  assert.match(css, /tray--full/);
});

test('venue details and sharing preserve game context through stable query URLs', () => {
  assert.match(app, /buildVenueUrl/);
  assert.match(html, /id="detail-view"/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /navigator\.clipboard/);
});

test('deferred write and photo features are not implemented in Milestone 2', () => {
  assert.match(app, /intent\.disabled = true/);
  assert.doesNotMatch(html, /Add a Photo|photo upload/i);
  assert.doesNotMatch(app, /joinExternalVenue|browser_id|doPost/);
});

test('responsive desktop layout retains the same application', () => {
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 410px/);
});
