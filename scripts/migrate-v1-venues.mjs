#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REQUIRED_SOURCE_HEADERS, parseCsv } from './venue-migration-normalize.mjs';
import {
  buildPublicSnapshot,
  canonicalizeMigrationBaseSnapshot,
  migrateRows
} from './venue-migration-canonical.mjs';
import { writeReviewPackage } from './venue-migration-reports.mjs';

export * from './venue-migration-normalize.mjs';
export * from './venue-migration-core.mjs';
export * from './venue-migration-reports.mjs';
export {
  buildPublicSnapshot,
  canonicalizeMigrationBaseSnapshot,
  migrateRows
} from './venue-migration-canonical.mjs';

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

async function loadSource(path) {
  const extension = extname(path).toLocaleLowerCase('en-US');
  const text = await readFile(path, 'utf8');
  if (extension === '.json') {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;
    if (!Array.isArray(rows)) throw new Error('JSON source must be an array or contain a rows array.');
    return rows.map((row, index) => ({ source_row: row.source_row || index + 2, ...row }));
  }
  return parseCsv(text);
}

function validateSourceHeaders(rows) {
  if (rows.length === 0) throw new Error('Source contains no populated rows.');
  const available = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_SOURCE_HEADERS.filter((header) => !available.has(header));
  if (missing.length) throw new Error(`Source is missing required headers: ${missing.join(', ')}`);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.input || !args.output) {
      console.error('Usage: node scripts/migrate-v1-venues.mjs --input <source.csv|json> --output <directory> [--base-snapshot <fallback.json>] [--overrides <overrides.json>] [--migration-timestamp <ISO datetime>]');
      process.exitCode = 2;
      return;
    }
    const inputPath = resolve(args.input);
    const outputPath = resolve(args.output);
    const rows = await loadSource(inputPath);
    validateSourceHeaders(rows);
    const overrides = args.overrides ? JSON.parse(await readFile(resolve(args.overrides), 'utf8')) : {};
    const baseSnapshot = args['base-snapshot']
      ? canonicalizeMigrationBaseSnapshot(JSON.parse(await readFile(resolve(args['base-snapshot']), 'utf8')))
      : {};
    const result = migrateRows(rows, {
      migrationTimestamp: args['migration-timestamp'] || '2026-07-26T00:00:00Z',
      overrides
    });
    const { manifest } = await writeReviewPackage(result, outputPath, baseSnapshot);
    console.log(`Milestone 6A dry run complete for ${basename(inputPath)}.`);
    console.log(JSON.stringify(result.reconciliation, null, 2));
    console.log(`Wrote ${manifest.length + 1} deterministic review-package files to ${outputPath}.`);
    if (!result.reconciliation.all_source_rows_accounted_for_exactly_once) process.exitCode = 1;
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
