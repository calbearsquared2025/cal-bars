/**
 * Owner-only 2026 Cal football schedule helper.
 *
 * This file contains public schedule facts only. Run upsertOfficial2026Schedule()
 * manually from the spreadsheet-bound Apps Script editor to populate or refresh
 * the canonical Games tab. It is not exposed through doGet() or doPost().
 */

const CGB_OFFICIAL_2026_GAMES = Object.freeze([
  Object.freeze({
    game_id: 'game_2026_01', season: 2026, schedule_order: 1,
    opponent_name: 'UCLA', opponent_short_name: 'UCLA', home_away: 'home',
    game_date: '2026-09-05', kickoff_at: '2026-09-06T02:30:00Z',
    kickoff_status: 'confirmed', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_02', season: 2026, schedule_order: 2,
    opponent_name: 'Syracuse', opponent_short_name: 'Syracuse', home_away: 'away',
    game_date: '2026-09-12', kickoff_at: '2026-09-12T19:30:00Z',
    kickoff_status: 'confirmed', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_03', season: 2026, schedule_order: 3,
    opponent_name: 'Wagner', opponent_short_name: 'Wagner', home_away: 'home',
    game_date: '2026-09-19', kickoff_at: '2026-09-19T19:30:00Z',
    kickoff_status: 'confirmed', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_04', season: 2026, schedule_order: 4,
    opponent_name: 'Clemson', opponent_short_name: 'Clemson', home_away: 'home',
    game_date: '2026-09-25', kickoff_at: '2026-09-26T02:30:00Z',
    kickoff_status: 'confirmed', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_05', season: 2026, schedule_order: 5,
    opponent_name: 'UNLV', opponent_short_name: 'UNLV', home_away: 'away',
    game_date: '2026-10-03', kickoff_at: '2026-10-03T19:30:00Z',
    kickoff_status: 'confirmed', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_06', season: 2026, schedule_order: 6,
    opponent_name: 'Virginia Tech', opponent_short_name: 'Virginia Tech', home_away: 'home',
    game_date: '2026-10-10', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_07', season: 2026, schedule_order: 7,
    opponent_name: 'Wake Forest', opponent_short_name: 'Wake Forest', home_away: 'home',
    game_date: '2026-10-17', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_08', season: 2026, schedule_order: 8,
    opponent_name: 'SMU', opponent_short_name: 'SMU', home_away: 'away',
    game_date: '2026-10-24', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_09', season: 2026, schedule_order: 9,
    opponent_name: 'NC State', opponent_short_name: 'NC State', home_away: 'away',
    game_date: '2026-10-31', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_10', season: 2026, schedule_order: 10,
    opponent_name: 'Virginia', opponent_short_name: 'Virginia', home_away: 'away',
    game_date: '2026-11-14', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_11', season: 2026, schedule_order: 11,
    opponent_name: 'Stanford', opponent_short_name: 'Stanford', home_away: 'home',
    game_date: '2026-11-21', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  }),
  Object.freeze({
    game_id: 'game_2026_12', season: 2026, schedule_order: 12,
    opponent_name: 'Pittsburgh', opponent_short_name: 'Pittsburgh', home_away: 'home',
    game_date: '2026-11-28', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming'
  })
]);

const CGB_OFFICIAL_2026_FORM_CHOICES = Object.freeze([
  Object.freeze({ game_id: 'game_2026_01', label: 'UCLA at Cal — Sat, Sep 5' }),
  Object.freeze({ game_id: 'game_2026_02', label: 'Cal at Syracuse — Sat, Sep 12' }),
  Object.freeze({ game_id: 'game_2026_03', label: 'Wagner at Cal — Sat, Sep 19' }),
  Object.freeze({ game_id: 'game_2026_04', label: 'Clemson at Cal — Fri, Sep 25' }),
  Object.freeze({ game_id: 'game_2026_05', label: 'Cal at UNLV — Sat, Oct 3' }),
  Object.freeze({ game_id: 'game_2026_06', label: 'Virginia Tech at Cal — Sat, Oct 10' }),
  Object.freeze({ game_id: 'game_2026_07', label: 'Wake Forest at Cal — Sat, Oct 17' }),
  Object.freeze({ game_id: 'game_2026_08', label: 'Cal at SMU — Sat, Oct 24' }),
  Object.freeze({ game_id: 'game_2026_09', label: 'Cal at NC State — Sat, Oct 31' }),
  Object.freeze({ game_id: 'game_2026_10', label: 'Cal at Virginia — Sat, Nov 14' }),
  Object.freeze({ game_id: 'game_2026_11', label: 'Stanford at Cal — Sat, Nov 21' }),
  Object.freeze({ game_id: 'game_2026_12', label: 'Pittsburgh at Cal — Sat, Nov 28' })
]);

function upsertOfficial2026Schedule() {
  const workbook = getWorkbook_();
  const sheet = workbook.getSheetByName('Games');
  if (!sheet) throw new Error('Missing tab: Games');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(value) { return String(value).trim(); });
  CGB_TABS.Games.forEach(function(header) {
    if (headers.indexOf(header) < 0) throw new Error('Games header mismatch: ' + header);
  });

  const gameIdColumn = headers.indexOf('game_id');
  const existingIds = new Map();
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, gameIdColumn + 1, sheet.getLastRow() - 1, 1)
      .getDisplayValues()
      .forEach(function(row, index) {
        const gameId = String(row[0] || '').trim();
        if (gameId) existingIds.set(gameId, index + 2);
      });
  }

  const updatedAt = new Date().toISOString();
  const appendValues = [];
  CGB_OFFICIAL_2026_GAMES.forEach(function(game) {
    const row = Object.assign({}, game, { updated_at: updatedAt });
    const values = headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    });
    const rowNumber = existingIds.get(game.game_id);
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
    } else {
      appendValues.push(values);
    }
  });

  if (appendValues.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appendValues.length, headers.length)
      .setValues(appendValues);
  }

  clearPublicSnapshotCache_();
  return {
    ok: true,
    upserted_game_ids: CGB_OFFICIAL_2026_GAMES.map(function(game) { return game.game_id; }),
    confirmed_kickoffs: CGB_OFFICIAL_2026_GAMES.filter(function(game) {
      return game.kickoff_status === 'confirmed';
    }).length,
    tbd_kickoffs: CGB_OFFICIAL_2026_GAMES.filter(function(game) {
      return game.kickoff_status === 'tbd';
    }).length
  };
}

function getOfficial2026GameFormChoices() {
  return CGB_OFFICIAL_2026_FORM_CHOICES.map(function(choice) {
    return { game_id: choice.game_id, label: choice.label };
  });
}
