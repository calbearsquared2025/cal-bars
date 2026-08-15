# CGB v2 Workbook and Apps Script Setup

This is an owner-run setup procedure for the confirmed private v2 Google Spreadsheet. Do not place the workbook URL or ID in this public repository, source code, pull-request comments, browser configuration, or public API responses.

## Required workbook state

- General access is **Restricted**.
- The workbook is not published to the web.
- The workbook is not exposed through a public CSV URL.
- Apps Script executes as the workbook owner.

## Tabs

The read-only foundation expects these application-managed tabs:

1. `Venues`
2. `Games`
3. `Watch_Parties`
4. `Fan_Intent`
5. `Watch_Party_Submissions_Raw`
6. `Listing_Updates_Raw`
7. `Photo_Submissions_Raw` — reserved; may remain inactive until post-launch
8. `Missing_Location_Suggestions_Raw`

Google Forms may also create their own linked response sheets inside the same private workbook. Those Form-owned response sheets are private raw logs but are not application-managed schema tabs unless an implemented processing workflow explicitly depends on them.

The **Nominate a Cal Bar** Form uses its own linked Google Form response sheet as the authoritative private nomination log. The former `Cal_Bar_Nominations_Raw` tab is no longer required and may be absent from the workbook.

The canonical column definitions for application-managed tabs are encoded in `apps-script/Code.gs` and mirrored in the private Data Dictionary.

> **Known code drift:** `apps-script/Code.gs` currently still lists `Cal_Bar_Nominations_Raw` in `CGB_TABS`, so running `setupWorkbook()` will recreate that legacy empty tab until the schema definition is cleaned up. Do not treat the recreated tab as the nomination source of truth.

## Owner actions

1. Open the confirmed private v2 workbook.
2. Open **Extensions → Apps Script**.
3. Replace the starter script with `apps-script/Code.gs`.
4. Add a second script file named `TestData.gs` and copy `apps-script/TestData.gs` into it.
5. Add a third script file named `ColumnFormats.gs` and copy `apps-script/ColumnFormats.gs` into it.
6. Apply the settings from `apps-script/appsscript.json`.
7. Run `configureBoundWorkbook()` once and authorize it. This stores the workbook ID in private Apps Script properties.
8. Run `setupWorkbook()` only when needed to create or repair application-managed schema tabs. Until the known schema drift above is fixed, it may also recreate the unused `Cal_Bar_Nominations_Raw` tab.
9. Run `normalizeCanonicalTextColumns()` once. It stores `Venues.postal_code` and `Games.game_date` as text and corrects Sheet-coerced values.
10. Run `seedTestData()` to add the Milestone 1 synthetic records. The function refuses to run when any canonical data tab contains a non-test row.
11. Run `buildPublicSnapshotForReview()` and inspect the log output for private fields or malformed records.
12. Deploy as a Web app only when ready to test the read endpoint:
    - Execute as: **Me**
    - Who has access: the minimum setting that permits the public frontend to read the snapshot
13. Keep the deployment URL out of committed source until a later milestone defines the non-production configuration mechanism.

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
- Required application-managed tabs are present.
- The Nominate a Cal Bar Form writes only to its linked private response sheet and does not require `Cal_Bar_Nominations_Raw`.
- If `setupWorkbook()` is run before the schema cleanup, any recreated `Cal_Bar_Nominations_Raw` tab remains unused.
- `normalizeCanonicalTextColumns()` returns postal codes as strings and game dates as `YYYY-MM-DD`.
- `seedTestData()` creates synthetic rows only when the canonical data tabs are empty or contain only prior test rows.
- A draft Venue row does not appear publicly.
- A cancelled or draft Watch Party does not appear publicly.
- Browser IDs and raw form fields do not appear in the snapshot.
- `clearTestData()` removes only the synthetic rows.
- The response validates against `scripts/validate-v2-data.mjs` after saving it locally as JSON.
