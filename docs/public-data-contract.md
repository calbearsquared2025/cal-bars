# CGB v2 Public Data Contract

**Status:** Milestone 1 read-only contract  
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
  "generatedAt": "2026-07-26T12:00:00Z"
}
```

Record fields use the canonical snake_case names from the Data Dictionary. Collection names use the camelCase names above.

## ID rules

- IDs are opaque, immutable strings created once and never renumbered.
- Venue IDs use `ven_` followed by digits, for example `ven_000001`.
- Game IDs use `game_YYYY_NN`, for example `game_2026_01`.
- Watch Party IDs use `wp_` followed by digits, for example `wp_000001`.
- Venue names are never identifiers.
- Venue slugs use lowercase kebab case, are unique, and remain stable after publication unless a collision must be corrected.

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
- `opponent_short_name`
- `home_away`
- `game_date`
- `kickoff_at`
- `kickoff_status`
- `game_status`
- `updated_at`

When `kickoff_status = confirmed`, `kickoff_at` must be an absolute ISO-8601 timestamp. When `kickoff_status = tbd`, `kickoff_at` is empty.

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
{ "game_id": "game_2026_01", "venue_id": "ven_000001", "count": 3 }
```

`venueHistoryCounts` contains the number of distinct completed games with archived Fan Intent for each venue:

```json
{ "venue_id": "ven_000001", "past_game_count": 5 }
```

No browser-level Fan Intent record may appear in the public response.

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

Validation is performed by `scripts/validate-v2-data.mjs`.
