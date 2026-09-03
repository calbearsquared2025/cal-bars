/**
 * External venue contribution path used when a fan is adding a real place for
 * a Watch Party but is not committing Fan Intent attendance.
 *
 * This reuses the verified MapTiler matching and canonical Venue creation
 * helpers in ExternalVenue.gs while deliberately avoiding attendance writes.
 */

function parseAddExternalVenueRequest_(event) {
  const contents = event && event.postData && event.postData.contents;
  if (!contents) throw fanIntentError_('invalid_request');

  let payload;
  try {
    payload = JSON.parse(contents);
  } catch (error) {
    throw fanIntentError_('invalid_json');
  }
  return parseAddExternalVenuePayload_(payload);
}

function parseAddExternalVenuePayload_(payload) {
  const gameId = cleanExternalText_(payload && payload.gameId, 80);
  const place = payload && payload.externalPlace;
  if (!place || typeof place !== 'object' || Array.isArray(place)) {
    throw externalVenueError_('invalid_external_place');
  }

  const source = cleanExternalText_(place.source, 40).toLowerCase();
  const placeId = cleanExternalText_(place.placeId, 200);
  const name = cleanExternalText_(place.name, CGB_EXTERNAL_MAX_NAME_LENGTH);

  if (!isSafeCanonicalId_(gameId)) throw fanIntentError_('invalid_game_id');
  if (source !== CGB_EXTERNAL_SOURCE) throw externalVenueError_('unsupported_external_source');
  if (!CGB_EXTERNAL_PLACE_ID_PATTERN.test(placeId)) throw externalVenueError_('invalid_external_place_id');

  return {
    action: 'addExternalVenue',
    gameId: gameId,
    externalPlace: {
      source: source,
      placeId: placeId,
      name: name
    }
  };
}

function processAddExternalVenueRequest_(request) {
  const workbook = getWorkbook_();
  const now = new Date().toISOString();
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

  try {
    if (!venueRecord) {
      verifiedPlace = verifyExternalPlaceWithMapTiler_(request.externalPlace);
      venueRecord = findCanonicalExternalVenue_(venueTable.rows, verifiedPlace);
      if (!venueRecord) {
        verifiedPlace = applyRequestedExternalVenueName_(verifiedPlace, request.externalPlace);
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

    if (verifiedPlace && !createdVenueRowNumber) {
      identityRollback = adoptVerifiedExternalVenueIdentity_(
        venueSheet,
        venueTable.headers,
        venueRecord,
        verifiedPlace,
        now
      );
    }

    if (createdVenueRowNumber || identityRollback) clearPublicSnapshotCache_();
    const venues = readSheetObjects_(workbook, 'Venues');
    const canonicalVenue = venues.find(function(row) {
      return String(row.venue_id) === String(venueRecord.object.venue_id);
    });
    if (!canonicalVenue) throw new Error('canonical_venue_missing_after_write');

    return {
      ok: true,
      action: 'addExternalVenue',
      schemaVersion: CGB_SCHEMA_VERSION,
      venue: whitelist_(canonicalVenue, CGB_PUBLIC_FIELDS.Venues),
      generatedAt: now
    };
  } catch (error) {
    if (identityRollback) rollbackExternalVenueIdentity_(venueSheet, identityRollback);
    if (createdVenueRowNumber) rollbackCreatedVenue_(venueSheet, createdVenueRowNumber);
    if (createdVenueRowNumber || identityRollback) clearPublicSnapshotCache_();
    throw error;
  }
}
