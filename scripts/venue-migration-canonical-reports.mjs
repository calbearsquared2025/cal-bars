import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { stableHash } from './venue-migration-normalize.mjs';
import { writeReviewPackage as writeLegacyReviewPackage } from './venue-migration-reports.mjs';

const LEGACY_ID_DESCRIPTION = '- `venue_id`: deterministic numeric ID derived from the strongest stable source identity.';
const CANONICAL_ID_DESCRIPTION = '- `venue_id`: deterministic opaque `venue_<24 lowercase hex>` ID derived from the reviewed legacy seed; it carries no business meaning.';

function safeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeReviewPackage(result, outputDirectory, baseSnapshot = null) {
  const output = await writeLegacyReviewPackage(result, outputDirectory, baseSnapshot);
  const mappingPath = join(outputDirectory, 'transformation-mapping.md');
  const originalMapping = await readFile(mappingPath, 'utf8');
  const canonicalMapping = originalMapping.replace(LEGACY_ID_DESCRIPTION, CANONICAL_ID_DESCRIPTION);
  if (canonicalMapping === originalMapping) {
    throw new Error('Canonical migration report could not locate the legacy numeric-ID description.');
  }
  await writeFile(mappingPath, canonicalMapping, 'utf8');

  const manifestPath = join(outputDirectory, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const mappingEntry = manifest.find((entry) => entry.file === 'transformation-mapping.md');
  if (!mappingEntry) throw new Error('Migration manifest is missing transformation-mapping.md.');
  mappingEntry.sha256 = stableHash(canonicalMapping);
  mappingEntry.bytes = Buffer.byteLength(canonicalMapping, 'utf8');
  manifest.sort((first, second) => first.file.localeCompare(second.file));
  await writeFile(manifestPath, safeJson(manifest), 'utf8');

  return { ...output, manifest };
}
