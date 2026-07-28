# Milestone 3 — Fan Intent setup and acceptance

Milestone 3 adds anonymous **I’ll be here** writes without changing the GitHub Pages, MapLibre, MapTiler, private Google Spreadsheet, or Apps Script architecture.

## Public/private boundary

The browser stores two local values:

- a random anonymous browser identifier
- one selected Venue ID per Game ID

The identifier is sent only in Fan Intent POST bodies. It is never returned by the public read endpoint or write response and must never be logged, exported, or committed from a real browser.

Public responses contain only:

- the write result
- the caller's active game/venue selection, without an identifier
- aggregate current Bear counts
- aggregate venue-history counts
- schema and generation timestamps

## Manual Google Sheet actions

1. Keep the v2 workbook **Restricted** and not published to the web.
2. Confirm the canonical `Fan_Intent` header row is exactly:

   ```text
   fan_intent_id, browser_id, game_id, venue_id, status, created_at, updated_at, archived_at
   ```

3. Do not clear or reseed existing canonical rows. `setupWorkbook()` may create a missing tab, but it deliberately stops on a header mismatch.
4. Confirm each selectable Venue is `published` with valid coordinates and each selectable Game is `upcoming`.
5. Mark a completed game `completed` only when its current selections should become historical. The service archives its remaining `attending` rows on the next public read or write.

No new workbook, public Sheet sharing, formula, trigger, or private-data export is required.

## Manual Apps Script actions

1. In the existing private v2 Apps Script project, replace `Code.gs` with the reviewed version from this branch.
2. Add `FanIntent.gs` from this branch to the same Apps Script project.
3. Confirm the private Script Property `CGB_WORKBOOK_ID` still points to the intended restricted workbook. Do not put the value in GitHub.
4. Run `setupWorkbook()` once. Resolve any reported header mismatch manually; do not overwrite a populated header row.
5. Run `buildPublicSnapshotForReview()` and confirm that the output contains `venues`, `games`, `watchParties`, `fanCounts`, and `venueHistoryCounts`, but no `browser_id`, `fan_intent_id`, raw row, contact field, workbook ID, or workbook URL.
6. Deploy a new web-app version that executes as the owner and retains the approved public access setting for the site.
7. Copy the deployment URL only into the non-production browser configuration:

   ```js
   CGBPreview.setDataEndpoint('PASTE_NON_PRODUCTION_APPS_SCRIPT_URL_HERE')
   ```

   The URL remains in that browser's local storage. Do not add it to source files, screenshots, test fixtures, or the pull request.
8. After any Apps Script change, create another deployment version; editing source alone does not update an existing versioned deployment.

No installable trigger is required for Fan Intent.

## Acceptance checks

Use synthetic or owner-approved test records only.

1. Open an upcoming game and select a venue. Confirm the button changes from **I’ll be here** to **You’ll be here · Undo** and the current count increases once.
2. Tap again. Confirm the selection is withdrawn and the count returns to its prior value.
3. Select venue A, then venue B for the same game. Confirm A decreases, B increases, and only one `attending` row remains for that browser/game.
4. Refresh. Confirm the selected venue and button state restore from local browser storage.
5. Switch to another game and back. Confirm each game's saved selection restores independently.
6. Tap repeatedly while a request is pending. Confirm controls remain disabled and no duplicate count is created.
7. Temporarily use an unavailable non-production endpoint. Confirm the optimistic change rolls back, the previous selection returns, and **Retry** is offered.
8. Restore the endpoint and retry. Confirm the operation completes without double-counting.
9. Inspect the public GET and POST responses. Confirm neither contains browser identifiers or canonical Fan Intent rows.
10. Mark a synthetic game completed, load the public snapshot, and confirm current counts disappear while the venue's distinct historical-game count increases.
11. Complete actual iPhone and desktop checks for selected, pending, failed/retry, undo, move, refresh, and game-switch states.

## Intended limitations

- Clearing storage creates a new anonymous identity.
- Different browsers or devices may represent the same person more than once.
- Local selection restoration is device-specific.
- No account, attendee list, identity reconciliation, external venue creation, or Watch Party automation is included in this milestone.
