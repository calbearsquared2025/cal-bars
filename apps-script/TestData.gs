/**
 * Owner-only synthetic data helpers for Milestone 1.
 *
 * These functions are never exposed through doGet(). They operate only when run
 * manually from the Apps Script editor by the workbook owner.
 */

const CGB_TEST_VENUE_IDS = Object.freeze([
  'venue_e33853e8a13e5738466c945d',
  'venue_a19ab45870505a1cc4ab530f',
  'venue_2d58f2521610e5f2ed955e2f',
  'venue_c8aeb998b645cb66f24cfae0'
]);

const CGB_TEST_GAME_IDS = Object.freeze([
  'game_8286efb2555f03ae9c67b301',
  'game_ebb4f1874746087882bf6321',
  'game_d7bd4bac97cd622297f7899b'
]);

const CGB_TEST_WATCH_PARTY_IDS = Object.freeze([
  'wp_ff03592531670f78a7a05772',
  'wp_b8ef75f6c2d0f0179f9d8679'
]);

const CGB_TEST_FAN_INTENT_IDS = Object.freeze([
  'fi_000000000000000000000001',
  'fi_000000000000000000000002',
  'fi_000000000000000000000003',
  'fi_000000000000000000000004',
  'fi_000000000000000000000005',
  'fi_000000000000000000000006',
  'fi_000000000000000000000007',
  'fi_000000000000000000000008',
  'fi_000000000000000000000009'
]);

function seedTestData() {
  setupWorkbook();
  assertOnlyTestOrEmptyRows_();
  clearTestData();

  const now = '2026-07-26T12:00:00Z';
  const workbook = getWorkbook_();

  appendObjects_(workbook, 'Venues', [
    {
      venue_id: CGB_TEST_VENUE_IDS[0],
      slug: 'golden-bear-test-pub-berkeley',
      name: 'Golden Bear Test Pub',
      address_line_1: '100 Test Plaza',
      address_line_2: '',
      city: 'Berkeley',
      region: 'CA',
      postal_code: '94704',
      country_code: 'US',
      latitude: 37.8717,
      longitude: -122.2728,
      website_url: 'https://example.com/golden-bear-test-pub',
      venue_type: 'cal_bar',
      verification_status: 'cgb_reviewed',
      alumni_owned: 'unknown',
      external_source: '',
      external_place_id: '',
      short_description: 'Synthetic test record for the v2 data contract.',
      photo_url: '',
      photo_credit: '',
      publication_status: 'published',
      source_submission_id: '',
      created_at: now,
      updated_at: now
    },
    {
      venue_id: CGB_TEST_VENUE_IDS[1],
      slug: 'oski-test-taproom-oakland',
      name: 'Oski Test Taproom',
      address_line_1: '200 Sample Street',
      address_line_2: '',
      city: 'Oakland',
      region: 'CA',
      postal_code: '94612',
      country_code: 'US',
      latitude: 37.8044,
      longitude: -122.2712,
      website_url: 'https://example.com/oski-test-taproom',
      venue_type: 'cal_bar',
      verification_status: 'cgb_reviewed',
      alumni_owned: 'yes',
      external_source: '',
      external_place_id: '',
      short_description: 'Synthetic Cal Bar used for read-only prototype testing.',
      photo_url: '',
      photo_credit: '',
      publication_status: 'published',
      source_submission_id: '',
      created_at: now,
      updated_at: now
    },
    {
      venue_id: CGB_TEST_VENUE_IDS[2],
      slug: 'bear-territory-test-cafe-alameda',
      name: 'Bear Territory Test Cafe',
      address_line_1: '300 Fixture Avenue',
      address_line_2: '',
      city: 'Alameda',
      region: 'CA',
      postal_code: '94501',
      country_code: 'US',
      latitude: 37.7652,
      longitude: -122.2416,
      website_url: 'https://example.com/bear-territory-test-cafe',
      venue_type: 'community_location',
      verification_status: 'user_added',
      alumni_owned: 'unknown',
      external_source: '',
      external_place_id: '',
      short_description: 'Synthetic Community Location used for testing.',
      photo_url: '',
      photo_credit: '',
      publication_status: 'published',
      source_submission_id: '',
      created_at: now,
      updated_at: now
    },
    {
      venue_id: CGB_TEST_VENUE_IDS[3],
      slug: 'california-test-grill-san-francisco',
      name: 'California Test Grill',
      address_line_1: '400 Mockup Road',
      address_line_2: '',
      city: 'San Francisco',
      region: 'CA',
      postal_code: '94103',
      country_code: 'US',
      latitude: 37.7749,
      longitude: -122.4194,
      website_url: 'https://example.com/california-test-grill',
      venue_type: 'community_location',
      verification_status: 'user_added',
      alumni_owned: 'no',
      external_source: '',
      external_place_id: '',
      short_description: 'Synthetic location; not a production listing.',
      photo_url: '',
      photo_credit: '',
      publication_status: 'published',
      source_submission_id: '',
      created_at: now,
      updated_at: now
    }
  ]);

  appendObjects_(workbook, 'Games', [
    {
      game_id: CGB_TEST_GAME_IDS[0],
      season: 2025,
      schedule_order: 99,
      opponent_name: 'Historical Test Opponent',
      home_away: 'neutral',
      game_date: '2025-11-22',
      kickoff_at: '2025-11-22T20:00:00Z',
      kickoff_status: 'confirmed',
      game_status: 'completed',
      updated_at: now
    },
    {
      game_id: CGB_TEST_GAME_IDS[1],
      season: 2026,
      schedule_order: 1,
      opponent_name: 'Test State',
      home_away: 'home',
      game_date: '2026-09-05',
      kickoff_at: '2026-09-05T19:30:00Z',
      kickoff_status: 'confirmed',
      game_status: 'upcoming',
      updated_at: now
    },
    {
      game_id: CGB_TEST_GAME_IDS[2],
      season: 2026,
      schedule_order: 2,
      opponent_name: 'Example University',
      home_away: 'away',
      game_date: '2026-09-12',
      kickoff_at: '',
      kickoff_status: 'tbd',
      game_status: 'upcoming',
      updated_at: now
    }
  ]);

  appendObjects_(workbook, 'Watch_Parties', [
    {
      watch_party_id: CGB_TEST_WATCH_PARTY_IDS[0],
      venue_id: CGB_TEST_VENUE_IDS[0],
      game_id: CGB_TEST_GAME_IDS[1],
      organizer_name: 'Berkeley Test Alumni Group',
      organizer_type: 'alumni_group',
      official_event_url: 'https://example.com/events/wp-000001',
      source_type: 'cgb_added',
      event_start_at: '2026-09-05T18:30:00Z',
      age_policy: 'all_ages',
      sound_status: 'confirmed_on',
      restrictions_note: 'Synthetic test event; no reservation required.',
      game_day_note: 'Arrive early for the test workflow.',
      event_status: 'active',
      publication_status: 'published',
      source_submission_id: '',
      created_at: now,
      updated_at: now
    },
    {
      watch_party_id: CGB_TEST_WATCH_PARTY_IDS[1],
      venue_id: CGB_TEST_VENUE_IDS[2],
      game_id: CGB_TEST_GAME_IDS[2],
      organizer_name: 'CGB Test Organizer',
      organizer_type: 'individual',
      official_event_url: '',
      source_type: 'cgb_added',
      event_start_at: '',
      age_policy: 'unknown',
      sound_status: 'unknown',
      restrictions_note: '',
      game_day_note: 'Time will be updated after kickoff is announced.',
      event_status: 'active',
      publication_status: 'published',
      source_submission_id: '',
      created_at: now,
      updated_at: now
    }
  ]);

  const intents = [];
  let fanIntentIndex = 0;
  fanIntentIndex = addTestIntents_(intents, CGB_TEST_GAME_IDS[1], CGB_TEST_VENUE_IDS[0], 'attending', 3, now, fanIntentIndex);
  fanIntentIndex = addTestIntents_(intents, CGB_TEST_GAME_IDS[1], CGB_TEST_VENUE_IDS[1], 'attending', 1, now, fanIntentIndex);
  fanIntentIndex = addTestIntents_(intents, CGB_TEST_GAME_IDS[2], CGB_TEST_VENUE_IDS[2], 'attending', 2, now, fanIntentIndex);
  fanIntentIndex = addTestIntents_(intents, CGB_TEST_GAME_IDS[0], CGB_TEST_VENUE_IDS[0], 'archived', 1, now, fanIntentIndex);
  fanIntentIndex = addTestIntents_(intents, CGB_TEST_GAME_IDS[0], CGB_TEST_VENUE_IDS[1], 'archived', 1, now, fanIntentIndex);
  addTestIntents_(intents, CGB_TEST_GAME_IDS[0], CGB_TEST_VENUE_IDS[2], 'archived', 1, now, fanIntentIndex);
  appendObjects_(workbook, 'Fan_Intent', intents);

  clearPublicSnapshotCache_();
  return buildPublicSnapshotForReview();
}

function clearTestData() {
  const workbook = getWorkbook_();
  deleteRowsById_(workbook, 'Fan_Intent', 'fan_intent_id', function(value) {
    return CGB_TEST_FAN_INTENT_IDS.indexOf(String(value)) !== -1;
  });
  deleteRowsById_(workbook, 'Watch_Parties', 'watch_party_id', function(value) {
    return CGB_TEST_WATCH_PARTY_IDS.indexOf(String(value)) !== -1;
  });
  deleteRowsById_(workbook, 'Games', 'game_id', function(value) {
    return CGB_TEST_GAME_IDS.indexOf(String(value)) !== -1;
  });
  deleteRowsById_(workbook, 'Venues', 'venue_id', function(value) {
    return CGB_TEST_VENUE_IDS.indexOf(String(value)) !== -1;
  });
  clearPublicSnapshotCache_();
}

function assertOnlyTestOrEmptyRows_() {
  const workbook = getWorkbook_();
  const checks = [
    ['Venues', 'venue_id', function(value) { return CGB_TEST_VENUE_IDS.indexOf(String(value)) !== -1; }],
    ['Games', 'game_id', function(value) { return CGB_TEST_GAME_IDS.indexOf(String(value)) !== -1; }],
    ['Watch_Parties', 'watch_party_id', function(value) { return CGB_TEST_WATCH_PARTY_IDS.indexOf(String(value)) !== -1; }],
    ['Fan_Intent', 'fan_intent_id', function(value) { return CGB_TEST_FAN_INTENT_IDS.indexOf(String(value)) !== -1; }]
  ];

  checks.forEach(function(check) {
    const rows = readSheetObjects_(workbook, check[0]);
    const unexpected = rows.filter(function(row) { return !check[2](row[check[1]]); });
    if (unexpected.length > 0) {
      throw new Error(
        'Refusing to seed test data because tab ' + check[0] +
        ' contains non-test rows. Remove them manually or use the existing data.'
      );
    }
  });
}

function addTestIntents_(target, gameId, venueId, status, count, timestamp, startingIndex) {
  let nextIndex = startingIndex;
  for (let index = 0; index < count; index += 1) {
    const fanIntentId = CGB_TEST_FAN_INTENT_IDS[nextIndex];
    if (!fanIntentId) throw new Error('Insufficient canonical test Fan Intent IDs.');
    nextIndex += 1;
    target.push({
      fan_intent_id: fanIntentId,
      browser_id: 'browser_test_' + String(nextIndex).padStart(16, '0'),
      game_id: gameId,
      venue_id: venueId,
      status: status,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: status === 'archived' ? timestamp : ''
    });
  }
  return nextIndex;
}

function appendObjects_(workbook, tabName, rows) {
  if (!rows.length) return;
  const headers = CGB_TABS[tabName];
  const sheet = workbook.getSheetByName(tabName);
  const values = rows.map(function(row) {
    return headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function deleteRowsById_(workbook, tabName, idField, predicate) {
  const sheet = workbook.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const idColumn = headers.indexOf(idField) + 1;
  if (idColumn < 1) throw new Error('Missing ID column ' + idField + ' in tab ' + tabName + '.');

  const ids = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    if (predicate(ids[index][0])) sheet.deleteRow(index + 2);
  }
}
