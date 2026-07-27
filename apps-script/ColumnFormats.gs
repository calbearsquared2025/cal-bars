/**
 * Owner-only normalization for canonical date-only and text columns.
 *
 * Run this after setupWorkbook(). It corrects existing Sheet-coerced values and
 * applies plain-text formatting so future postal codes and game dates retain the
 * public contract shape.
 */
function normalizeCanonicalTextColumns() {
  const workbook = getWorkbook_();
  const timeZone = workbook.getSpreadsheetTimeZone() || 'Etc/UTC';

  normalizeTextColumn_(workbook, 'Venues', 'postal_code', function(value) {
    if (value === '' || value === null || value === undefined) return '';
    return String(value).trim();
  });

  normalizeTextColumn_(workbook, 'Games', 'game_date', function(value) {
    if (value === '' || value === null || value === undefined) return '';
    if (value instanceof Date) {
      return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
    }
    const text = String(value).trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) {
      throw new Error('Games.game_date must use YYYY-MM-DD: ' + text);
    }
    return match[1];
  });

  clearPublicSnapshotCache_();
  return buildPublicSnapshotForReview();
}

function normalizeTextColumn_(workbook, tabName, headerName, normalizeValue) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet) throw new Error('Missing required tab: ' + tabName);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); });
  const columnIndex = headers.indexOf(headerName) + 1;
  if (columnIndex < 1) {
    throw new Error('Missing required column ' + tabName + '.' + headerName);
  }

  const formatRows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, columnIndex, formatRows, 1).setNumberFormat('@');

  const dataRows = sheet.getLastRow() - 1;
  if (dataRows < 1) return;

  const range = sheet.getRange(2, columnIndex, dataRows, 1);
  const values = range.getValues().map(function(row) {
    return [normalizeValue(row[0])];
  });
  range.setNumberFormat('@');
  range.setValues(values);
}
