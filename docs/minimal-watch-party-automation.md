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

One selected game creates one canonical Watch Party row. Multiple selected games create one row per game. Valid rows are written with:

```text
event_status = active
publication_status = published
```

MVP Watch Parties use the linked Game's kickoff time. The canonical `event_start_at` field remains blank. Put early-arrival instructions or other special timing in the optional `Game Day Note` field.

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
- `Age Policy`
- `Sound Status`
- `Restrictions Note`
- `Game Day Note`

Recommended controlled answers:

- Organizer Type: `Alumni group`, `Venue`, `Other organization`, `Individual`, `Unknown`
- Submitter Role: `Fan`, `Venue owner or manager`, `Alumni group`
- Age Policy: `All ages`, `21+`, `Unknown`
- Sound Status: `On`, `Off`, `Unknown`

Set the Form confirmation message to:

> Your watch party has been added.

## Manual Google actions

1. Inspect the existing `Watch_Party_Submissions_Raw` tab before linking the Form. If it is the empty schema placeholder created during workbook setup, rename it to `Watch_Party_Submissions_Raw_Schema_Backup`. Do not rename or delete it if it contains responses.
2. Create a focused Google Form with the question labels above.
3. Link the Form to the private v2 workbook. Google Forms will create a new response sheet.
4. Rename the newly generated Form response sheet to `Watch_Party_Submissions_Raw`.
5. Add `apps-script/WatchPartyAutomation.gs` to the spreadsheet-bound Apps Script project.
6. Run `prepareMinimalWatchPartyAutomation()` once and confirm it appends the six private processing columns to the generated response sheet.
7. Install an Apps Script trigger:
   - function: `onWatchPartyFormSubmit`
   - event source: **From spreadsheet**
   - event type: **On form submit**
8. Confirm the currently deployed public web app already contains the accepted Watch Party read endpoint from `main`. Redeploy only if that accepted read code has not yet been deployed.
9. Submit one test response using an existing published Venue ID and Game ID.
10. Confirm the generated raw row is `processed`, one canonical row exists, and the Watch Party appears after refresh on desktop and iPhone.

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
