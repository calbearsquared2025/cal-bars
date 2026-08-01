import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  VENUE_FIELDS,
  normalizeWhitespace,
  serializeCsv,
  stableHash
} from './venue-migration-normalize.mjs';
import { buildPublicSnapshot } from './venue-migration-core.mjs';

function safeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function buildMappingMarkdown() {
  return `# Milestone 6A transformation mapping\n\n`
    + `| v1 field | v2 treatment |\n|---|---|\n`
    + `| \`name\` | Whitespace-normalized into \`name\`. |\n`
    + `| \`address\` | Whitespace-normalized; trailing \`#...\` unit content is separated into \`address_line_2\`. |\n`
    + `| \`city\` | Whitespace-normalized into \`city\`. |\n`
    + `| \`state\` | Uppercased into \`region\`. |\n`
    + `| \`zip\` | Preserved as text and normalized into \`postal_code\`. |\n`
    + `| \`lat\`, \`lon\` | Parsed as finite coordinates and range-validated. |\n`
    + `| \`url\` | Accepted only as a safe HTTP(S) venue website. Google Maps source links remain private provenance and are not published as \`website_url\`. |\n`
    + `| \`place_id\` | Preserved privately as \`external_place_id\`; Google-style \`ChIJ...\` values use \`external_source = google_places_v1\`. |\n`
    + `| \`promo\`, \`details\`, \`tvs\`, \`affiliation\` | Used as classification and review evidence. Not copied automatically into public \`short_description\`. |\n`
    + `| \`submitted_as\` | Private source provenance only; never public. |\n\n`
    + `## Generated/default fields\n\n`
    + `- \`venue_id\`: deterministic numeric ID derived from the strongest stable source identity.\n`
    + `- \`slug\`: deterministic kebab-case name/city slug; deterministic hash suffix on collisions.\n`
    + `- \`country_code\`: \`US\` because all current source rows are U.S. records.\n`
    + `- \`venue_type\`: \`cal_bar\` only when recurring Cal-community evidence matches documented rules; otherwise \`community_location\`.\n`
    + `- \`verification_status\`: proposed as \`cgb_reviewed\` for reviewed migration candidates.\n`
    + `- \`alumni_owned\`: \`yes\` only when the source explicitly says Alumni-Owned; otherwise \`unknown\`.\n`
    + `- \`publication_status\`: \`draft\` in the review dataset.\n`
    + `- \`created_at\`, \`updated_at\`: deterministic migration snapshot timestamp supplied to the tool; this is an administrative migration timestamp, not a claimed historical venue timestamp.\n`
    + `- Photos and source-submission IDs remain blank.\n\n`
    + `## Disposition rules\n\n`
    + `Rows missing required location identity or valid coordinates are rejected with stable reason codes. Rows that appear to document only a single historical event are held for product-owner review. Duplicate signals never cause silent merging. Manual overrides are read from a separate optional JSON file and are marked as manual.\n`;
}

function buildChecklistMarkdown(result) {
  const heldLines = result.held_records.map((record) => `- [ ] Source row ${record.source_row} — ${record.candidate.name}: accept as Community Location, reclassify with evidence, or exclude (${record.reason_code}).`);
  const duplicateLines = result.duplicate_groups.map((group) => `- [ ] ${group.duplicate_group_id}: decide disposition for source rows ${group.source_rows.join(', ')}; proposed primary is row ${group.proposed_primary_source_row}.`);
  const classificationRows = [...new Set(result.ambiguities
    .filter((item) => item.code === 'CLASSIFICATION_REVIEW_REQUIRED')
    .map((item) => item.source_row))];
  const rejectedLines = result.rejected_records.map((record) => `- [ ] Confirm exclusion of source row ${record.source_row} — ${record.candidate.name || normalizeWhitespace(record.source.name)} (${record.reason_code}).`);

  return `# Matthew review checklist\n\n`
    + `## Required decisions\n\n`
    + `${duplicateLines.length ? duplicateLines.join('\n') : '- [x] No suspected duplicate groups were generated.'}\n`
    + `${heldLines.length ? heldLines.join('\n') : '- [x] No records are held for review.'}\n`
    + `${rejectedLines.length ? rejectedLines.join('\n') : '- [x] No records are automatically rejected.'}\n`
    + `${classificationRows.length ? `- [ ] Review uncertain proposed classifications for source rows: ${classificationRows.join(', ')}.` : '- [x] No uncertain classifications were generated.'}\n`
    + `- [ ] Confirm that Google Maps source links remain private provenance and public \`website_url\` stays blank unless a venue website is separately approved.\n`
    + `- [ ] Confirm that no source descriptions, ownership claims, discounts, TV claims, or historical event copy auto-publish; editorial descriptions remain blank by default.\n`
    + `- [ ] Approve the deterministic migration timestamp as an administrative load timestamp, not historical venue metadata.\n`
    + `- [ ] Approve the accepted Venue count and Cal Bar / Community Location split before Milestone 6B.\n\n`
    + `## Completion gate\n\n`
    + `Do not load the private v2 workbook or begin Milestone 6B until every unchecked item above is resolved.\n`;
}

function buildReconciliationMarkdown(result, snapshot) {
  const count = result.reconciliation;
  const snapshotBytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
  return `# Milestone 6A reconciliation and snapshot assessment\n\n`
    + `| Metric | Count |\n|---|---:|\n`
    + `| Total v1 source rows | ${count.total_v1_source_rows} |\n`
    + `| Proposed accepted Venues | ${count.proposed_accepted_venues} |\n`
    + `| Proposed Cal Bars | ${count.proposed_cal_bars} |\n`
    + `| Proposed Community Locations | ${count.proposed_community_locations} |\n`
    + `| Held for Matthew review | ${count.held_for_matthew_review} |\n`
    + `| Rejected | ${count.rejected_records} |\n`
    + `| Suspected duplicate groups | ${count.suspected_duplicate_groups} |\n`
    + `| Rows in suspected duplicate groups | ${count.rows_in_suspected_duplicate_groups} |\n`
    + `| Rows excluded from candidate dataset | ${count.rows_excluded_from_candidate_dataset} |\n\n`
    + `All source rows accounted for exactly once: **${count.all_source_rows_accounted_for_exactly_once ? 'yes' : 'no'}**.\n\n`
    + `## Public-snapshot simulation\n\n`
    + `- Candidate Venue count: ${snapshot.venues.length}\n`
    + `- Games retained from the supplied base snapshot: ${snapshot.games.length}\n`
    + `- Uncompressed compact JSON size: ${formatBytes(snapshotBytes)} (${snapshotBytes} bytes)\n`
    + `- Watch Parties and Fan Intent aggregates are intentionally empty in the migration simulation.\n`
    + `- The simulated snapshot contains only the existing public Venue fields; private provenance and administrative fields are omitted.\n\n`
    + `## Observed findings\n\n`
    + `- The candidate volume is small relative to ordinary static JSON payloads and does not by itself indicate a need to change the GitHub Pages / Apps Script architecture.\n`
    + `- Candidate generation and report ordering are deterministic when input, migration timestamp, and optional overrides are unchanged.\n`
    + `- Source descriptions are the main review burden; they are excluded from public output by default.\n\n`
    + `## Limitations and speculative concerns\n\n`
    + `- The existing browser harness uses its own fixed test fixture. It should still run as a regression test, but it does not prove rendering with this exact untracked production-derived candidate file.\n`
    + `- Network latency and Apps Script cache behavior cannot be inferred from local snapshot byte size alone.\n`
    + `- No network enrichment, closure check, or current-business verification is performed in Milestone 6A.\n`;
}

export async function writeReviewPackage(result, outputDirectory, baseSnapshot = null) {
  await mkdir(outputDirectory, { recursive: true });
  const snapshot = buildPublicSnapshot(result, baseSnapshot || {}, result.migration_timestamp);
  const acceptedReviewRows = result.accepted_records.map((record) => ({
    source_row: record.source_row,
    source_key: record.source_key,
    ...record.candidate,
    classification_confidence: record.classification.confidence,
    automated: record.automated,
    manual_note: record.manual_note
  }));
  const rejectedRows = result.rejected_records.map((record) => ({
    source_row: record.source_row,
    source_key: record.source_key,
    name: normalizeWhitespace(record.source.name),
    reason_code: record.reason_code
  }));
  const heldRows = result.held_records.map((record) => ({
    source_row: record.source_row,
    source_key: record.source_key,
    name: record.candidate.name,
    proposed_venue_type: record.candidate.venue_type,
    reason_code: record.reason_code,
    source_evidence: [record.source.promo, record.source.details, record.source.affiliation]
      .map(normalizeWhitespace).filter(Boolean).join(' | ')
  }));
  const duplicateRows = result.duplicate_groups.flatMap((group) => group.source_rows.map((sourceRow) => ({
    duplicate_group_id: group.duplicate_group_id,
    source_row: sourceRow,
    proposed_primary_source_row: group.proposed_primary_source_row,
    matching_signals: group.matching_signals.join('; '),
    conflicting_values: JSON.stringify(group.conflicts),
    matthew_decision_required: group.matthew_decision_required
  })));

  const files = new Map([
    ['proposed-venues.csv', serializeCsv(acceptedReviewRows, ['source_row', 'source_key', ...VENUE_FIELDS, 'classification_confidence', 'automated', 'manual_note'])],
    ['proposed-venues.json', safeJson(result.accepted_venues)],
    ['duplicate-report.csv', serializeCsv(duplicateRows, ['duplicate_group_id', 'source_row', 'proposed_primary_source_row', 'matching_signals', 'conflicting_values', 'matthew_decision_required'])],
    ['duplicate-report.json', safeJson(result.duplicate_groups)],
    ['ambiguity-report.csv', serializeCsv(result.ambiguities, ['source_row', 'source_key', 'code', 'field', 'automated_value', 'source_value', 'note'])],
    ['held-records.csv', serializeCsv(heldRows, ['source_row', 'source_key', 'name', 'proposed_venue_type', 'reason_code', 'source_evidence'])],
    ['rejected-records.csv', serializeCsv(rejectedRows, ['source_row', 'source_key', 'name', 'reason_code'])],
    ['reconciliation.json', safeJson(result.reconciliation)],
    ['public-snapshot-simulation.json', safeJson(snapshot)],
    ['transformation-mapping.md', buildMappingMarkdown()],
    ['matthew-review-checklist.md', buildChecklistMarkdown(result)],
    ['snapshot-and-reconciliation.md', buildReconciliationMarkdown(result, snapshot)]
  ]);

  for (const [fileName, content] of files) {
    await writeFile(join(outputDirectory, fileName), content, 'utf8');
  }
  const manifest = [...files.entries()].map(([fileName, content]) => ({
    file: fileName,
    sha256: stableHash(content),
    bytes: Buffer.byteLength(content, 'utf8')
  })).sort((first, second) => first.file.localeCompare(second.file));
  await writeFile(join(outputDirectory, 'manifest.json'), safeJson(manifest), 'utf8');
  return { snapshot, manifest };
}
