/**
 * Cal Golden Bars v2 external MapTiler venue creation.
 *
 * The combined joinExternalVenue action runs under the shared script lock in
 * FanIntent.gs. It creates a Venue only when the Fan Intent write can also be
 * completed, and returns only the canonical public Venue plus aggregate data.
 */

const CGB_EXTERNAL_SOURCE = 'maptiler';
const CGB_EXTERNAL_PLACE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const CGB_EXTERNAL_MAX_NAME_LENGTH = 180;
const CGB_EXTERNAL_MAX_ADDRESS_LENGTH = 600;
const CGB_EXTERNAL_FAN_HEADERS = Object.freeze([
  'fan_intent_id', 'browser_id', 'game_id', 'venue_id', 'status',
  'created_at', 'updated_at', 'archived_at'
]);
const CGB_US_REGION_CODES = Object.freeze({
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
  colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga',
  hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks',
  kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md', massachusetts: 'ma',
  michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo', montana: 'mt',
  nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
  'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd',
  ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri',
  'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn', texas: 'tx',
  utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa',
  'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy',
  'district of columbia': 'dc', 'puerto rico': 'pr', guam: 'gu',
  'american samoa': 'as', 'northern mariana islands': 'mp',
  'united states virgin islands': 'vi', 'u s virgin islands': 'vi'
});

function parseJoinExternalVenueRequest_(event) {
  const contents = event && event.postData && event.postData.contents;
  if (!contents) throw fanIntentError_('invalid_request');
  let payload;
  try {
    payload = JSON.parse(contents);
  } catch (error) {
    throw fanIntentError_('invalid_json');
  }
  return parseJoinExternalVenuePayload_(payload);
}

function parseJoinExternalVenuePayload_(payload) {
  const browserId = cleanExternalText_(payload && payload.browserId, 160);
  const gameId = cleanExternalText_(payload && payload.gameId, 80);
  const place = payload && payload.externalPlace;
  if (!place || typeof place !== 'object' || Array.isArray(place)) {
    throw externalVenueError_('invalid_external_place');
  }

  const source = cleanExternalText_(place.source, 40).toLowerCase();
  const placeId = cleanExternalText_(place.placeId, 200);
  const name = cleanExternalText_(place.name, CGB_EXTERNAL_MAX_NAME_LENGTH);
  const address = cleanExternalText_(place.address, CGB_EXTERNAL_MAX_ADDRESS_LENGTH);
  const addressLine1 = cleanExternalText_(place.addressLine1, 220);
  const addressLine2 = cleanExternalText_(place.addressLine2, 120);
  const city = cleanExternalText_(place.city, 140);
  const region = cleanExternalText_(place.region, 140);
  const postalCode = cleanExternalText_(place.postalCode, 32);
  const countryCode = cleanExternalText_(place.countryCode, 2).toUpperCase();
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  if (!CGB_BROWSER_ID_PATTERN.test(browserId)) throw fanIntentError_('invalid_browser_id');
  if (!isSafeCanonicalId_(gameId)) throw fanIntentError_('invalid_game_id');
  if (source !== CGB_EXTERNAL_SOURCE) throw externalVenueError_('unsupported_external_source');
  if (!CGB_EXTERNAL_PLACE_ID_PATTERN.test(placeId)) throw externalVenueError_('invalid_external_place_id');
  if (!name) throw externalVenueError_('invalid_external_name');
  if (!address || !addressLine1 || !city || !region || !/^[A-Z]{2}$/.test(countryCode)) {
    throw externalVenueError_('invalid_external_address');
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw externalVenueError_('invalid_external_coordinates');
  }

  const normalizedAddress = normalizeExternalAddressParts_({
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    city: city,
    region: region,
    postal_code: postalCode,
    country_code: countryCode
  });
  if (!normalizedAddress) throw externalVenueError_('invalid_external_address');

  return {
    action: 'joinExternalVenue',
    browserId: browserId,
    gameId: gameId,
    externalPlace: {
      source: source,
      placeId: placeId,
      name: name,
      address: address,
      addressLine1: addressLine1,
      addressLine2: addressLine2,
      city: city,
      region: region,
      postalCode: postalCode,
      countryCode: countryCode,
      latitude: latitude,
      longitude: longitude,
      normalizedAddress: normalizedAddress
    }
  };
}

function processJoinExternalVenueRequest_(request) {
  const workbook = getWorkbook_();
  request.gameId = resolveCanonicalId_(workbook, 'game', request.gameId);
  const now = new Date().toISOString();
  archiveCompletedFanIntentRowsUnlocked_(workbook, now);

  const games = readSheetObjects_(workbook, 'Games');
  const game = games.find(function(row) { return String(row.game_id) === request.gameId; });
  if (!game) throw fanIntentError_('game_not_found');
  if (game.game_status !== 'upcoming') throw fanIntentError_('game_not_open');

  const venueSheet = getRequiredSheet_(workbook, 'Venues');
  const venueTable = readSheetTable_(venueSheet);
  requireHeaders_(venueTable.headers, CGB_TABS.Venues, 'Venues');

  let venueRecord = findCanonicalExternalVenue_(venueTable.rows, request.externalPlace);
  let createdVenueRowNumber = null;
  let fanRollback = null;

  try {
    if (!venueRecord) {
      const venue = buildExternalVenueRecord_(venueTable.rows, request.externalPlace, now);
      createdVenueRowNumber = appendSheetObject_(venueSheet, venueTable.headers, venue);
      venueRecord = {
        rowNumber: createdVenueRowNumber,
        values: venueTable.headers.map(function(header) {
          return Object.prototype.hasOwnProperty.call(venue, header) ? venue[header] : '';
        }),
        object: venue
      };
    }

    if (venueRecord.object.publication_status !== 'published' || !hasValidVenueCoordinates_(venueRecord.object)) {
      throw externalVenueError_('external_venue_unavailable');
    }

    const fanResult = applyExternalFanIntent_(workbook, request, String(venueRecord.object.venue_id), now);
    fanRollback = fanResult.rollback;

    clearPublicSnapshotCache_();
    const venues = readSheetObjects_(workbook, 'Venues');
    const fanRows = readSheetObjects_(workbook, 'Fan_Intent');
    const publishedVenueIds = new Set(venues.filter(function(row) {
      return row.publication_status === 'published' && hasValidVenueCoordinates_(row);
    }).map(function(row) { return String(row.venue_id); }));
    const gameIds = new Set(games.map(function(row) { return String(row.game_id); }));
    const canonicalVenue = venues.find(function(row) {
      return String(row.venue_id) === String(venueRecord.object.venue_id);
    });
    if (!canonicalVenue) throw new Error('canonical_venue_missing_after_write');

    return {
      ok: true,
      action: 'joinExternalVenue',
      schemaVersion: CGB_SCHEMA_VERSION,
      venue: whitelist_(canonicalVenue, CGB_PUBLIC_FIELDS.Venues),
      selection: {
        game_id: request.gameId,
        venue_id: String(canonicalVenue.venue_id),
        status: 'attending'
      },
      fanCounts: buildFanCounts_(fanRows, publishedVenueIds, gameIds),
      venueHistoryCounts: buildVenueHistoryCounts_(fanRows, publishedVenueIds, gameIds),
      generatedAt: now
    };
  } catch (error) {
    if (fanRollback) rollbackExternalFanIntent_(workbook, fanRollback);
    if (createdVenueRowNumber) rollbackCreatedVenue_(venueSheet, createdVenueRowNumber);
    clearPublicSnapshotCache_();
    throw error;
  }
}

function findCanonicalExternalVenue_(rows, place) {
  const externalMatch = rows.find(function(record) {
    return String(record.object.external_source || '').toLowerCase() === place.source &&
      String(record.object.external_place_id || '') === place.placeId;
  });
  if (externalMatch) return externalMatch;

  return rows.find(function(record) {
    return normalizeExternalAddressParts_(record.object) === place.normalizedAddress;
  }) || null;
}

function buildExternalVenueRecord_(existingRows, place, now) {
  const venueId = createCanonicalEntityId_('venue');
  const slug = uniqueExternalVenueSlug_(existingRows, place.name, place.city);
  return {
    venue_id: venueId,
    slug: slug,
    name: place.name,
    address_line_1: place.addressLine1,
    address_line_2: place.addressLine2,
    city: place.city,
    region: place.region,
    postal_code: place.postalCode,
    country_code: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
    website_url: '',
    venue_type: 'community_location',
    verification_status: 'user_added',
    alumni_owned: 'unknown',
    external_source: place.source,
    external_place_id: place.placeId,
    short_description: '',
    photo_url: '',
    photo_credit: '',
    publication_status: 'published',
    source_submission_id: '',
    created_at: now,
    updated_at: now
  };
}

function uniqueExternalVenueSlug_(existingRows, name, city) {
  let base = slugifyExternalVenue_([name, city].filter(Boolean).join('-'));
  if (!base) base = 'community-location';
  base = base.slice(0, 70).replace(/-+$/g, '');
  const existing = new Set(existingRows.map(function(record) {
    return String(record.object.slug || '').toLowerCase();
  }));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(base + '-' + suffix)) suffix += 1;
  return base + '-' + suffix;
}

function slugifyExternalVenue_(value) {
  let text = String(value || '');
  try { text = text.normalize('NFKD'); } catch (_) {}
  return text
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function normalizeExternalComparableText_(value) {
  let text = cleanExternalText_(value, 240);
  try { text = text.normalize('NFKD'); } catch (_) {}
  return text
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeExternalRegion_(region, countryCode) {
  const normalized = normalizeExternalComparableText_(region);
  if (normalizeExternalComparableText_(countryCode) !== 'us') return normalized;
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  return CGB_US_REGION_CODES[normalized] || normalized;
}

function normalizeExternalAddressParts_(row) {
  const countryCode = row && row.country_code;
  const joined = [
    row && row.address_line_1,
    row && row.address_line_2,
    row && row.city,
    normalizeExternalRegion_(row && row.region, countryCode),
    row && row.postal_code,
    countryCode
  ].map(function(value) { return cleanExternalText_(value, 240); }).filter(Boolean).join(' ');
  let text = joined;
  try { text = text.normalize('NFKD'); } catch (_) {}
  return text
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave')
    .replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(suite)\b/g, 'ste')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function applyExternalFanIntent_(workbook, request, venueId, now) {
  const fanSheet = getRequiredSheet_(workbook, 'Fan_Intent');
  const table = readSheetTable_(fanSheet);
  requireHeaders_(table.headers, CGB_EXTERNAL_FAN_HEADERS, 'Fan_Intent');
  const rollback = { sheetName: 'Fan_Intent', updatedRows: [], appendedRowNumber: null };

  try {
    const matching = table.rows.filter(function(record) {
      return String(record.object.browser_id) === request.browserId &&
        String(record.object.game_id) === request.gameId;
    });
    const activeRows = matching.filter(function(record) { return record.object.status === 'attending'; });
    activeRows.sort(function(a, b) {
      return timestampValue_(b.object.updated_at) - timestampValue_(a.object.updated_at) || b.rowNumber - a.rowNumber;
    });
    const active = activeRows[0] || null;

    activeRows.slice(1).forEach(function(record) {
      updateExternalFanRecord_(fanSheet, table.headers, record, {
        status: 'withdrawn', updated_at: now, archived_at: ''
      }, rollback);
    });

    if (active) {
      updateExternalFanRecord_(fanSheet, table.headers, active, {
        venue_id: venueId, status: 'attending', updated_at: now, archived_at: ''
      }, rollback);
    } else {
      const reusable = matching.sort(function(a, b) {
        return timestampValue_(b.object.updated_at) - timestampValue_(a.object.updated_at) || b.rowNumber - a.rowNumber;
      })[0];
      if (reusable && reusable.object.status !== 'archived') {
        updateExternalFanRecord_(fanSheet, table.headers, reusable, {
          venue_id: venueId, status: 'attending', updated_at: now, archived_at: ''
        }, rollback);
      } else {
        rollback.appendedRowNumber = appendSheetObject_(fanSheet, table.headers, {
          fan_intent_id: createCanonicalEntityId_('fan_intent'),
          browser_id: request.browserId,
          game_id: request.gameId,
          venue_id: venueId,
          status: 'attending',
          created_at: now,
          updated_at: now,
          archived_at: ''
        });
      }
    }
    return { rollback: rollback };
  } catch (error) {
    rollbackExternalFanIntent_(workbook, rollback);
    throw error;
  }
}

function updateExternalFanRecord_(sheet, headers, record, changes, rollback) {
  rollback.updatedRows.push({ rowNumber: record.rowNumber, values: record.values.slice() });
  updateFanIntentRecord_(sheet, headers, record, changes);
}

function rollbackExternalFanIntent_(workbook, rollback) {
  if (!rollback) return;
  const sheet = getRequiredSheet_(workbook, rollback.sheetName);
  if (rollback.appendedRowNumber && sheet.getLastRow() >= rollback.appendedRowNumber) {
    sheet.deleteRow(rollback.appendedRowNumber);
  }
  rollback.updatedRows.slice().reverse().forEach(function(record) {
    sheet.getRange(record.rowNumber, 1, 1, record.values.length).setValues([record.values]);
  });
}

function rollbackCreatedVenue_(sheet, rowNumber) {
  if (rowNumber && sheet.getLastRow() >= rowNumber) sheet.deleteRow(rowNumber);
}

function appendSheetObject_(sheet, headers, object) {
  const rowNumber = sheet.getLastRow() + 1;
  const values = headers.map(function(header) {
    const value = Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '';
    return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'" + value : value;
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  return rowNumber;
}

function requireHeaders_(actual, required, tabName) {
  required.forEach(function(header) {
    if (actual.indexOf(header) < 0) throw new Error('Missing ' + tabName + ' column: ' + header);
  });
}

function cleanExternalText_(value, maximum) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum || 300);
}

function externalVenueError_(code) {
  const error = new Error(code);
  error.cgbCode = code;
  return error;
}
