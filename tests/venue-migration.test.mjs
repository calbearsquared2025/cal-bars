import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateSnapshot } from '../scripts/validate-v2-data.mjs';

import {
  PUBLIC_VENUE_FIELDS,
  VENUE_FIELDS,
  buildPublicSnapshot,
  createVenueId,
  inferClassification,
  migrateRows,
  normalizeUrl,
  normalizeWhitespace,
  parseCoordinate,
  parseCsv,
  serializeCsv,
  slugify,
  splitAddress,
  writeReviewPackage
} from '../scripts/migrate-v1-venues.mjs';

const fixtureUrl = new URL('./fixtures/v1-venues-sanitized.csv', import.meta.url);
const timestamp = '2026-07-26T00:00:00Z';

async function fixtureRows() {
  return parseCsv(await readFile(fixtureUrl, 'utf8'));
}

function simpleRow(overrides = {}) {
  return {
    source_row: 2,
    name: 'Fixture Venue',
    address: '100 Test Way',
    city: 'Berkeley',
    state: 'CA',
    zip: '94704',
    lat: '37.8717',
    lon: '-122.2728',
    url: '',
    promo: '',
    details: '',
    tvs: '',
    affiliation: '',
    submitted_as: 'Synthetic fixture',
    place_id: 'fixture_place_base',
    ...overrides
  };
}

test('field mapping normalizes whitespace, address units, region, postal code, and bare-domain URL', () => {
  const result = migrateRows([simpleRow({
    address: ' 100   Test Way # Suite 4 ',
    city: '  Berkeley ',
    state: ' ca ',
    zip: ' 94704 ',
    url: 'example.com/path'
  })], { migrationTimestamp: timestamp });
  const venue = result.accepted_venues[0];
  assert.equal(venue.address_line_1, '100 Test Way');
  assert.equal(venue.address_line_2, 'Suite 4');
  assert.equal(venue.city, 'Berkeley');
  assert.equal(venue.region, 'CA');
  assert.equal(venue.postal_code, '94704');
  assert.equal(venue.website_url, 'https://example.com/path');
  assert.deepEqual(Object.keys(venue), VENUE_FIELDS);
});

test('stable IDs and slugs are deterministic for unchanged source identity', () => {
  const row = simpleRow();
  assert.equal(createVenueId(row), createVenueId(structuredClone(row)));
  assert.match(createVenueId(row), /^ven_\d+$/);
  assert.equal(slugify('Fixture Venue Berkeley'), 'fixture-venue-berkeley');
  const first = migrateRows([row], { migrationTimestamp: timestamp });
  const second = migrateRows([structuredClone(row)], { migrationTimestamp: timestamp });
  assert.deepEqual(first.accepted_venues, second.accepted_venues);
});

test('slug collisions receive stable suffixes and are reported for review', () => {
  const rows = [
    simpleRow({ source_row: 2, name: 'Same Name', address: '1 Alpha Road', place_id: 'fixture_a' }),
    simpleRow({ source_row: 3, name: 'Same Name', address: '2 Beta Road', place_id: 'fixture_b', lat: '37.95' })
  ];
  const result = migrateRows(rows, { migrationTimestamp: timestamp });
  assert.equal(result.slug_collisions.length, 1);
  assert.equal(result.duplicate_groups.length, 1);
  const slugs = result.records.map((record) => record.candidate.slug);
  assert.equal(new Set(slugs).size, 2);
  assert.ok(slugs.every((slug) => /^same-name-berkeley-[a-f0-9]{8}$/.test(slug)));
});

test('URL normalization accepts safe web URLs and rejects unsafe or source-map URLs', () => {
  assert.deepEqual(normalizeUrl('example.com'), { status: 'valid', normalized: 'https://example.com/' });
  assert.equal(normalizeUrl('https://example.com/a').status, 'valid');
  assert.equal(normalizeUrl('javascript:alert(1)').status, 'unsafe_scheme');
  const result = migrateRows([
    simpleRow({ source_row: 2, url: 'javascript:alert(1)' }),
    simpleRow({ source_row: 3, place_id: 'fixture_map', url: 'https://maps.google.com/?cid=123' })
  ], { migrationTimestamp: timestamp });
  assert.ok(result.accepted_venues.every((venue) => venue.website_url === ''));
  assert.ok(result.ambiguities.some((item) => item.code === 'INVALID_OR_UNSAFE_SOURCE_URL'));
  assert.ok(result.ambiguities.some((item) => item.code === 'SOURCE_URL_NOT_VENUE_WEBSITE'));
});

test('coordinate parsing validates missing, numeric, and out-of-range values', () => {
  assert.deepEqual(parseCoordinate('37.5', 'latitude'), { value: 37.5, error: '' });
  assert.equal(parseCoordinate('', 'latitude').error, 'MISSING_LATITUDE');
  assert.equal(parseCoordinate('91', 'latitude').error, 'OUT_OF_RANGE_LATITUDE');
  assert.equal(parseCoordinate('-181', 'longitude').error, 'OUT_OF_RANGE_LONGITUDE');
});

test('duplicate detection reports signals and conflicts without silently merging', () => {
  const rows = [
    simpleRow({ source_row: 2, name: 'Primary Fixture', place_id: 'same_place' }),
    simpleRow({ source_row: 3, name: 'Variant Fixture', place_id: 'same_place' })
  ];
  const result = migrateRows(rows, { migrationTimestamp: timestamp });
  assert.equal(result.duplicate_groups.length, 1);
  assert.deepEqual(result.duplicate_groups[0].source_rows, [2, 3]);
  assert.ok(result.duplicate_groups[0].matching_signals.includes('external_place_id_exact'));
  assert.ok(result.duplicate_groups[0].conflicts.some((conflict) => conflict.field === 'name'));
  assert.equal(result.records[0].disposition, 'accepted');
  assert.equal(result.records[1].disposition, 'probable_duplicate');
  assert.equal(result.records[1].reason_code, 'SUSPECTED_DUPLICATE_REQUIRES_REVIEW');
});

test('classification requires recurring Cal-community evidence and defaults uncertainty to Community Location', () => {
  const recurring = inferClassification(simpleRow({ details: 'Cal alumni hosts watch parties here every game.' }));
  const uncertain = inferClassification(simpleRow({ promo: 'This bar would be described as a Cal bar.' }));
  assert.equal(recurring.venue_type, 'cal_bar');
  assert.equal(recurring.review_required, false);
  assert.equal(uncertain.venue_type, 'community_location');
  assert.equal(uncertain.review_required, true);
});

test('single historical event rows are held rather than converted to Watch Parties', () => {
  const result = migrateRows([simpleRow({ details: 'Official 2025 Big Game Watch Party' })], { migrationTimestamp: timestamp });
  assert.equal(result.held_records.length, 1);
  assert.equal(result.held_records[0].reason_code, 'EVENT_ONLY_RECURRING_VALUE_UNSUPPORTED');
  assert.equal(result.accepted_venues.length, 0);
});

test('missing required fields and invalid coordinates use stable rejection reason codes', () => {
  const result = migrateRows([
    simpleRow({ source_row: 2, name: '' }),
    simpleRow({ source_row: 3, place_id: 'bad_coordinate', lat: '999' })
  ], { migrationTimestamp: timestamp });
  assert.deepEqual(result.rejected_records.map((record) => record.reason_code), [
    'MISSING_NAME',
    'OUT_OF_RANGE_LATITUDE'
  ]);
});

test('all source rows reconcile exactly once with deterministic report ordering', async () => {
  const rows = await fixtureRows();
  const first = migrateRows(rows, { migrationTimestamp: timestamp });
  const second = migrateRows([...rows].reverse(), { migrationTimestamp: timestamp });
  assert.equal(first.reconciliation.total_v1_source_rows, rows.length);
  assert.equal(first.reconciliation.all_source_rows_accounted_for_exactly_once, true);
  assert.equal(first.reconciliation.accounted_rows, rows.length);
  assert.deepEqual(first.accepted_venues, second.accepted_venues);
  assert.deepEqual(first.duplicate_groups, second.duplicate_groups);
  assert.deepEqual(first.ambiguities, second.ambiguities);
});

test('public snapshot excludes private provenance and administrative fields', async () => {
  const result = migrateRows(await fixtureRows(), { migrationTimestamp: timestamp });
  const snapshot = buildPublicSnapshot(result, { games: [{ game_id: 'game_fixture' }] }, timestamp);
  const privateFields = VENUE_FIELDS.filter((field) => !PUBLIC_VENUE_FIELDS.includes(field));
  for (const venue of snapshot.venues) {
    assert.deepEqual(Object.keys(venue), PUBLIC_VENUE_FIELDS);
    for (const field of privateFields) assert.equal(field in venue, false);
  }
  const serialized = JSON.stringify(snapshot);
  for (const forbidden of ['external_source', 'external_place_id', 'publication_status', 'source_submission_id', 'submitted_as']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('generated candidate simulation passes the repository public-data validator', async () => {
  const result = migrateRows(await fixtureRows(), { migrationTimestamp: timestamp });
  const snapshot = buildPublicSnapshot(result, { games: [] }, timestamp);
  assert.deepEqual(validateSnapshot(snapshot), []);
});

test('manual overrides remain separate and visibly non-automated', () => {
  const source = simpleRow({ promo: 'This bar would be described as a Cal bar.' });
  const result = migrateRows([source], {
    migrationTimestamp: timestamp,
    overrides: {
      v1_public_row_0002: {
        venue_type: 'cal_bar',
        note: 'Product-owner decision supported outside the automated source rules.'
      }
    }
  });
  assert.equal(result.accepted_records[0].candidate.venue_type, 'cal_bar');
  assert.equal(result.accepted_records[0].automated, false);
  assert.match(result.accepted_records[0].manual_note, /Product-owner decision/);
});

test('review package files and manifest are deterministic across reruns', async () => {
  const result = migrateRows(await fixtureRows(), { migrationTimestamp: timestamp });
  const firstDirectory = await mkdtemp(join(tmpdir(), 'cgb-migration-first-'));
  const secondDirectory = await mkdtemp(join(tmpdir(), 'cgb-migration-second-'));
  await writeReviewPackage(result, firstDirectory, { games: [] });
  await writeReviewPackage(result, secondDirectory, { games: [] });
  const firstNames = (await readdir(firstDirectory)).sort();
  const secondNames = (await readdir(secondDirectory)).sort();
  assert.deepEqual(firstNames, secondNames);
  for (const name of firstNames) {
    assert.equal(await readFile(join(firstDirectory, name), 'utf8'), await readFile(join(secondDirectory, name), 'utf8'));
  }
});

test('CSV parser and serializer preserve deterministic row content', async () => {
  const rows = await fixtureRows();
  const serialized = serializeCsv(rows, Object.keys(rows[0]).filter((key) => key !== 'source_row'));
  const reparsed = parseCsv(serialized);
  assert.equal(reparsed.length, rows.length);
  assert.equal(normalizeWhitespace(reparsed[0].name), rows[0].name);
  assert.deepEqual(splitAddress('800 Unit Road #Suite 8'), {
    address_line_1: '800 Unit Road',
    address_line_2: 'Suite 8'
  });
});
