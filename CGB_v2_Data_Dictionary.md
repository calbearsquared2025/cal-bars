# Cal Golden Bars v2.0 — Data Dictionary

**Status:** Final for functional prototype  
**Date:** July 25, 2026

## 1. Data architecture

Use one private Google Spreadsheet containing multiple purpose-built tabs.

### Canonical tabs

- `Venues`
- `Games`
- `Watch_Parties`
- `Fan_Intent`

### Raw and administrative tabs

- `Cal_Bar_Nominations_Raw`
- `Watch_Party_Submissions_Raw`
- `Listing_Updates_Raw`
- `Photo_Submissions_Raw`
- `Missing_Location_Suggestions_Raw`

The full workbook remains private. Apps Script exposes only approved public fields.

## 2. Relationships

```text
Venue
  ├──< Watch Party >── Game
  └──< Fan Intent  >── Game

Cal Bar Nomination ──> may update Venue
Watch Party Submission ──> automatically creates Watch Party row(s)
Photo Submission ──> may update Venue after review
Listing Update ──> may update Venue or Watch Party
```

Rules:

- One venue may host many Watch Parties.
- One game may have many Watch Parties.
- One Watch Party row represents one venue and one game.
- One browser may have only one active Fan Intent per game.
- A venue’s historical activity is derived from Fan Intent, not manually entered.
- A Community Location may be promoted to a Cal Bar without changing its ID.

## 3. `Venues`

One row represents one persistent physical location.

| Field | Type | Required | Public | Definition |
|---|---|---:|---:|---|
| `venue_id` | Text | Yes | Yes | Immutable internal identifier |
| `slug` | Text | Yes | Yes | Stable URL slug |
| `name` | Text | Yes | Yes | Public venue name |
| `address_line_1` | Text | Yes | Yes | Street address |
| `address_line_2` | Text | No | Yes | Unit, suite, or floor |
| `city` | Text | Yes | Yes | City |
| `region` | Text | Yes | Yes | State, province, or region |
| `postal_code` | Text | Conditional | Yes | Postal code when applicable |
| `country_code` | Text | Yes | Yes | ISO two-letter country code |
| `latitude` | Decimal | Yes | Yes | Map latitude |
| `longitude` | Decimal | Yes | Yes | Map longitude |
| `website_url` | URL | No | Yes | Venue website |
| `venue_type` | Enum | Yes | Yes | `cal_bar` or `community_location` |
| `verification_status` | Enum | Yes | Yes | `cgb_reviewed` or `user_added` |
| `alumni_owned` | Enum | Yes | Yes | `yes`, `no`, or `unknown` |
| `external_source` | Text | No | No | Example: `maptiler` |
| `external_place_id` | Text | No | No | Provider place identifier |
| `short_description` | Text | No | Yes | Edited public venue blurb |
| `venue_tags` | Controlled tag list | No | Yes | Positive persistent community observations; canonical values only |
| `photo_url` | URL | No | Yes | Approved public photo |
| `photo_credit` | Text | No | Yes | Attribution when applicable |
| `publication_status` | Enum | Yes | No | `published`, `draft`, or `archived` |
| `source_submission_id` | Text | No | No | Submission that created the venue, when applicable |
| `created_at` | Datetime | Yes | No | Record creation time |
| `updated_at` | Datetime | Yes | Yes | Last material update |

### Controlled values

```text
venue_type:
cal_bar
community_location

verification_status:
cgb_reviewed
user_added

alumni_owned:
yes
no
unknown

publication_status:
published
draft
archived

venue_tags:
21_plus
audio_on
food
cal_beer
large_crowd
cal_memorabilia
```

### Creation rules

An external venue selected through **I’ll be here** is immediately created as:

```text
venue_type = community_location
verification_status = user_added
publication_status = published
```

A Cal Bar nomination may later change:

```text
venue_type = cal_bar
verification_status = cgb_reviewed
```

## 4. `Games`

One row represents one Cal football game.

| Field | Type | Required | Public | Definition |
|---|---|---:|---:|---|
| `game_id` | Text | Yes | Yes | Immutable game identifier |
| `season` | Integer | Yes | Yes | Season year |
| `schedule_order` | Integer | Yes | Yes | Order in season |
| `opponent_name` | Text | Yes | Yes | Full opponent name |
| `opponent_short_name` | Text | No | Yes | Compact display name |
| `home_away` | Enum | Yes | Yes | `home`, `away`, or `neutral` |
| `game_date` | Date | Yes | Yes | Official game date |
| `kickoff_at` | Datetime | Conditional | Yes | Absolute kickoff timestamp |
| `kickoff_status` | Enum | Yes | Yes | `confirmed` or `tbd` |
| `game_status` | Enum | Yes | Yes | `upcoming`, `completed`, `postponed`, or `cancelled` |
| `updated_at` | Datetime | Yes | Yes | Last schedule update |

Kickoff is stored as an absolute timestamp and localized in the browser.

## 5. `Watch_Parties`

One row represents one user-submitted organized gathering at one venue for one game.

| Field | Type | Required | Public | Definition |
|---|---|---:|---:|---|
| `watch_party_id` | Text | Yes | Yes | Immutable event identifier |
| `venue_id` | Foreign key | Yes | Yes | References `Venues.venue_id` |
| `game_id` | Foreign key | Yes | Yes | References `Games.game_id` |
| `organizer_name` | Text | Yes | Yes | Host shown after **Hosted by** |
| `organizer_type` | Enum | Yes | Yes | Organizer category |
| `official_event_url` | URL | No | Yes | Event or organizer link |
| `source_type` | Enum | Yes | Yes | How the record entered CGB |
| `event_start_at` | Datetime | No | Yes | Arrival or event start time |
| `age_policy` | Enum | Yes | Yes | Age restrictions |
| `sound_status` | Enum | Yes | Yes | Game-audio information |
| `restrictions_note` | Text | No | Yes | Reservations, capacity, entry, or seating notes |
| `game_day_note` | Text | No | Yes | Other useful details |
| `feature_tags` | Controlled tag list | No | Yes | Event-only positive features: `rsvp_requested`, `cal_specials` |
| `event_status` | Enum | Yes | Yes | `active` or `cancelled` |
| `publication_status` | Enum | Yes | No | `published`, `draft`, or `archived` |
| `source_submission_id` | Text | Yes | No | Raw form response identifier |
| `created_at` | Datetime | Yes | No | Record creation time |
| `updated_at` | Datetime | Yes | Yes | Last material update |

### Controlled values

```text
organizer_type:
alumni_group
venue
other_organization
individual
unknown

source_type:
fan_submitted
venue_submitted
alumni_group_submitted
cgb_added

age_policy:
all_ages
21_plus
unknown

sound_status:
confirmed_on
confirmed_off
unknown

feature_tags:
rsvp_requested
cal_specials

event_status:
active
cancelled

publication_status:
published
draft
archived
```

### Publication rule

A structurally valid Watch Party form response creates one or more rows with:

```text
event_status = active
publication_status = published
```

No routine manual approval state is required.

## 6. `Fan_Intent`

One row represents an anonymous browser’s venue selection for one game.

| Field | Type | Required | Public | Definition |
|---|---|---:|---:|---|
| `fan_intent_id` | Text | Yes | No | Unique action record |
| `browser_id` | Text | Yes | No | Random local browser identifier |
| `game_id` | Foreign key | Yes | Aggregate only | Selected game |
| `venue_id` | Foreign key | Yes | Aggregate only | Selected venue |
| `status` | Enum | Yes | No | `attending`, `withdrawn`, or `archived` |
| `created_at` | Datetime | Yes | No | Initial selection time |
| `updated_at` | Datetime | Yes | No | Last action time |
| `archived_at` | Datetime | Conditional | No | Time current-game record became historical |

Rules:

- One `attending` record per `browser_id + game_id`.
- Selecting another venue moves the active selection.
- Undo changes the active record to `withdrawn`.
- After the game, active records become `archived`.
- Public data contains only aggregate counts.
- Historical venue activity counts distinct games containing archived Fan Intent.

## 7. `Watch_Party_Submissions_Raw`

Google Forms owns the original response columns. Append administrative processing fields.

Recommended submitted fields:

- `response_timestamp`
- `submission_id`
- `venue_id`, prefilled for the existing Venue
- `venue_name_submitted`
- `game_ids_submitted`
- `organizer_name`
- `organizer_type`
- `official_event_url`
- `event_start_information`
- combined `structured_tags` response
- `game_day_note`
- `submitter_role`
- optional private `submitter_email`

Processors remain tolerant of legacy response headings and existing `age_policy`, `sound_status`, `restrictions_note`, and other historical raw columns. The current combined structured checkbox is normalized rather than exposed directly.

Processing fields:

- `processing_status`: `new`, `processed`, `error`, or retryable `enhancement_error` when base Watch Party publication succeeded but structured enhancement did not
- `created_watch_party_ids`
- `created_venue_id`
- `processing_error`
- `processed_at`
- `review_status`: private workflow state such as `pending` or `not_required`
- `manual_review_reason`: private machine-readable reason(s) for consequential corrections, conflicts, or enhancement failures

The raw response is private. Successful processing automatically creates canonical Watch Party rows. Venue-capable positive selections may also seed absent `Venues.venue_tags`; `rsvp_requested` and `cal_specials` remain event-only. An unambiguous timezone-qualified start/arrival time may populate `event_start_at`.

## 8. Venue contribution raw responses

The live **Tell us about this location** response tab remains Form-owned and private. Existing raw headings are preserved for history; current processing is heading/alias based rather than column-order based.

Current contribution contract includes:

- prefilled Venue name and canonical Venue ID
- required submitter relationship
- required gathering-frequency context
- optional controlled Venue tag block
- optional freeform Venue context
- optional private email
- private processing status/error/timestamp plus `review_status` / `manual_review_reason` columns appended by Apps Script

Only the controlled positive Venue tags auto-publish. Freeform context, email, historical alumni-affiliation answers, crowd-size answers, and other legacy raw columns stay private. No public-name field is required for this workflow.

## 9. Venue and Watch Party update raw responses

The Venue update and Watch Party update Forms remain separate, with their own Form-owned private response tabs. Both preserve the original response and append private processing status/error/timestamp plus `review_status` / `manual_review_reason` fields. Safe structured additions may be applied even when the consequential portion remains durably `pending` for manual review.

### Venue update

Stable relationship key: canonical Venue ID. Safe additive `venue_tags` auto-publish. Closure/move and Venue identity/name/address changes remain private for manual review.

### Watch Party update

Stable relationship key: canonical Watch Party ID. Safe additive structured details may update the exact Watch Party automatically. Venue-capable selections may seed missing `Venues.venue_tags`; `rsvp_requested` and `cal_specials` update only `Watch_Parties.feature_tags`. A valid timezone-qualified start/arrival time may populate a previously absent `event_start_at`. Cancellation/move, organizer replacement, and material official-event-link replacement remain private/manual-review items.

Freeform text, submitter names, and submitter email never enter the public read model automatically.

## 10. `Photo_Submissions_Raw`

Recommended fields:

- `response_timestamp`
- `submission_id`
- `venue_id`
- `venue_name`
- `file_reference`
- `caption`
- `photo_credit`
- `permission_confirmed`
- `submitter_name`
- `submitter_email`
- `review_status`
- `reviewer_note`
- `reviewed_at`

Only approved photos update `Venues.photo_url` and `Venues.photo_credit`.

## 11. `Missing_Location_Suggestions_Raw`

Used only when external place search cannot find a location.

Recommended fields:

- `response_timestamp`
- `submission_id`
- `venue_name`
- `address`
- `website_url`
- `selected_game_id`
- `note`
- `submitter_email`
- `review_status`
- `created_venue_id`
- `reviewed_at`

## 12. Public read model

The website should receive public data equivalent to:

```text
venues (including validated `venue_tags`)
games
watch_parties (including validated event-only `feature_tags`)
fan_counts
venue_history_counts
```

The endpoint must omit:

- `browser_id`
- Raw submission rows
- Submitter contact information
- Reviewer notes
- Photo permission records
- Internal external-source identifiers unless needed by the client
- Workbook identifiers and URLs
- Any unrecognized or malformed tag values

## 13. Public derived fields

### Current Bear count

Count `Fan_Intent` rows where:

```text
venue_id = selected venue
game_id = selected game
status = attending
```

### Past games count

Count distinct prior `game_id` values where the venue has at least one `archived` Fan Intent record.

### Watch Party count

Count published active Watch Party rows for the selected game.

### Location count

Count published Venue rows, including both Cal Bars and Community Locations.

## 14. Integrity rules

1. IDs are immutable.
2. Venue names are not identifiers.
3. Slugs are unique.
4. A Watch Party references an existing Venue and Game.
5. A Fan Intent references an existing Venue and Game.
6. Canonical tabs contain normalized records; raw tabs preserve original submissions.
7. Multiple games selected in one Watch Party form create separate Watch Party rows.
8. Contact information never enters the public read model.
9. Only approved controlled Venue and Watch Party tag values may enter the public read model; malformed or unapproved tags are discarded.
10. Unchecked structured options mean unknown/not asserted, not false.
11. External venue creation first checks external place ID, then normalized address.
12. Do not design complex closure, rename, ownership-change, or duplicate-resolution systems for the prototype.
