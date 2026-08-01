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

function buildReviewItems(result) {
  const recordsByRow = new Map(result.records.map((record) => [record.source_row, record]));
  return result.ambiguities
    .filter((item) => {
      const record = recordsByRow.get(item.source_row);
      if (!record) return true;
      if (item.code === 'CLASSIFICATION_REVIEW_REQUIRED' && !record.automated) return false;
      if (item.code === 'SOURCE_DESCRIPTION_EXCLUDED_PENDING_EDITORIAL_REVIEW'
        && record.candidate.short_description) return false;
      return true;
    })
    .map((item) => {
      if (item.code === 'SOURCE_URL_NOT_VENUE_WEBSITE') {
        return {
          ...item,
          code: 'SOURCE_MAP_LINK_RETAINED_AS_PRIVATE_PROVENANCE',
          note: 'Approved Milestone 6A policy: Google Maps source links remain private provenance and do not publish as venue websites.'
        };
      }
      if (item.code === 'SOURCE_DESCRIPTION_EXCLUDED_PENDING_EDITORIAL_REVIEW') {
        return {
          ...item,
          code: 'SOURCE_DESCRIPTION_EXCLUDED_BY_MIGRATION_POLICY',
          note: 'Approved Milestone 6A policy: legacy promotional and descriptive copy is excluded unless a concise source-supported explanation is explicitly approved.'
        };
      }
      return item;
    });
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
    + `| \`promo\`, \`details\`, \`tvs\`, \`affiliation\` | Used as classification and review evidence. Legacy copy is not copied automatically. A reviewed override may publish one concise explanation of an already-documented Cal event without creating historical event or attendance data. |\n`
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
    + `- \`short_description\`: blank by default; a product-owner override may add one concise source-supported Cal-connection explanation.\n`
    + `- Photos and source-submission IDs remain blank.\n\n`
    + `## Disposition rules\n\n`
    + `Rows missing required location identity or valid coordinates are rejected with stable reason codes. Rows that appear to document only a single historical event are held until the product owner explicitly accepts or excludes them. An accepted one-event row remains a Community Location and does not create a Watch Party, historical timeline, or attendance count. Duplicate signals never cause silent merging. Manual overrides are read from a separate optional JSON file and are marked as manual.\n`;
}

function buildChecklistMarkdown(result, reviewItems) {
  const heldLines = result.held_records.map((record) => `- [ ] Source row ${record.source_row} — ${record.candidate.name}: accept as Community Location, reclassify with evidence, or exclude (${record.reason_code}).`);
  const duplicateLines = result.duplicate_groups.map((group) => `- [ ] ${group.duplicate_group_id}: decide disposition for source rows ${group.source_rows.join(', ')}; proposed primary is row ${group.proposed_primary_source_row}.`);
  const classificationRows = [...new Set(reviewItems
    .filter((item) => item.code === 'CLASSIFICATION_REVIEW_REQUIRED')
    .map((item) => item.source_row))];
  const rejectedLines = result.rejected_records.map((record) => `${record.automated ? '- [ ]' : '- [x]'} Confirm exclusion of source row ${record.source_row} — ${record.candidate.name || normalizeWhitespace(record.source.name)} (${record.reason_code}).`);

  return `# Matthew review checklist\n\n`
    + `## Required decisions\n\n`
    + `${duplicateLines.length ? duplicateLines.join('\n') : '- [x] No suspected duplicate groups were generated.'}\n`
    + `${heldLines.length ? heldLines.join('\n') : '- [x] No records are held for review.'}\n`
    + `${rejectedLines.length ? rejectedLines.join('\n') : '- [x] No records are rejected.'}\n`
    + `${classificationRows.length ? `- [ ] Review uncertain proposed classifications for source rows: ${classificationRows.join(', ')}.` : '- [x] Product owner approved all proposed Venue classifications.'}\n`
    + `- [x] Google Maps source links remain private provenance and public \`website_url\` stays blank unless a venue website is separately approved.\n`
    + `- [x] Legacy promotional, ownership, discount, television, and descriptive copy remains excluded except for explicitly approved concise Cal-event justifications.\n`
    + `- [x] The deterministic migration timestamp is approved as an administrative load timestamp, not historical venue metadata.\n`
    + `- [x] The accepted Venue count and Cal Bar / Community Location split are approved for Milestone 6A closeout.\n\n`
    + `## Completion gate\n\n`
    + `Milestone 6A may close when no unchecked item remains. Do not load the private v2 workbook or begin Milestone 6B as part of this closeout.\n`;
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
    + `- Historical-event descriptions do not create Watch Party records, timelines, or historical attendance counts.\n`
    + `- The simulated snapshot contains only the existing public Venue fields; private provenance and administrative fields are omitted.\n\n`
    + `## Observed findings\n\n`
    + `- The candidate volume is small relative to ordinary static JSON payloads and does not by itself indicate a need to change the GitHub Pages / Apps Script architecture.\n`
    + `- Candidate generation and report ordering are deterministic when input, migration timestamp, and optional overrides are unchanged.\n`
    + `- Legacy source descriptions remain excluded by default; three reviewed Community Locations use concise descriptions based only on specific events already present in the v1 source.\n\n`
    + `## Limitations and speculative concerns\n\n`
    + `- The existing browser harness uses its own fixed test fixture. It should still run as a regression test, but it does not prove rendering with this exact untracked production-derived candidate file.\n`
    + `- Network latency and Apps Script cache behavior cannot be inferred from local snapshot byte size alone.\n`
    + `- Automated network enrichment and broad historical research are outside Milestone 6A. The closed-venue exclusion is a documented product-owner override.\n`;
}

export async function writeReviewPackage(result, outputDirectory, baseSnapshot = null) {
  await mkdir(outputDirectory, { recursive: true });
  const snapshot = buildPublicSnapshot(result, baseSnapshot || {}, result.migration_timestamp);
  const reviewItems = buildReviewItems(result);
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
    ['ambiguity-report.csv', serializeCsv(reviewItems, ['source_row', 'source_key', 'code', 'field', 'automated_value', 'source_value', 'note'])],
    ['held-records.csv', serializeCsv(heldRows, ['source_row', 'source_key', 'name', 'proposed_venue_type', 'reason_code', 'source_evidence'])],
    ['rejected-records.csv', serializeCsv(rejectedRows, ['source_row', 'source_key', 'name', 'reason_code'])],
    ['reconciliation.json', safeJson(result.reconciliation)],
    ['public-snapshot-simulation.json', safeJson(snapshot)],
    ['transformation-mapping.md', buildMappingMarkdown()],
    ['matthew-review-checklist.md', buildChecklistMarkdown(result, reviewItems)],
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
