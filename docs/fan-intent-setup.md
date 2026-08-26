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
5. Mark a completed game `completed` only when its current selections should become historical. The scheduled archival trigger archives remaining `attending` rows; Fan Intent writes also perform the same archival check before processing a write.

No new workbook, public Sheet sharing, formula, or private-data export is required.

## Manual Apps Script actions

1. In the existing private v2 Apps Script project, replace `Code.gs` with the reviewed version from this branch.
2. Add `FanIntent.gs` from this branch to the same Apps Script project.
3. Confirm the private Script Property `CGB_WORKBOOK_ID` still points to the intended restricted workbook. Do not put the value in GitHub.
4. Run `setupWorkbook()` once. Resolve any reported header mismatch manually; do not overwrite a populated header row.
5. Run `buildPublicSnapshotForReview()` and confirm that the output contains `venues`, `games`, `watchParties`, `fanCounts`, and `venueHistoryCounts`, but no `browser_id`, `fan_intent_id`, raw row, contact field, workbook ID, or workbook URL.
6. Deploy a new web-app version that executes as the owner and retains the approved public access setting for the site.
7. After any Apps Script change, create another deployment version; editing source alone does not update an existing versioned deployment.
8. In Apps Script **Triggers**, add a time-driven trigger for `archiveCompletedFanIntentScheduled` and run it hourly.

The public snapshot path is intentionally read-only and does not acquire the Fan Intent write lock or archive rows. The time-driven trigger keeps completed-game archival independent of public GET traffic.

## Live-canary acceptance

Use synthetic or owner-approved test records only.

The live HTTPS frontend reads the approved public Apps Script web-app endpoint from the `cgb-data-endpoint` metadata in `index.html`. Ordinary live-canary use does not require a bookmarklet, Safari Shortcut, developer console, or local-storage setup.

Routine acceptance for the approved live canary requires:

1. Run the automated test suite and fallback-data validation successfully.
2. Inspect the public response and confirm it contains no browser identifiers, canonical Fan Intent rows, raw rows, contact fields, workbook identifiers, or workbook URLs.
3. Confirm the live HTTPS site loads against the approved deployment.
4. Complete one desktop core-path test: join an upcoming game at venue A, move to venue B, use **Undo**, and refresh to confirm the final selection persists correctly.
5. Complete one physical-iPhone core-path test covering join, move, **Undo**, refresh persistence, and basic portrait usability.

The desktop and iPhone checks should confirm aggregate counts and button state change once per action. They do not require repeating every diagnostic failure or cache scenario.

## Optional local-preview diagnostics

Use these checks only when diagnosing preview configuration, origin isolation, caching, or failure behavior. They are not routine live-canary acceptance.

- Override the HTML-configured endpoint for the current browser origin:

  ```js
  CGBPreview.setDataEndpoint('PASTE_NON_PRODUCTION_APPS_SCRIPT_URL_HERE')
  ```

  The override remains in that origin's local storage. Use `CGBPreview.clearDataEndpoint()` to remove it and return to the endpoint configured in HTML. Do not add diagnostic endpoints to source files, screenshots, test fixtures, or the pull request.
- Compare `localhost`, the Windows LAN address, or alternate ports when investigating origin-specific local storage. Each scheme, host, and port has independent browser storage.
- Use browser emulation as a supplemental diagnostic, not as a substitute for the physical-iPhone acceptance check.
- Force an unavailable endpoint only when verifying optimistic rollback and **Retry**, then restore the approved endpoint before continuing.
- Repeat cache-busting or fresh-context checks only when stale assets are suspected.
- Manipulate archival state manually only with synthetic or owner-approved records when diagnosing completed-game behavior.

The normal join, move, withdrawal, pending-state, rollback, and retry behaviors remain covered by automated tests. Clearing browser storage creates a new anonymous identity and should not be part of routine acceptance.

## Completed-game archival check

When archival behavior itself changes or requires focused verification, mark a synthetic game `completed`, run `archiveCompletedFanIntentScheduled()`, then load the public snapshot and confirm current selections are archived, current counts disappear, and the venue's distinct historical-game count increases. Never manipulate actual completed-game data solely for routine canary acceptance.

## Intended limitations

- Clearing storage creates a new anonymous identity.
- Different browsers or devices may represent the same person more than once.
- Local selection restoration is device-specific.
- No account, attendee list, identity reconciliation, external venue creation, or Watch Party automation is included in this milestone.
