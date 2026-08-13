# CGB v2 Workbook and Apps Script Setup

This is an owner-run setup procedure for the confirmed private v2 Google Spreadsheet. Do not place the workbook URL or ID in this public repository, source code, pull-request comments, browser configuration, or public API responses.

## Required workbook state

- General access is **Restricted**.
- The workbook is not published to the web.
- The workbook is not exposed through a public CSV URL.
- Apps Script executes as the workbook owner.

## Tabs

The workbook architecture has four canonical core tabs:

1. `Venues`
2. `Games`
3. `Watch_Parties`
4. `Fan_Intent`

Private/raw workflows use:

1. `Cal_Bar_Nominations_Raw`
2. `Watch_Party_Submissions_Raw`
3. `Listing_Updates_Raw`
4. `Photo_Submissions_Raw`
5. `Missing_Location_Suggestions_Raw`

Photo publication control uses one admin tab:

1. `Venue_Photos`

`Venue_Photos` is not a fifth core entity. Its exact header row is:

```text
venue_id	photo_url	photo_caption	photo_credit	photo_credit_url	publication_status	updated_at
```

Example Molly O's row (replace `updated_at` with the actual review time when publishing):

```text
venue_5977e35a58d8b18f22a51f1e	https://calgoldenbars.com/assets/venues/molly-o-s-san-carlos.webp	Cal fans at Molly O's for the 2025 Louisville game.	@oskistraw	https://x.com/oskistraw	published	2026-08-12T12:00:00Z
```

Use zero or one `published` row per canonical Venue ID. Allowed status values are `published`, `draft`, and `archived`. Only `published` rows can supply public Venue photo properties. Never put Form response contents, Drive file IDs, respondent emails, permission records, or reviewer notes in this tab.

The legacy physical `Venues.photo_url` and `Venues.photo_credit` columns remain for workbook compatibility, but Apps Script ignores them for publication. Do not add `photo_caption` or `photo_credit_url` to `Venues`, and do not maintain photo metadata in both places.

The private `ID_Aliases` tab remains an internal compatibility ledger for current Apps Script write paths. It is not public, canonical, raw-intake, or photo-publication data; do not treat it as part of the Venue-photo workflow or expose it publicly.

The workbook column definitions are encoded in `apps-script/Code.gs`. The private canonical data/privacy planning specification must also be updated to record `Venue_Photos` as a publication-control/admin tab, not a core product entity.

## Owner actions

1. Open the confirmed private v2 workbook.
2. Open **Extensions → Apps Script**.
3. Replace the starter script with `apps-script/Code.gs`.
4. Add a second script file named `TestData.gs` and copy `apps-script/TestData.gs` into it.
5. Add a third script file named `ColumnFormats.gs` and copy `apps-script/ColumnFormats.gs` into it.
6. Apply the settings from `apps-script/appsscript.json`.
7. Run `configureBoundWorkbook()` once and authorize it. This stores the workbook ID in private Apps Script properties.
8. Run `setupWorkbook()` once. It creates missing tabs and header rows, including `Venue_Photos`, but does not overwrite existing data.
9. Confirm that `Venue_Photos` has the exact seven-column header above before adding a row.
10. Run `normalizeCanonicalTextColumns()` once. It stores `Venues.postal_code` and `Games.game_date` as text and corrects Sheet-coerced values.
11. Run `seedTestData()` to add the Milestone 1 synthetic records. The function refuses to run when any canonical data tab contains a non-test row.
12. Run `buildPublicSnapshotForReview()` and inspect the log output for private fields or malformed records.
13. Deploy as a Web app only when ready to test the read endpoint:
    - Execute as: **Me**
    - Who has access: the minimum setting that permits the public frontend to read the snapshot
14. Keep the deployment URL out of committed source until a later milestone defines the non-production configuration mechanism.

## Canonical text-column normalization

Google Sheets may automatically convert postal codes to numbers and date-only game dates to timezone-bearing Date values. The public contract requires:

- `postal_code` as text, preserving any leading zero
- `game_date` as `YYYY-MM-DD` without a time or timezone

`normalizeCanonicalTextColumns()` applies plain-text formatting to both columns, rewrites existing values into the required shape, clears the public snapshot cache, and returns a fresh review snapshot. It is owner-only and is not exposed through `doGet()`.

## Synthetic test-data controls

`seedTestData()` adds clearly labeled, non-production records to:

- `Venues`
- `Games`
- `Watch_Parties`
- `Fan_Intent`

It creates both confirmed and TBD kickoff examples, current Fan Intent counts, and one completed-game history example. Synthetic browser identifiers are generated only inside the private workbook when the function runs; no identifier values are committed to GitHub.

Run `clearTestData()` to remove only the known synthetic rows. It does not delete unrelated rows. Clear the test data before importing or entering real v2 records.

Do not run `seedTestData()` after real records have been added. Its safety check will reject canonical tabs containing non-test rows.

## Read endpoint

The default `GET` response returns the public snapshot. `?action=health` returns a small health response without workbook content.

The endpoint is read-only in Milestone 1. It does not accept Fan Intent, external venue creation, form processing, or any other write action.

## Manual acceptance checks

- The workbook remains Restricted.
- `setupWorkbook()` creates all expected tabs.
- `normalizeCanonicalTextColumns()` returns postal codes as strings and game dates as `YYYY-MM-DD`.
- `seedTestData()` creates synthetic rows only when the canonical data tabs are empty or contain only prior test rows.
- A draft Venue row does not appear publicly.
- Draft, archived, malformed, unknown-Venue, or duplicate-published `Venue_Photos` rows do not prevent the Venue from publishing and do not expose a photo.
- One valid published `Venue_Photos` row supplies the four photo properties on its matching public Venue; no top-level photo collection appears.
- A cancelled or draft Watch Party does not appear publicly.
- Browser IDs and raw form fields do not appear in the snapshot.
- `clearTestData()` removes only the synthetic rows.
- The response validates against `scripts/validate-v2-data.mjs` after saving it locally as JSON.
