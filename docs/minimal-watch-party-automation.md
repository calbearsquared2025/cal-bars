# Milestone 5A — Minimal Watch Party automation

## Scope

This processor provides the first testable end-to-end Watch Party submission flow:

```text
Google Form response
  → private Watch_Party_Submissions_Raw row
  → Apps Script validation and normalization
  → published Watch_Parties row(s)
  → existing public snapshot
  → existing map, tray, and venue-detail rendering
```

The accepted frontend and public read service already render active, published canonical Watch Parties. The processor handles only the direct existing-Venue path.

## Supported submission path

The processor requires:

- an existing published `venue_id` with valid coordinates
- one or more recognized game selections
- organizer or host name
- recognized organizer type
- recognized submitter relationship
- optional event or RSVP website

One selected game creates one canonical Watch Party row. Multiple selected games create one row per game. Valid rows are written with:

```text
event_status = active
publication_status = published
```

MVP Watch Parties use the linked Game's date and kickoff information. Canonical `event_start_at` remains blank. Early-arrival instructions belong in **Anything else fans should know?**, which maps to `game_day_note`.

The public snapshot cache is cleared only after the canonical write and raw-row status update succeed.

## Final Form compatibility

The processor recognizes the finalized friendly titles documented in `docs/watch-party-form-entry-point.md`, including:

- `Venue ID (existing)`
- `Which game or games will have a Watch Party here?`
- `Organizer or host name`
- `Who is organizing or hosting this Watch Party?`
- `What is your relationship to this Watch Party?`
- `Official event or RSVP link`
- `Are there age restrictions?`
- `Will the game audio be on?`
- `Anything else fans should know?`
- `Contact Email`

Legacy labels remain accepted so historical raw responses are not invalidated.

The Form presents readable checkbox choices such as:

```text
Sep 5 — Cal vs. UCLA
Sep 12 — Cal at Syracuse
```

Apps Script derives the same date-and-matchup labels from the canonical `Games` tab and maps each selected label to its stable `game_id`. Older raw responses containing canonical Game IDs remain supported.

Kickoff times are intentionally excluded from Form labels.

## Normalization

The finalized user-facing values map to canonical enums:

- Organizer Type:
  - `Alumni group` → `alumni_group`
  - `Venue` → `venue`
  - `Other organization` → `other_organization`
  - `Individual or group of fans` → `individual`
  - `Not Sure` → `unknown`
- Submitter relationship:
  - alumni/organization representative → `alumni_group_submitted`
  - venue representative → `venue_submitted`
  - individual organizer or fan sharing another public event → `fan_submitted`
- Age restrictions:
  - `All ages` → `all_ages`
  - `21+ Only` → `21_plus`
  - blank → `unknown`
- Game audio:
  - `Yes` → `confirmed_on`
  - `No` → `confirmed_off`
  - blank → `unknown`

An optional event link may be entered as a bare domain or complete HTTP(S) URL. Bare domains are normalized to `https://...`; malformed or unsafe values are rejected.

`Contact Email` remains only in the private raw response. It is never copied into a canonical Watch Party row or the public snapshot.

## Manual Google actions

1. Keep the linked response tab named `Watch_Party_Submissions_Raw`.
2. Do not delete historical columns left by renamed or removed Form questions.
3. Add or replace `apps-script/WatchPartyAutomation.gs` in the spreadsheet-bound Apps Script project.
4. Run `prepareMinimalWatchPartyAutomation()` and confirm the six private processing columns exist:
   - `submission_id`
   - `processing_status`
   - `created_watch_party_ids`
   - `created_venue_id`
   - `processing_error`
   - `processed_at`
5. Confirm the installed Apps Script trigger remains:
   - function: `onWatchPartyFormSubmit`
   - event source: **From spreadsheet**
   - event type: **On form submit**
6. Submit a test response using the finalized Form.
7. Confirm the raw row is `processed`, one canonical row exists per selected game, and the Watch Party appears after refresh on desktop and iPhone.

## Privacy boundary

The processor writes submitter information only to the private Form response row. Canonical rows contain only approved Watch Party fields and the private `source_submission_id`. The public whitelist excludes `source_submission_id`, raw rows, processing errors, and contact information.

## Intentional limitations

This remains the minimum testing workflow, not the hardening stage:

- no discovery-candidate processing
- no advanced idempotency or trigger-redelivery protection
- no duplicate-event detection
- no script-lock changes
- no retry or compensation framework
- no free-text venue creation or geocoding
- no contribution/admin interface

`WatchPartyDiscovery.gs` remains dormant and is not called by this processor. These limitations should be reconsidered only after the product workflow is tested and accepted.
