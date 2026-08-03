# CGB v2 Public Data Contract

**Status:** Canonical public read contract  
**Schema version:** `2.0`

This contract defines the only data shape the public website may receive from the v2 backend. The private Google Spreadsheet remains private and must never be published as CSV or returned row-for-row.

## Endpoint response

```json
{
  "schemaVersion": "2.0",
  "venues": [],
  "games": [],
  "watchParties": [],
  "fanCounts": [],
  "venueHistoryCounts": [],
  "idAliases": {
    "venues": {},
    "games": {}
  },
  "generatedAt": "2026-08-03T20:04:00Z"
}
```

Record fields use the canonical snake_case names from the private Data and Privacy Specification. Collection names use the camelCase names above.

## ID rules

Canonical IDs are opaque, immutable relationship keys. They must not encode dates, sequence numbers, locations, schedule order, or other business meaning.

- Venue: `venue_<24 lowercase hexadecimal characters>`
- Game: `game_<24 lowercase hexadecimal characters>`
- Watch Party: `wp_<24 lowercase hexadecimal characters>`
- Fan Intent, private only: `fi_<24 lowercase hexadecimal characters>`
- Watch Party submission, private only: `wps_<24 lowercase hexadecimal characters>`

Venue names are never identifiers. Venue slugs use lowercase kebab case, are unique, and remain stable after publication unless a collision must be corrected.

The August 3, 2026 migration reassigned the initial Venue and Game IDs. `idAliases` contains identifier-only permanent compatibility mappings for old Venue and Game IDs. The client and write services resolve an alias before canonical lookup. New records and relationships must store only canonical IDs.

## Public Venue fields

Required:

- `venue_id`
- `slug`
- `name`
- `address_line_1`
- `city`
- `region`
- `country_code`
- `latitude`
- `longitude`
- `venue_type`
- `verification_status`
- `alumni_owned`
- `updated_at`

Optional public fields:

- `address_line_2`
- `postal_code`
- `website_url`
- `short_description`
- `photo_url` — reserved for post-launch use
- `photo_credit` — reserved for post-launch use

Only rows with `publication_status = published` enter the public response. `publication_status` itself is not returned.

## Public Game fields

- `game_id`
- `season`
- `schedule_order`
- `opponent_name`
- `home_away`
- `game_date`
- `kickoff_at`
- `kickoff_status`
- `game_status`
- `updated_at`

Do not expose or maintain `opponent_short_name`. When `kickoff_status = confirmed`, `kickoff_at` must be an absolute ISO-8601 timestamp. When `kickoff_status = tbd`, `kickoff_at` is empty.

## Public Watch Party fields

- `watch_party_id`
- `venue_id`
- `game_id`
- `organizer_name`
- `organizer_type`
- `official_event_url`
- `source_type`
- `event_start_at`
- `age_policy`
- `sound_status`
- `restrictions_note`
- `game_day_note`
- `event_status`
- `updated_at`

Only rows with `publication_status = published` and `event_status = active` enter the public response. `source_submission_id`, `publication_status`, and `created_at` are private and omitted.

## Aggregate fields

`fanCounts` contains one record per active `game_id + venue_id` pair:

```json
{
  "game_id": "game_9e8f4860c6a256c0fae6007d",
  "venue_id": "venue_7cbf6f0f2c33a2462d3da467",
  "count": 3
}
```

`venueHistoryCounts` contains the number of distinct completed games with archived Fan Intent for each venue:

```json
{
  "venue_id": "venue_7cbf6f0f2c33a2462d3da467",
  "past_game_count": 5
}
```

No browser-level Fan Intent record may appear in the public response.

## Public alias fields

`idAliases.venues` and `idAliases.games` may expose only legacy-to-canonical identifier pairs. They must not contain names, addresses, contact information, browser identifiers, timestamps, workbook identifiers, raw responses, or administrative state.

Example:

```json
{
  "venues": {
    "ven_1360954160984546": "venue_7cbf6f0f2c33a2462d3da467"
  },
  "games": {
    "game_2026_01": "game_9e8f4860c6a256c0fae6007d"
  }
}
```

## Forbidden public fields and content

The public response must not include:

- `browser_id` or `fan_intent_id`
- raw form responses
- names or emails supplied only for administration
- reviewer notes or photo permission records
- workbook IDs, workbook URLs, or Apps Script configuration values
- `external_source` or `external_place_id`
- `source_submission_id`
- `publication_status`
- `created_at`

Validation is performed by `scripts/validate-v2-data.mjs`. The static fallback is canonicalized through the permanent public alias map before release validation and application state initialization.
