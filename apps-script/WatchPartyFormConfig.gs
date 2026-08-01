/**
 * Owner-only helper for resolving the finalized Watch Party Form prefill fields.
 * This does not submit a response or expose private response data.
 */
function inspectWatchPartyFormPrefillConfiguration() {
  const workbook = getWorkbook_();
  const responseSheet = workbook.getSheetByName(CGB_MINIMAL_WATCH_PARTY_RAW_TAB);
  if (!responseSheet) throw new Error('Missing tab: ' + CGB_MINIMAL_WATCH_PARTY_RAW_TAB);

  const formUrl = responseSheet.getFormUrl();
  if (!formUrl) throw new Error('Watch Party response tab is not linked to a Google Form.');

  const form = FormApp.openByUrl(formUrl);
  const items = form.getItems();
  const venueNameItem = findWatchPartyFormItemByTitle_(items, 'Venue Name');
  const gameItem = findWatchPartyFormItemByTitle_(
    items,
    'Which game or games will have a Watch Party here?'
  );
  const venueIdItem = findWatchPartyFormItemByTitle_(items, 'Venue ID (existing)');

  if (venueNameItem.getType() !== FormApp.ItemType.TEXT ||
      venueIdItem.getType() !== FormApp.ItemType.TEXT ||
      gameItem.getType() !== FormApp.ItemType.CHECKBOX) {
    throw new Error('Watch Party Form question types do not match the approved contract.');
  }

  const gameChoices = gameItem.asCheckboxItem().getChoices();
  if (!gameChoices.length) throw new Error('Watch Party game checkbox has no choices.');

  const samples = {
    venueName: 'CGB_PREFILL_VENUE_NAME',
    game: gameChoices[0].getValue(),
    venueId: 'CGB_PREFILL_VENUE_ID'
  };

  const response = form.createResponse()
    .withItemResponse(venueNameItem.asTextItem().createResponse(samples.venueName))
    .withItemResponse(gameItem.asCheckboxItem().createResponse([samples.game]))
    .withItemResponse(venueIdItem.asTextItem().createResponse(samples.venueId));
  const prefilledUrl = response.toPrefilledUrl();

  const result = {
    formUrl: String(prefilledUrl).split('?')[0],
    venueIdEntry: extractWatchPartyFormEntryId_(prefilledUrl, samples.venueId),
    venueNameEntry: extractWatchPartyFormEntryId_(prefilledUrl, samples.venueName),
    gameIdEntry: extractWatchPartyFormEntryId_(prefilledUrl, samples.game),
    sampleGameLabel: samples.game,
    prefilledUrl: prefilledUrl
  };

  if (!result.venueIdEntry || !result.venueNameEntry || !result.gameIdEntry) {
    throw new Error('Unable to resolve all required Watch Party Form entry IDs.');
  }

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function findWatchPartyFormItemByTitle_(items, title) {
  const normalizedTitle = String(title).trim().toLowerCase();
  const matches = items.filter(function(item) {
    return String(item.getTitle()).trim().toLowerCase() === normalizedTitle;
  });
  if (matches.length !== 1) {
    throw new Error('Expected exactly one Watch Party Form question titled: ' + title);
  }
  return matches[0];
}

function extractWatchPartyFormEntryId_(prefilledUrl, expectedValue) {
  const query = String(prefilledUrl).split('?')[1] || '';
  const pairs = query.split('&');
  for (let i = 0; i < pairs.length; i += 1) {
    const separator = pairs[i].indexOf('=');
    if (separator < 0) continue;
    const key = decodeURIComponent(pairs[i].slice(0, separator).replace(/\+/g, ' '));
    const value = decodeURIComponent(pairs[i].slice(separator + 1).replace(/\+/g, ' '));
    if (/^entry\.\d+$/.test(key) && value === expectedValue) return key;
  }
  return '';
}
