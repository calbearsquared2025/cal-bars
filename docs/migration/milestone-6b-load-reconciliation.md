# Milestone 6B — Approved migration load and reconciliation

**Status:** workbook load complete; public-cache refresh and visual acceptance pending

## Scope

Milestone 6B loads only the product-owner-approved Milestone 6A Venue dataset into the private v2 workbook, removes synthetic seed data that would otherwise pollute representative rendering, preserves legitimate post-Milestone-6A user-created data, and reconciles the resulting workbook state.

This milestone does not modify `Live-1003`, the immutable rollback branch, the Google Form, the Apps Script deployment, MapTiler, DNS, or the production GitHub Pages source.

## Backup

Before the load, a complete private Drive copy of the destination workbook was created with the title:

`CGBv2 — Pre-Milestone 6B Backup — 2026-08-01`

The v1 archive remains unchanged.

## Load decisions

- Loaded all 35 approved Milestone 6A Venue records.
- Changed approved migration candidates from `draft` to `published` for the private v2 workbook load.
- Preserved the two existing MapTiler-created Community Locations and their two active Fan Intent rows.
- Removed four synthetic seed Venues (`ven_000001` through `ven_000004`).
- Removed all seven Watch Party rows that referenced those synthetic seed Venues.
- Removed nineteen Fan Intent rows that referenced synthetic seed Venues.
- Left private raw submission logs unchanged.
- Created no historical Watch Party records or historical Fan Intent counts from legacy descriptions.

## Final workbook reconciliation

| Metric | Count |
|---|---:|
| Approved migrated Venues loaded | 35 |
| Existing user-created Venues preserved | 2 |
| Final published Venues | 37 |
| Final Cal Bars | 16 |
| Final Community Locations | 21 |
| Final Watch Parties | 0 |
| Final active Fan Intent rows | 2 |
| Duplicate Venue IDs | 0 |
| Duplicate Venue slugs | 0 |
| Broken Fan Intent Venue references | 0 |
| Broken Fan Intent Game references | 0 |

All 35 approved migration IDs are present exactly once. The three approved event-supported Community Locations retain one concise source-supported description. Dogwood Domain is absent as rejected; the separately approved venue named The Dogwood remains present.

## Privacy and safety review

- The public Venue whitelist was not changed.
- No private workbook ID, raw response, browser identifier, contact value, or backup URL is committed.
- Private provenance fields remain in the workbook and outside the public snapshot.
- Synthetic browser identifiers and test-only relationships removed from canonical tabs remain recoverable from the private pre-load backup.

## Pending acceptance actions

The Apps Script snapshot cache lasts up to five minutes and workbook edits do not automatically invalidate it. Before visual acceptance, run `clearPublicSnapshotCache_()` in the bound Apps Script project or wait for cache expiry, then verify the v2 preview on desktop and physical iPhone.

Acceptance checks:

1. The public snapshot contains 37 Venues: 16 Cal Bars and 21 Community Locations.
2. The four synthetic venue names do not appear.
3. The Passport Denver, Kells Irish Restaurant & Pub, and The Bad Apple display their approved concise descriptions.
4. Map markers, list browsing, search, direct venue routes, and selected-venue cards render representative migrated records.
5. Two Pitchers Brewing Company and Valley Ford Creamery remain present with their existing Fan Intent selections.
6. Initial load performance is observed with the realistic Venue volume and compared with issue #19.

## Known observation outside the approved migration dataset

The two preserved MapTiler-created Venue rows currently contain `region = US` rather than `CA`. Milestone 6B preserved those user-created records exactly rather than silently changing data outside the approved migration package. The external-place normalization and existing rows should be corrected separately.

## Completion boundary

Do not merge this branch or mark Milestone 6B accepted until the cache-refresh and representative desktop/iPhone checks are complete. Do not begin Milestone 7 automatically.
