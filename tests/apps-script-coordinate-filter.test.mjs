import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const warnings = [];
const context = vm.createContext({
  console: {
    log() {},
    error() {},
    warn: (...args) => warnings.push(args)
  }
});
vm.runInContext(source, context);

test('Apps Script coordinate helper accepts valid numeric values', () => {
  assert.equal(context.hasValidVenueCoordinates_({
    venue_id: 'ven_good',
    latitude: '37.8717',
    longitude: '-122.2728'
  }), true);
});

test('Apps Script coordinate helper rejects missing and invalid values', () => {
  assert.equal(context.hasValidVenueCoordinates_({
    venue_id: 'ven_blank',
    latitude: '',
    longitude: '-122.2728'
  }), false);
  assert.equal(context.hasValidVenueCoordinates_({
    venue_id: 'ven_range',
    latitude: 95,
    longitude: -122.2728
  }), false);
  assert.ok(warnings.length >= 2);
});

test('published venue filtering invokes the coordinate helper', () => {
  assert.match(source, /publication_status === 'published' && hasValidVenueCoordinates_\(row\)/);
});
