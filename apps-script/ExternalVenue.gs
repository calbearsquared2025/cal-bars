/**
 * Cal Golden Bars v2 external MapTiler venue creation.
 *
 * The combined joinExternalVenue action runs under the shared script lock in
 * FanIntent.gs. It creates a Venue only when the Fan Intent write can also be
 * completed, and returns only the canonical public Venue plus aggregate data.
 */

const CGB_EXTERNAL_SOURCE = 'maptiler';
const CGB_EXTERNAL_PLACE_ID_PATTERN = /^\S+\.[0-9]+$/;
const CGB_MAPTILER_API_KEY_PROPERTY = 'CGB_MAPTILER_API_KEY';
const CGB_MAPTILER_GEOCODING_URL = 'https://api.maptiler.com/geocoding/';
const CGB_MAPTILER_FETCH_TIMEOUT_SECONDS = 5;
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

  if (!CGB_BROWSER_ID_PATTERN.test(browserId)) throw fanIntentError_('invalid_browser_id');
  if (!isSafeCanonicalId_(gameId)) throw fanIntentError_('invalid_game_id');
  if (source !== CGB_EXTERNAL_SOURCE) throw externalVenueError_('unsupported_external_source');
  if (!CGB_EXTERNAL_PLACE_ID_PATTERN.test(placeId)) throw externalVenueError_('invalid_external_place_id');

  return {
    action: 'joinExternalVenue',
    browserId: browserId,
    gameId: gameId,
    externalPlace: {
      source: source,
      placeId: placeId
    }
  };
}

function processJoinExternalVenueRequest_(request) {
  const workbook = getWorkbook_();
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
  let verifiedPlace = null;
  let createdVenueRowNumber = null;
  let identityRollback = null;
  let fanRollback = null;

  try {
    if (!venueRecord) {
      verifiedPlace = verifyExternalPlaceWithMapTiler_(request.externalPlace);
      venueRecord = findCanonicalExternalVenue_(venueTable.rows, verifiedPlace);
      if (!venueRecord) {
        const venue = buildExternalVenueRecord_(venueTable.rows, verifiedPlace, now);
        createdVenueRowNumber = appendSheetObject_(venueSheet, venueTable.headers, venue);
        venueRecord = {
          rowNumber: createdVenueRowNumber,
          values: venueTable.headers.map(function(header) {
            return Object.prototype.hasOwnProperty.call(venue, header) ? venue[header] : '';
          }),
          object: venue
        };
      }
    }

    if (venueRecord.object.publication_status !== 'published' || !hasValidVenueCoordinates_(venueRecord.object)) {
      throw externalVenueError_('external_venue_unavailable');
    }

    const fanResult = applyExternalFanIntent_(workbook, request, String(venueRecord.object.venue_id), now);
    fanRollback = fanResult.rollback;

    if (verifiedPlace && !createdVenueRowNumber) {
      identityRollback = adoptVerifiedExternalVenueIdentity_(
        venueSheet,
        venueTable.headers,
        venueRecord,
        verifiedPlace,
        now
      );
    }

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
    if (identityRollback) rollbackExternalVenueIdentity_(venueSheet, identityRollback);
    if (fanRollback) rollbackExternalFanIntent_(workbook, fanRollback);
    if (createdVenueRowNumber) rollbackCreatedVenue_(venueSheet, createdVenueRowNumber);
    clearPublicSnapshotCache_();
    throw error;
  }
}

function authorizeMapTilerVerification() {
  const key = mapTilerVerificationKey_();
  if (!key) {
    throw new Error('Missing private Script Property: ' + CGB_MAPTILER_API_KEY_PROPERTY);
  }
  UrlFetchApp.getRequest(CGB_MAPTILER_GEOCODING_URL + 'country.1.json', {
    method: 'get'
  });
  return { ok: true, configured: true };
}

function mapTilerVerificationKey_() {
  return cleanExternalText_(
    PropertiesService.getScriptProperties().getProperty(CGB_MAPTILER_API_KEY_PROPERTY),
    500
  );
}

function fetchMapTilerFeatures_(query, key, querySuffix) {
  const url = CGB_MAPTILER_GEOCODING_URL +
    encodeURIComponent(query) +
    '.json?key=' + encodeURIComponent(key) +
    '&language=en' + (querySuffix || '');

  let response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Accept: 'application/json' },
      followRedirects: false,
      muteHttpExceptions: true,
      validateHttpsCertificates: true,
      timeoutSeconds: CGB_MAPTILER_FETCH_TIMEOUT_SECONDS
    });
  } catch (error) {
    throw externalVenueError_('external_venue_unavailable');
  }
  if (Number(response.getResponseCode()) !== 200) {
    throw externalVenueError_('external_venue_unavailable');
  }

  let payload;
  try {
    payload = JSON.parse(response.getContentText('UTF-8'));
  } catch (error) {
    throw externalVenueError_('external_venue_unavailable');
  }
  return payload && Array.isArray(payload.features) ? payload.features : [];
}

function verifyExternalPlaceWithMapTiler_(clientPlace) {
  const key = mapTilerVerificationKey_();
  if (!key) throw externalVenueError_('external_venue_unavailable');

  const features = fetchMapTilerFeatures_(clientPlace.placeId, key);
  const exactFeature = features.find(function(candidate) {
    return cleanExternalText_(candidate && candidate.id, 200) === clientPlace.placeId;
  });
  let verified = normalizeMapTilerFeatureForPublication_(exactFeature);
  if (!verified && exactFeature) {
    const canonicalName = cleanExternalText_(exactFeature.text || exactFeature.name, CGB_EXTERNAL_MAX_NAME_LENGTH);
    if (canonicalName) {
      const enrichedFeatures = fetchMapTilerFeatures_(
        canonicalName,
        key,
        '&limit=10&autocomplete=false&types=poi%2Caddress'
      );
      const enrichedFeature = enrichedFeatures.find(function(candidate) {
        return cleanExternalText_(candidate && candidate.id, 200) === clientPlace.placeId;
      });
      verified = normalizeMapTilerFeatureForPublication_(enrichedFeature);
    }
  }
  if (!verified) throw externalVenueError_('external_venue_unavailable');
  return verified;
}

function normalizeMapTilerFeatureForPublication_(feature) {
  if (!feature || typeof feature !== 'object') return null;
  const types = (Array.isArray(feature.place_type) ? feature.place_type : [feature.place_type])
    .filter(Boolean)
    .map(function(value) { return cleanExternalText_(value, 40).toLowerCase(); });
  if (types.indexOf('poi') < 0 && types.indexOf('address') < 0) return null;

  const placeId = cleanExternalText_(feature.id, 200);
  const coordinates = Array.isArray(feature.center)
    ? feature.center
    : feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)
      ? feature.geometry.coordinates
      : null;
  const longitude = coordinates && Number(coordinates[0]);
  const latitude = coordinates && Number(coordinates[1]);
  if (!CGB_EXTERNAL_PLACE_ID_PATTERN.test(placeId) ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }

  const hierarchy = [feature].concat(Array.isArray(feature.context) ? feature.context : []);
  const matches = function(item, prefix) {
    const idPrefix = cleanExternalText_(item && item.id, 120).split('.')[0].toLowerCase();
    const values = [];
    if (item && Array.isArray(item.place_type)) values.push.apply(values, item.place_type);
    else if (item && item.place_type) values.push(item.place_type);
    if (item && item.type) values.push(item.type);
    return idPrefix === prefix || values.some(function(value) {
      return cleanExternalText_(value, 40).toLowerCase() === prefix;
    });
  };
  const find = function(prefixes) {
    for (let index = 0; index < prefixes.length; index += 1) {
      const item = hierarchy.find(function(candidate) { return matches(candidate, prefixes[index]); });
      if (item) return item;
    }
    return null;
  };
  const text = function(item, maximum) {
    return cleanExternalText_(item && (item.text || item.place_name || item.name), maximum || 160);
  };

  const country = find(['country']);
  const rawCountryCode = cleanExternalText_(
    country && (country.short_code || country.properties && country.properties.short_code || country.country_code) ||
    feature.properties && (feature.properties.country_code || feature.properties.country) ||
    '',
    20
  );
  const countryCode = rawCountryCode.split('-').pop()
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return null;

  const cityTypes = countryCode === 'US'
    ? ['municipality', 'joint_municipality', 'place', 'locality']
    : ['place', 'municipality', 'joint_municipality', 'locality'];
  const designatedCity = hierarchy.find(function(item) {
    const designation = cleanExternalText_(
      item && (item.place_designation || item.properties && item.properties.place_designation),
      40
    ).toLowerCase();
    return ['city', 'town', 'village'].indexOf(designation) >= 0 &&
      cityTypes.some(function(prefix) { return matches(item, prefix); });
  });
  const city = text(designatedCity || find(cityTypes), 140);

  let region = '';
  if (countryCode === 'US') {
    const administrativeItems = hierarchy.filter(function(item) {
      return ['region', 'subregion', 'county'].some(function(prefix) { return matches(item, prefix); });
    });
    for (let index = 0; index < administrativeItems.length; index += 1) {
      const mapped = CGB_US_REGION_CODES[normalizeExternalComparableText_(text(administrativeItems[index], 140))];
      if (mapped) {
        region = mapped.toUpperCase();
        break;
      }
    }
  } else {
    region = text(find(['region', 'subregion', 'county']), 140);
  }
  const postalCode = text(find(['postal_code', 'postcode']), 32);

  const placeName = cleanExternalText_(
    feature.place_name || feature.matching_place_name,
    CGB_EXTERNAL_MAX_ADDRESS_LENGTH
  );
  const placeNameParts = placeName.split(',').map(function(part) {
    return cleanExternalText_(part, 240);
  }).filter(Boolean);
  const rawText = cleanExternalText_(feature.text || feature.name, CGB_EXTERNAL_MAX_NAME_LENGTH);
  const name = types.indexOf('address') >= 0
    ? cleanExternalText_([feature.address, rawText].filter(Boolean).join(' '), CGB_EXTERNAL_MAX_NAME_LENGTH)
    : rawText || placeNameParts[0];

  let addressLine1 = cleanExternalText_(
    feature.properties && (feature.properties.address_line_1 || feature.properties.street_address),
    220
  );
  if (!addressLine1 && types.indexOf('address') >= 0) {
    addressLine1 = cleanExternalText_([feature.address, rawText].filter(Boolean).join(' '), 220);
  }
  if (!addressLine1) {
    const comparableName = normalizeExternalComparableText_(name);
    addressLine1 = cleanExternalText_(placeNameParts.find(function(part) {
      return normalizeExternalComparableText_(part) !== comparableName;
    }), 220);
  }
  if (!name || !addressLine1 || !city || !region) return null;

  const countryName = text(country, 140) || countryCode;
  const address = cleanExternalText_([
    addressLine1,
    city,
    [region, postalCode].filter(Boolean).join(' '),
    countryName
  ].filter(Boolean).join(', '), CGB_EXTERNAL_MAX_ADDRESS_LENGTH);
  const normalizedAddress = normalizeExternalAddressParts_({
    address_line_1: addressLine1,
    address_line_2: '',
    city: city,
    region: region,
    postal_code: postalCode,
    country_code: countryCode
  });
  if (!address || !normalizedAddress) return null;

  return {
    source: CGB_EXTERNAL_SOURCE,
    placeId: placeId,
    name: name,
    address: address,
    addressLine1: addressLine1,
    addressLine2: '',
    city: city,
    region: region,
    postalCode: postalCode,
    countryCode: countryCode,
    latitude: latitude,
    longitude: longitude,
    normalizedAddress: normalizedAddress
  };
}

function findCanonicalExternalVenue_(rows, place) {
  const externalMatch = rows.find(function(record) {
    return String(record.object.external_source || '').toLowerCase() === place.source &&
      String(record.object.external_place_id || '') === place.placeId;
  });
  if (externalMatch) return externalMatch;
  if (!place.normalizedAddress) return null;

  return rows.find(function(record) {
    return normalizeExternalAddressParts_(record.object) === place.normalizedAddress;
  }) || null;
}

function adoptVerifiedExternalVenueIdentity_(sheet, headers, record, place, now) {
  if (!sheet || !record || !place || !place.normalizedAddress) return null;
  if (normalizeExternalAddressParts_(record.object) !== place.normalizedAddress) return null;

  const existingSource = cleanExternalText_(record.object.external_source, 40).toLowerCase();
  const existingPlaceId = cleanExternalText_(record.object.external_place_id, 200);
  if (existingSource || existingPlaceId) return null;

  const source = cleanExternalText_(place.source, 40).toLowerCase();
  const placeId = cleanExternalText_(place.placeId, 200);
  if (source !== CGB_EXTERNAL_SOURCE || !CGB_EXTERNAL_PLACE_ID_PATTERN.test(placeId)) return null;

  requireHeaders_(headers, ['external_source', 'external_place_id', 'updated_at'], 'Venues');
  const originalValues = record.values.slice();
  const values = record.values.slice();
  values[headers.indexOf('external_source')] = source;
  values[headers.indexOf('external_place_id')] = placeId;
  values[headers.indexOf('updated_at')] = now;
  sheet.getRange(record.rowNumber, 1, 1, headers.length).setValues([values]);

  record.values = values;
  record.object.external_source = source;
  record.object.external_place_id = placeId;
  record.object.updated_at = now;
  return { rowNumber: record.rowNumber, values: originalValues };
}

function rollbackExternalVenueIdentity_(sheet, rollback) {
  if (!rollback) return;
  sheet.getRange(rollback.rowNumber, 1, 1, rollback.values.length).setValues([rollback.values]);
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
