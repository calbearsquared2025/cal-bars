/**
 * Cal Golden Bars v2 anonymous Fan Intent write service.
 *
 * Public write responses contain only aggregate counts and the caller's active
 * game/venue selection. Browser identifiers and canonical Fan_Intent rows are
 * never returned.
 */

const CGB_FAN_INTENT_ACTIONS = Object.freeze(['join', 'withdraw', 'move']);
const CGB_BROWSER_ID_PATTERN = /^browser_[A-Za-z0-9_-]{16,128}$/;
const CGB_FAN_INTENT_LOCK_TIMEOUT_MS = 10000;

function doPost(event) {
  try {
    const request = parseFanIntentRequest_(event);
    const lock = LockService.getScriptLock();
    lock.waitLock(CGB_FAN_INTENT_LOCK_TIMEOUT_MS);
    try {
      return jsonResponse_(processFanIntentRequest_(request));
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error('Fan Intent write failed: ' + String(error && error.message || error));
    return jsonResponse_({
      ok: false,
      error: publicFanIntentError_(error),
      schemaVersion: CGB_SCHEMA_VERSION
    });
  }
}

function parseFanIntentRequest_(event) {
  const contents = event && event.postData && event.postData.contents;
  if (!contents) throw fanIntentError_('invalid_request');

  let payload;
  try {
    payload = JSON.parse(contents);
  } catch (error) {
    throw fanIntentError_('invalid_json');
  }

  const action = String(payload.action || '').trim();
  const browserId = String(payload.browserId || '').trim();
  const gameId = String(payload.gameId || '').trim();
  const venueId = String(payload.venueId || '').trim();

  if (CGB_FAN_INTENT_ACTIONS.indexOf(action) === -1) throw fanIntentError_('unsupported_action');
  if (!CGB_BROWSER_ID_PATTERN.test(browserId)) throw fanIntentError_('invalid_browser_id');
  if (!isSafeCanonicalId_(gameId)) throw fanIntentError_('invalid_game_id');
  if ((action === 'join' || action === 'move') && !isSafeCanonicalId_(venueId)) {
    throw fanIntentError_('invalid_venue_id');
  }
  if (action === 'withdraw' && venueId && !isSafeCanonicalId_(venueId)) {
    throw fanIntentError_('invalid_venue_id');
  }

  return {
    action: action,
    browserId: browserId,
    gameId: gameId,
    venueId: venueId
  };
}

function processFanIntentRequest_(request) {
  const workbook = getWorkbook_();
  const now = new Date().toISOString();
  archiveCompletedFanIntentRowsUnlocked_(workbook, now);

  const venues = readSheetObjects_(workbook, 'Venues');
  const games = readSheetObjects_(workbook, 'Games');
  const publishedVenueIds = new Set(venues.filter(function(row) {
    return row.publication_status === 'published' && hasValidVenueCoordinates_(row);
  }).map(function(row) { return String(row.venue_id); }));
  const gamesById = {};
  games.forEach(function(row) { gamesById[String(row.game_id)] = row; });

  const game = gamesById[request.gameId];
  if (!game) throw fanIntentError_('game_not_found');
  if ((request.action === 'join' || request.action === 'move') && game.game_status !== 'upcoming') {
    throw fanIntentError_('game_not_open');
  }
  if ((request.action === 'join' || request.action === 'move') && !publishedVenueIds.has(request.venueId)) {
    throw fanIntentError_('venue_not_found');
  }

  const fanSheet = getRequiredSheet_(workbook, 'Fan_Intent');
  const table = readSheetTable_(fanSheet);
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
    updateFanIntentRecord_(fanSheet, table.headers, record, {
      status: 'withdrawn',
      updated_at: now,
      archived_at: ''
    });
  });

  if (request.action === 'withdraw') {
    if (active && request.venueId && String(active.object.venue_id) !== request.venueId) {
      throw fanIntentError_('selection_conflict');
    }
    if (active) {
      updateFanIntentRecord_(fanSheet, table.headers, active, {
        status: 'withdrawn',
        updated_at: now,
        archived_at: ''
      });
    }
  } else if (active) {
    updateFanIntentRecord_(fanSheet, table.headers, active, {
      venue_id: request.venueId,
      status: 'attending',
      updated_at: now,
      archived_at: ''
    });
  } else {
    const reusable = matching.sort(function(a, b) {
      return timestampValue_(b.object.updated_at) - timestampValue_(a.object.updated_at) || b.rowNumber - a.rowNumber;
    })[0];
    if (reusable && reusable.object.status !== 'archived') {
      updateFanIntentRecord_(fanSheet, table.headers, reusable, {
        venue_id: request.venueId,
        status: 'attending',
        updated_at: now,
        archived_at: ''
      });
    } else {
      appendFanIntentRecord_(fanSheet, table.headers, {
        fan_intent_id: 'fi_' + Utilities.getUuid(),
        browser_id: request.browserId,
        game_id: request.gameId,
        venue_id: request.venueId,
        status: 'attending',
        created_at: now,
        updated_at: now,
        archived_at: ''
      });
    }
  }

  clearPublicSnapshotCache_();
  const rows = readSheetObjects_(workbook, 'Fan_Intent');
  const gameIds = new Set(games.map(function(row) { return String(row.game_id); }));
  const activeSelection = rows.find(function(row) {
    return String(row.browser_id) === request.browserId &&
      String(row.game_id) === request.gameId &&
      row.status === 'attending';
  });

  return {
    ok: true,
    action: request.action,
    schemaVersion: CGB_SCHEMA_VERSION,
    selection: activeSelection ? {
      game_id: String(activeSelection.game_id),
      venue_id: String(activeSelection.venue_id),
      status: 'attending'
    } : null,
    fanCounts: buildFanCounts_(rows, publishedVenueIds, gameIds),
    venueHistoryCounts: buildVenueHistoryCounts_(rows, publishedVenueIds, gameIds),
    generatedAt: now
  };
}

function archiveCompletedFanIntent_(workbook) {
  const lock = LockService.getScriptLock();
  lock.waitLock(CGB_FAN_INTENT_LOCK_TIMEOUT_MS);
  try {
    return archiveCompletedFanIntentRowsUnlocked_(workbook, new Date().toISOString());
  } finally {
    lock.releaseLock();
  }
}

function archiveCompletedFanIntentRowsUnlocked_(workbook, timestamp) {
  const games = readSheetObjects_(workbook, 'Games');
  const completedGameIds = new Set(games.filter(function(row) {
    return row.game_status === 'completed';
  }).map(function(row) { return String(row.game_id); }));
  if (completedGameIds.size === 0) return 0;

  const sheet = getRequiredSheet_(workbook, 'Fan_Intent');
  const table = readSheetTable_(sheet);
  let changed = 0;
  table.rows.forEach(function(record) {
    if (record.object.status !== 'attending') return;
    if (!completedGameIds.has(String(record.object.game_id))) return;
    updateFanIntentRecord_(sheet, table.headers, record, {
      status: 'archived',
      updated_at: timestamp,
      archived_at: timestamp
    });
    changed += 1;
  });
  if (changed > 0) clearPublicSnapshotCache_();
  return changed;
}

function getRequiredSheet_(workbook, tabName) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet) throw new Error('Missing required tab: ' + tabName);
  return sheet;
}

function readSheetTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0].map(function(value) { return String(value).trim(); }) : [];
  const rows = values.slice(1).map(function(valuesRow, index) {
    const object = {};
    headers.forEach(function(header, columnIndex) {
      object[header] = normalizeCellValue_(valuesRow[columnIndex]);
    });
    return { rowNumber: index + 2, values: valuesRow.slice(), object: object };
  }).filter(function(record) {
    return record.values.some(function(value) { return value !== '' && value !== null; });
  });
  return { headers: headers, rows: rows };
}

function updateFanIntentRecord_(sheet, headers, record, changes) {
  const values = record.values.slice();
  Object.keys(changes).forEach(function(field) {
    const column = headers.indexOf(field);
    if (column < 0) throw new Error('Missing Fan_Intent column: ' + field);
    values[column] = changes[field];
    record.object[field] = changes[field];
  });
  sheet.getRange(record.rowNumber, 1, 1, headers.length).setValues([values]);
  record.values = values;
}

function appendFanIntentRecord_(sheet, headers, record) {
  const values = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([values]);
}

function timestampValue_(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isSafeCanonicalId_(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,80}$/.test(value);
}

function fanIntentError_(code) {
  const error = new Error(code);
  error.cgbCode = code;
  return error;
}

function publicFanIntentError_(error) {
  const allowed = [
    'invalid_request', 'invalid_json', 'unsupported_action', 'invalid_browser_id',
    'invalid_game_id', 'invalid_venue_id', 'game_not_found', 'game_not_open',
    'venue_not_found', 'selection_conflict'
  ];
  const code = String(error && error.cgbCode || '');
  return allowed.indexOf(code) >= 0 ? code : 'write_failed';
}
