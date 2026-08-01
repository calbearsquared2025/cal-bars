#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { VENUE_FIELDS, parseCsv } from './venue-migration-normalize.mjs';

const NUMERIC_FIELDS = new Set(['latitude', 'longitude']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    args[key] = value;
    index += 1;
  }
  return args;
}

function normalizeScalar(field, value) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!NUMERIC_FIELDS.has(field) || text === '') return text;
  const number = Number(text);
  if (!Number.isFinite(number)) return text;
  return String(number);
}

function canonicalVenue(record, publicationStatusOverride = '') {
  const venue = {};
  for (const field of VENUE_FIELDS) {
    const value = field === 'publication_status' && publicationStatusOverride
      ? publicationStatusOverride
      : record[field];
    venue[field] = normalizeScalar(field, value);
  }
  return venue;
}

function canonicalJson(records) {
  return JSON.stringify([...records]
    .sort((left, right) => left.venue_id.localeCompare(right.venue_id, 'en-US'))
    .map((record) => VENUE_FIELDS.map((field) => record[field])));
}

export function venueSetHash(records) {
  return createHash('sha256').update(canonicalJson(records), 'utf8').digest('hex');
}

function duplicateValues(records, field) {
  const counts = new Map();
  for (const record of records) {
    const value = record[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value, 'en-US'));
}

export function validateVenueLoad({
  approvedRows,
  actualRows,
  preservedVenueIds = [],
  approvedPublicationStatus = 'published'
}) {
  const issues = [];
  const actualFields = actualRows.length > 0
    ? Object.keys(actualRows[0]).filter((field) => field !== 'source_row')
    : [];
  if (JSON.stringify(actualFields) !== JSON.stringify(VENUE_FIELDS)) {
    issues.push({
      code: 'ACTUAL_VENUE_SCHEMA_MISMATCH',
      expected_fields: VENUE_FIELDS,
      actual_fields: actualFields
    });
  }

  const expectedApproved = approvedRows.map((row) => canonicalVenue(row, approvedPublicationStatus));
  const actual = actualRows.map((row) => canonicalVenue(row));
  const preservedIds = new Set(preservedVenueIds);
  const expectedById = new Map(expectedApproved.map((record) => [record.venue_id, record]));
  const actualById = new Map(actual.map((record) => [record.venue_id, record]));

  for (const duplicate of duplicateValues(actual, 'venue_id')) {
    issues.push({ code: 'DUPLICATE_VENUE_ID', venue_id: duplicate.value, count: duplicate.count });
  }
  for (const duplicate of duplicateValues(actual, 'slug')) {
    issues.push({ code: 'DUPLICATE_VENUE_SLUG', slug: duplicate.value, count: duplicate.count });
  }

  for (const expected of expectedApproved) {
    const found = actualById.get(expected.venue_id);
    if (!found) {
      issues.push({ code: 'MISSING_APPROVED_VENUE', venue_id: expected.venue_id, name: expected.name });
      continue;
    }
    for (const field of VENUE_FIELDS) {
      if (found[field] !== expected[field]) {
        issues.push({
          code: 'APPROVED_VENUE_FIELD_MISMATCH',
          venue_id: expected.venue_id,
          field,
          expected: expected[field],
          actual: found[field]
        });
      }
    }
  }

  for (const record of actual) {
    if (!expectedById.has(record.venue_id) && !preservedIds.has(record.venue_id)) {
      issues.push({ code: 'UNEXPECTED_VENUE', venue_id: record.venue_id, name: record.name, city: record.city });
    }
  }

  for (const venueId of [...preservedIds].sort()) {
    if (!actualById.has(venueId)) issues.push({ code: 'MISSING_PRESERVED_VENUE', venue_id: venueId });
  }

  const actualApproved = actual.filter((record) => expectedById.has(record.venue_id));
  const expectedHash = venueSetHash(expectedApproved);
  const actualHash = venueSetHash(actualApproved);
  if (expectedHash !== actualHash) {
    issues.push({ code: 'APPROVED_VENUE_SET_HASH_MISMATCH', expected_hash: expectedHash, actual_hash: actualHash });
  }

  return {
    valid: issues.length === 0,
    summary: {
      approved_expected: expectedApproved.length,
      approved_found: actualApproved.length,
      preserved_expected: preservedIds.size,
      total_actual: actual.length,
      expected_approved_hash: expectedHash,
      actual_approved_hash: actualHash
    },
    issues
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.approved || !args.actual) {
      console.error('Usage: node scripts/validate-venue-load.mjs --approved <approved.csv> --actual <workbook-export.csv> [--preserve-venue-ids <id,id>] [--approved-publication-status <status>] [--report <report.json>]');
      process.exitCode = 2;
      return;
    }
    const approvedRows = parseCsv(await readFile(resolve(args.approved), 'utf8'));
    const actualRows = parseCsv(await readFile(resolve(args.actual), 'utf8'));
    const preservedVenueIds = (args['preserve-venue-ids'] || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const report = validateVenueLoad({
      approvedRows,
      actualRows,
      preservedVenueIds,
      approvedPublicationStatus: args['approved-publication-status'] || 'published'
    });
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (args.report) await writeFile(resolve(args.report), output, 'utf8');
    console.log(output.trimEnd());
    if (!report.valid) process.exitCode = 1;
  } catch (error) {
    console.error(`Venue load validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
