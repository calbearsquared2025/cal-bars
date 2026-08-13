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
  "venueSeasonCounts": [],
  "generatedAt": "2026-08-03T20:04:00Z"
}
```

Record fields use the canonical snake_case names from the private Data and Privacy Specification. Collection names use the camelCase names above.

The live endpoint includes `venueSeasonCounts`. Older last-known-good or static fallback snapshots created before this field was introduced may omit it; the client treats an omitted collection as an empty array.

## ID rules

Canonical IDs are opaque, immutable relationship keys. They must not encode dates, sequence numbers, locations, schedule order, or other business meaning.

- Venue: `venue_<24 lowercase hexadecimal characters>`
- Game: `game_<24 lowercase hexadecimal characters>`
- Watch Party: `wp_<24 lowercase hexadecimal characters>`
- Fan Intent, private only: `fi_<24 lowercase hexadecimal characters>`
- Watch Party submission, private only: `wps_<24 lowercase hexadecimal characters>`

Venue names are never identifiers. Venue slugs use lowercase kebab case, are unique, and remain stable after publication unless a collision must be corrected.

The August 3, 2026 canonical-ID migration is complete. Public snapshots, browser state, direct links, and new writes now use canonical IDs only. Legacy Venue and Game alias mappings are retired and are not part of the public contract.

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
- `photo_url` — approved primary venue photo; use the stable public site asset URL, normally under `assets/venues/`
- `photo_caption` — edited public caption; source Form text does not publish automatically
- `photo_credit` — optional public attribution identity
- `photo_credit_url` — optional HTTP(S) profile or website for the credited identity

A Venue supports one public primary photo. A later approved photo may replace it. Approved public images are optimized static GitHub Pages assets; raw Google Form/Drive uploads are intake-only and must not be hotlinked or exposed through this contract.

The private workbook's `Venue_Photos` publication-control tab is the sole source of all four public photo fields. It has exactly these columns, in order: `venue_id`, `photo_url`, `photo_caption`, `photo_credit`, `photo_credit_url`, `publication_status`, `updated_at`. It is an admin/storage detail, not a fifth core entity, and does not create a top-level public collection or a second frontend request.

Each row relates to an existing Venue by canonical `venue_id`; names are never relationship keys. Only a single `published` row may apply to a Venue. `draft` and `archived` rows do not affect public output. A published row requires an HTTP(S) `photo_url`; `photo_credit_url` must be empty or HTTP(S), and caption and credit are optional strings. Unknown Venue IDs, malformed URLs, or duplicate published rows are omitted safely, leaving the Venue public with empty photo fields and its normal no-photo fallback.

The existing physical `Venues.photo_url` and `Venues.photo_credit` columns remain temporarily for workbook compatibility, but the public read layer ignores their values and operators do not maintain them. `Venue_Photos` has precedence and is the only editable publication source; `photo_caption` and `photo_credit_url` are not added to the physical `Venues` schema.

Only Venue rows with `publication_status = published` enter the public response. Venue and photo `publication_status` values are not returned. The read layer always returns the four optional photo properties, using empty strings when no valid published photo row applies.

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

`venueHistoryCounts` contains the number of distinct completed games with archived Fan Intent for each venue. It remains in the response for compatibility but is not the approved public season-history copy source:

```json
{
  "venue_id": "venue_7cbf6f0f2c33a2462d3da467",
  "past_game_count": 5
}
```

`venueSeasonCounts` contains the cumulative number of archived Bear selections at a venue across completed games in one season. This is a directional anonymous activity total, not an attendee list or unique-person count across the full season:

```json
{
  "season": 2026,
  "venue_id": "venue_7cbf6f0f2c33a2462d3da467",
  "count": 12
}
```

The client displays the selected season total as **12 Bears watched Cal games here this season.** Until that aggregate exists, any migrated Venue description with reviewed Cal-game or watch-party history is standardized to the approved fallback, even when the older sentence omitted the year:

> Bears watched Cal games here in 2025.
>
> Be part of the 2026 season.

No browser-level Fan Intent record may appear in the public response.

## Forbidden public fields and content

The public response must not include:

- `browser_id` or `fan_intent_id`
- raw form responses or `Photo_Submissions_Raw` rows
- raw photo file references or Google Drive file IDs
- submitter names or emails supplied only for administration
- reviewer notes, review state, or photo permission records
- workbook IDs, workbook URLs, or Apps Script configuration values
- `external_source` or `external_place_id`
- `source_submission_id`
- `publication_status`
- `created_at`
- `idAliases`

`Venue_Photos` rows themselves are also forbidden. Only the four explicitly whitelisted photo values may be merged into a public Venue object.

Validation is performed by `scripts/validate-v2-data.mjs`. The deployable fallback and runtime state must already contain canonical IDs; the client does not rewrite legacy identifiers.
