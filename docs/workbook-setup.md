# CGB v2 Workbook and Apps Script Setup

This is an owner-run setup procedure for the confirmed private v2 Google Spreadsheet. Do not place the workbook URL or ID in this public repository, source code, pull-request comments, browser configuration, or public API responses.

## Required workbook state

- General access is **Restricted**.
- The workbook is not published to the web.
- The workbook is not exposed through a public CSV URL.
- Apps Script executes as the workbook owner.

## Tabs

The read-only foundation expects these tabs:

1. `Venues`
2. `Games`
3. `Watch_Parties`
4. `Fan_Intent`
5. `Cal_Bar_Nominations_Raw`
6. `Watch_Party_Submissions_Raw`
7. `Listing_Updates_Raw`
8. `Photo_Submissions_Raw` — reserved; may remain inactive until post-launch
9. `Missing_Location_Suggestions_Raw`

The canonical column definitions are encoded in `apps-script/Code.gs` and mirrored in the private Data Dictionary.

## Owner actions

1. Open the confirmed private v2 workbook.
2. Open **Extensions → Apps Script**.
3. Replace the starter script with `apps-script/Code.gs`.
4. Apply the settings from `apps-script/appsscript.json`.
5. Run `configureBoundWorkbook()` once and authorize it. This stores the workbook ID in private Apps Script properties.
6. Run `setupWorkbook()` once. It creates missing tabs and header rows but does not overwrite existing data.
7. Add new synthetic or test records only. Do not migrate existing production locations during Milestone 1.
8. Run `buildPublicSnapshotForReview()` and inspect the log output for private fields or malformed records.
9. Deploy as a Web app only when ready to test the read endpoint:
   - Execute as: **Me**
   - Who has access: the minimum setting that permits the public frontend to read the snapshot
10. Keep the deployment URL out of committed source until a later milestone defines the non-production configuration mechanism.

## Read endpoint

The default `GET` response returns the public snapshot. `?action=health` returns a small health response without workbook content.

The endpoint is read-only in Milestone 1. It does not accept Fan Intent, external venue creation, form processing, or any other write action.

## Manual acceptance checks

- The workbook remains Restricted.
- `setupWorkbook()` creates all expected tabs.
- A draft Venue row does not appear publicly.
- A cancelled or draft Watch Party does not appear publicly.
- Browser IDs and raw form fields do not appear in the snapshot.
- The response validates against `scripts/validate-v2-data.mjs` after saving it locally as JSON.
