# Milestone 5A — Minimal Watch Party automation

## Scope

This milestone provides the first testable end-to-end Watch Party submission flow:

```text
Google Form response
  → private Watch_Party_Submissions_Raw row
  → basic Apps Script validation
  → published Watch_Parties row(s)
  → existing public snapshot
  → existing map, tray, and venue-detail rendering
```

The accepted frontend and public read service already render active, published canonical Watch Parties. This milestone adds only the missing Form processor.

## Supported submission path

The minimal processor requires:

- an existing published `venue_id` with valid coordinates
- one or more existing `game_id` values
- organizer or host name
- recognized submitter relationship
- optional HTTP(S) event URL
- optional parseable start or arrival time

One selected game creates one canonical Watch Party row. Multiple selected games create one row per game. Valid rows are written with:

```text
event_status = active
publication_status = published
```

The public snapshot cache is cleared only after the canonical write and raw-row status update succeed.

## Google Form question labels

Use these labels for the initial Form. The processor also accepts the canonical snake-case aliases documented in the code.

Required:

1. `Venue ID (existing)`
2. `Game(s)`
3. `Organizer Name`
4. `Submitter Role`

Recommended structured fields:

- `Organizer Type`
- `Official Event URL`
- `Start or arrival time`
- `Age Policy`
- `Sound Status`
- `Restrictions Note`
- `Game Day Note`

Recommended controlled answers:

- Organizer Type: `Alumni group`, `Venue`, `Other organization`, `Individual`, `Unknown`
- Submitter Role: `Fan`, `Venue owner or manager`, `Alumni group`
- Age Policy: `All ages`, `21+`, `Unknown`
- Sound Status: `On`, `Off`, `Unknown`

## Manual Google actions

1. Create a focused Google Form with the question labels above.
2. Link the Form to the private v2 workbook.
3. Rename the generated response tab to `Watch_Party_Submissions_Raw`.
4. Add `apps-script/WatchPartyAutomation.gs` to the bound Apps Script project.
5. Run `prepareMinimalWatchPartyAutomation()` once and confirm it appends the six private processing columns.
6. Install an Apps Script trigger:
   - function: `onWatchPartyFormSubmit`
   - event source: **From spreadsheet**
   - event type: **On form submit**
7. Deploy a new Apps Script web-app version so the public snapshot reads the new canonical rows.
8. Submit one test response using an existing published Venue ID and Game ID.
9. Confirm the raw row is `processed`, one canonical row exists, and the Watch Party appears after refresh on desktop and iPhone.

## Privacy boundary

The processor writes submitter information only to the private Form response row. Canonical rows contain only the approved Watch Party fields and the private `source_submission_id`. The existing public whitelist excludes `source_submission_id`, raw rows, processing errors, and contact information.

## Intentional limitations

This is the minimum testing workflow, not the hardening stage:

- no discovery-candidate processing
- no advanced idempotency or trigger-redelivery protection
- no duplicate-event detection
- no script-lock changes
- no retry or compensation framework
- no free-text venue creation or geocoding
- no contribution/admin interface
- no new frontend Form-link configuration

`WatchPartyDiscovery.gs` remains dormant and is not called by this processor. These limitations should be reconsidered only after the product workflow is tested and accepted.
