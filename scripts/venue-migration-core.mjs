import {
  PUBLIC_VENUE_FIELDS,
  applyManualOverride,
  buildCandidate,
  inferInitialDisposition,
  normalizeComparisonText,
  normalizeWhitespace,
  stableHash
} from './venue-migration-normalize.mjs';

export function haversineMeters(first, second) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tokenSet(value) {
  return new Set(normalizeComparisonText(value).split(' ').filter((token) => token.length > 2));
}

export function nameSimilarity(first, second) {
  const firstTokens = tokenSet(first);
  const secondTokens = tokenSet(second);
  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;
  const intersection = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  return intersection / Math.max(firstTokens.size, secondTokens.size);
}

export function detectDuplicateGroups(records) {
  const edges = [];
  const orderedIndexes = records
    .map((_, index) => index)
    .sort((first, second) => records[first].source_row - records[second].source_row);
  for (let firstPosition = 0; firstPosition < orderedIndexes.length; firstPosition += 1) {
    for (let secondPosition = firstPosition + 1; secondPosition < orderedIndexes.length; secondPosition += 1) {
      const firstIndex = orderedIndexes[firstPosition];
      const secondIndex = orderedIndexes[secondPosition];
      const first = records[firstIndex];
      const second = records[secondIndex];
      const signals = [];
      const conflicts = [];

      const firstAddress = normalizeComparisonText([
        first.candidate.address_line_1, first.candidate.address_line_2, first.candidate.city,
        first.candidate.region, first.candidate.postal_code, first.candidate.country_code
      ].join(' '));
      const secondAddress = normalizeComparisonText([
        second.candidate.address_line_1, second.candidate.address_line_2, second.candidate.city,
        second.candidate.region, second.candidate.postal_code, second.candidate.country_code
      ].join(' '));
      if (firstAddress && firstAddress === secondAddress) signals.push('normalized_address_exact');

      if (first.candidate.external_place_id
        && first.candidate.external_place_id === second.candidate.external_place_id) {
        signals.push('external_place_id_exact');
      }
      if (first.candidate.website_url
        && first.candidate.website_url === second.candidate.website_url) {
        signals.push('website_exact');
      }
      if (first.candidate.slug === second.candidate.slug) signals.push('base_slug_collision');
      if (first.candidate.venue_id === second.candidate.venue_id) signals.push('venue_id_collision');

      const distanceMeters = haversineMeters(first.candidate, second.candidate);
      const similarity = nameSimilarity(first.candidate.name, second.candidate.name);
      if (distanceMeters <= 100) signals.push(`coordinates_within_${Math.round(distanceMeters)}m`);
      if (similarity >= 0.75) signals.push(`name_similarity_${similarity.toFixed(2)}`);

      const strongSignal = signals.some((signal) => [
        'normalized_address_exact', 'external_place_id_exact', 'website_exact',
        'base_slug_collision', 'venue_id_collision'
      ].includes(signal));
      const weakPair = distanceMeters <= 100 && similarity >= 0.75;
      if (!strongSignal && !weakPair) continue;

      for (const field of ['name', 'address_line_1', 'address_line_2', 'city', 'region', 'postal_code', 'latitude', 'longitude', 'website_url', 'venue_type']) {
        if (String(first.candidate[field]) !== String(second.candidate[field])) {
          conflicts.push({
            field,
            first: first.candidate[field],
            second: second.candidate[field]
          });
        }
      }
      edges.push({ firstIndex, secondIndex, signals, conflicts, distanceMeters, similarity });
    }
  }

  const parents = records.map((_, index) => index);
  const find = (index) => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  const union = (first, second) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };
  edges.forEach((edge) => union(edge.firstIndex, edge.secondIndex));

  const groupedIndexes = new Map();
  edges.forEach((edge) => {
    const root = find(edge.firstIndex);
    if (!groupedIndexes.has(root)) groupedIndexes.set(root, new Set());
    groupedIndexes.get(root).add(edge.firstIndex);
    groupedIndexes.get(root).add(edge.secondIndex);
  });

  const groups = [...groupedIndexes.values()].map((indexes) => {
    const sortedIndexes = [...indexes].sort((first, second) => records[first].source_row - records[second].source_row);
    const primaryIndex = sortedIndexes[0];
    const relatedEdges = edges.filter((edge) => indexes.has(edge.firstIndex) && indexes.has(edge.secondIndex));
    return {
      duplicate_group_id: `dup_${stableHash(sortedIndexes.map((index) => records[index].source_key).join('|')).slice(0, 12)}`,
      source_rows: sortedIndexes.map((index) => records[index].source_row),
      source_keys: sortedIndexes.map((index) => records[index].source_key),
      proposed_primary_source_row: records[primaryIndex].source_row,
      proposed_primary_source_key: records[primaryIndex].source_key,
      matching_signals: [...new Set(relatedEdges.flatMap((edge) => edge.signals))].sort(),
      conflicts: relatedEdges.flatMap((edge) => edge.conflicts),
      matthew_decision_required: true,
      member_indexes: sortedIndexes,
      primary_index: primaryIndex
    };
  }).sort((first, second) => first.source_rows[0] - second.source_rows[0]);

  return groups;
}

function assignUniqueSlugs(records) {
  const bySlug = new Map();
  records.forEach((record, index) => {
    const slug = record.candidate.slug;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(index);
  });
  const collisions = [];
  for (const [baseSlug, indexes] of bySlug.entries()) {
    if (indexes.length === 1) continue;
    const sorted = [...indexes].sort((first, second) => records[first].source_key.localeCompare(records[second].source_key));
    collisions.push({
      base_slug: baseSlug,
      source_rows: sorted.map((index) => records[index].source_row)
    });
    sorted.forEach((index) => {
      records[index].candidate.slug = `${baseSlug}-${stableHash(records[index].source_key).slice(0, 8)}`;
    });
  }
  return collisions.sort((first, second) => first.base_slug.localeCompare(second.base_slug));
}

function buildAmbiguities(record) {
  const items = [];
  const row = record.source;
  if (record.classification.review_required) {
    items.push({
      source_row: record.source_row,
      source_key: record.source_key,
      code: 'CLASSIFICATION_REVIEW_REQUIRED',
      field: 'venue_type',
      automated_value: record.candidate.venue_type,
      source_value: [row.promo, row.details, row.affiliation].map(normalizeWhitespace).filter(Boolean).join(' | '),
      note: 'Recurring Cal-community evidence is incomplete or lower-confidence.'
    });
  }
  if (record.source_url_status === 'source_map_link') {
    items.push({
      source_row: record.source_row,
      source_key: record.source_key,
      code: 'SOURCE_URL_NOT_VENUE_WEBSITE',
      field: 'website_url',
      automated_value: '',
      source_value: normalizeWhitespace(row.url),
      note: 'Google Maps source links are retained only in private provenance and are not published as venue websites.'
    });
  } else if (record.source_url_status !== 'blank' && record.source_url_status !== 'valid') {
    items.push({
      source_row: record.source_row,
      source_key: record.source_key,
      code: 'INVALID_OR_UNSAFE_SOURCE_URL',
      field: 'website_url',
      automated_value: '',
      source_value: normalizeWhitespace(row.url),
      note: `URL status: ${record.source_url_status}.`
    });
  }
  const descriptiveSource = [row.promo, row.details, row.tvs, row.affiliation]
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join(' | ');
  if (descriptiveSource) {
    items.push({
      source_row: record.source_row,
      source_key: record.source_key,
      code: 'SOURCE_DESCRIPTION_EXCLUDED_PENDING_EDITORIAL_REVIEW',
      field: 'short_description',
      automated_value: '',
      source_value: descriptiveSource,
      note: 'Event-oriented, promotional, ownership, and community claims are not copied automatically into public editorial text.'
    });
  }
  if (record.disposition === 'held_for_review') {
    items.push({
      source_row: record.source_row,
      source_key: record.source_key,
      code: record.reason_code,
      field: 'disposition',
      automated_value: 'held_for_review',
      source_value: descriptiveSource,
      note: 'The source supports a physical venue but appears to describe a single historical event rather than durable recurring venue value.'
    });
  }
  if (!normalizeWhitespace(row.zip)) {
    items.push({
      source_row: record.source_row,
      source_key: record.source_key,
      code: 'MISSING_POSTAL_CODE',
      field: 'postal_code',
      automated_value: '',
      source_value: '',
      note: 'Postal code is conditionally required and must be reviewed before load.'
    });
  }
  return items;
}

export function migrateRows(sourceRows, options = {}) {
  const migrationTimestamp = options.migrationTimestamp || '2026-07-26T00:00:00Z';
  if (Number.isNaN(Date.parse(migrationTimestamp))) throw new Error('migrationTimestamp must be an ISO-8601 datetime.');
  const overrides = options.overrides || {};

  const records = sourceRows.map((source) => {
    const sourceRow = Number(source.source_row);
    const sourceKey = `v1_public_row_${String(sourceRow).padStart(4, '0')}`;
    const initialDisposition = inferInitialDisposition(source);
    const built = buildCandidate(source, migrationTimestamp);
    const record = {
      source_row: sourceRow,
      source_key: sourceKey,
      source,
      candidate: built.candidate,
      classification: built.classification,
      source_url_status: built.source_url_status,
      disposition: initialDisposition.disposition,
      reason_code: initialDisposition.reason_code,
      automated: true,
      manual_note: ''
    };
    return applyManualOverride(record, overrides[sourceKey] || overrides[String(sourceRow)]);
  });

  const duplicateGroups = detectDuplicateGroups(records);
  const slugCollisions = assignUniqueSlugs(records);
  for (const group of duplicateGroups) {
    for (const index of group.member_indexes) {
      if (index === group.primary_index) continue;
      if (records[index].automated && records[index].disposition === 'accepted') {
        records[index].disposition = 'probable_duplicate';
        records[index].reason_code = 'SUSPECTED_DUPLICATE_REQUIRES_REVIEW';
      }
    }
  }

  const acceptedRecords = records
    .filter((record) => record.disposition === 'accepted')
    .sort((first, second) => first.candidate.venue_id.localeCompare(second.candidate.venue_id));
  const acceptedVenues = acceptedRecords.map((record) => record.candidate);
  const rejected = records
    .filter((record) => record.disposition === 'rejected')
    .sort((first, second) => first.source_row - second.source_row);
  const held = records
    .filter((record) => record.disposition === 'held_for_review')
    .sort((first, second) => first.source_row - second.source_row);
  const duplicateRows = records
    .filter((record) => record.disposition === 'probable_duplicate')
    .sort((first, second) => first.source_row - second.source_row);
  const ambiguities = records.flatMap(buildAmbiguities)
    .sort((first, second) => first.source_row - second.source_row || first.code.localeCompare(second.code));

  const reconciliation = {
    total_v1_source_rows: records.length,
    proposed_accepted_venues: acceptedVenues.length,
    proposed_cal_bars: acceptedVenues.filter((venue) => venue.venue_type === 'cal_bar').length,
    proposed_community_locations: acceptedVenues.filter((venue) => venue.venue_type === 'community_location').length,
    held_for_matthew_review: held.length,
    rejected_records: rejected.length,
    suspected_duplicate_groups: duplicateGroups.length,
    rows_in_suspected_duplicate_groups: new Set(duplicateGroups.flatMap((group) => group.source_rows)).size,
    probable_duplicate_rows: duplicateRows.length,
    rows_excluded_from_candidate_dataset: held.length + rejected.length + duplicateRows.length,
    accounted_rows: records.length,
    all_source_rows_accounted_for_exactly_once: records.every((record) => [
      'accepted', 'probable_duplicate', 'held_for_review', 'rejected'
    ].includes(record.disposition))
      && records.length === acceptedVenues.length + held.length + rejected.length + duplicateRows.length
  };

  return {
    migration_timestamp: migrationTimestamp,
    records,
    accepted_records: acceptedRecords,
    accepted_venues: acceptedVenues,
    held_records: held,
    rejected_records: rejected,
    probable_duplicate_records: duplicateRows,
    duplicate_groups: duplicateGroups.map(({ member_indexes, primary_index, ...group }) => group),
    slug_collisions: slugCollisions,
    ambiguities,
    reconciliation
  };
}

export function buildPublicSnapshot(result, baseSnapshot, generatedAt = result.migration_timestamp) {
  const venues = result.accepted_venues.map((venue) => {
    const publicVenue = {};
    for (const field of PUBLIC_VENUE_FIELDS) publicVenue[field] = venue[field];
    return publicVenue;
  });
  const games = Array.isArray(baseSnapshot?.games) ? baseSnapshot.games : [];
  return {
    schemaVersion: '2.0',
    venues,
    games,
    watchParties: [],
    fanCounts: [],
    venueHistoryCounts: venues.map((venue) => ({ venue_id: venue.venue_id, past_game_count: 0 })),
    generatedAt
  };
}
