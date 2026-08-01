# Milestone 6B — Approved migration load and reconciliation

**Status:** corrected workbook load and exact readback validation complete; public-cache refresh and visual acceptance pending

## Scope

Milestone 6B loads only the product-owner-approved Milestone 6A Venue dataset into the private v2 workbook, removes synthetic seed data that would otherwise pollute representative rendering, preserves legitimate post-Milestone-6A user-created data, and reconciles the resulting workbook state.

This milestone does not modify `Live-1003`, the immutable rollback branch, the Google Form, the Apps Script deployment, MapTiler, DNS, or the production GitHub Pages source.

## Backup

Before the load, a complete private Drive copy of the destination workbook was created with the title:

`CGBv2 — Pre-Milestone 6B Backup — 2026-08-01`

The v1 archive remains unchanged.

## Load correction incident

The first Milestone 6B write used an incorrect non-authoritative 35-row Venue dataset. Its row count and schema matched the expected totals, but its Venue identities did not match either the archived v1 `Public` tab or the approved Milestone 6A package. Matthew detected the problem during visual review after noticing unrelated locations in Atlanta and Cleveland.

The incorrect rows were removed before acceptance. The `Venues` tab was then replaced with the exact 35 approved Milestone 6A rows plus the two preserved user-created rows.

The root cause was a separately composed spreadsheet-write payload rather than direct serialization of the already verified approved CSV. Aggregate checks then validated counts and shape without comparing the actual record identities and fields.

## Permanent validation control

`scripts/validate-venue-load.mjs` now compares a workbook-export CSV with the approved migration CSV and fails on any of the following:

- a different or reordered canonical Venue schema;
- a missing approved Venue ID;
- an unexpected non-allowlisted Venue;
- any changed canonical field on an approved Venue, including name, city, coordinates, type, provenance, or timestamps;
- a missing explicitly preserved pre-existing Venue;
- duplicate Venue IDs or slugs; or
- a mismatch between the canonical SHA-256 hash of the expected and actual approved Venue sets.

The validator permits only the explicitly requested `publication_status` transformation from migration `draft` to workbook `published`. Preserved user-created rows must be supplied through an explicit Venue-ID allowlist.

Regression coverage includes the exact failure mode from this incident: a count-matching replacement dataset with an invented Atlanta record fails with missing-approved, unexpected-Venue, and hash-mismatch errors. Relocated records, duplicate identities, and schema drift also fail.

## Exact readback validation

The corrected workbook was exported after the replacement write and validated against the accepted `proposed-venues.csv` artifact.

| Validation | Result |
|---|---:|
| Approved Venues expected | 35 |
| Approved Venues found | 35 |
| Preserved Venues expected | 2 |
| Total actual Venues | 37 |
| Validation issues | 0 |
| Expected approved-set SHA-256 | `feeac9e7d54e4b826102017f6f374fe65d0ef561db5b8e50447f06978c989834` |
| Actual approved-set SHA-256 | `feeac9e7d54e4b826102017f6f374fe65d0ef561db5b8e50447f06978c989834` |

The matching hashes cover all 24 canonical Venue fields for all 35 approved records and are order-independent. The private workbook export and preserved Venue IDs are not committed.

## Final load decisions

- Loaded all 35 approved Milestone 6A Venue records from the accepted review package.
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
| Approved Venue IDs present exactly once | 35 / 35 |

The corrected workbook contains the approved v1-derived records, including George & Walt's in Oakland, Busby's West in Santa Monica, Cali's Sports Bar & Kitchen in Berkeley, and Town Tavern DC in Washington. The unrelated Atlanta, Cleveland, and Pittsburgh rows from the incorrect first write are absent.

The three approved event-supported Community Locations retain one concise source-supported description. Dogwood Domain is absent as rejected.

## Privacy and safety review

- The public Venue whitelist was not changed.
- No private workbook ID, raw response, browser identifier, contact value, preserved Venue ID, or backup URL is committed.
- Private provenance fields remain in the workbook and outside the public snapshot.
- Synthetic browser identifiers and test-only relationships removed from canonical tabs remain recoverable from the private pre-load backup.

## Pending acceptance actions

The Apps Script snapshot cache lasts up to five minutes and workbook edits do not automatically invalidate it. Before visual acceptance, wait for cache expiry, then verify the v2 preview on desktop and physical iPhone.

Acceptance checks:

1. The public snapshot contains 37 Venues: 16 Cal Bars and 21 Community Locations.
2. The four synthetic seed venue names do not appear.
3. Unapproved first-write records such as the Atlanta Cali's, West 3rd Common in Cleveland, and Some Random Bar in Pittsburgh do not appear.
4. Approved records such as George & Walt's, Busby's West, Headlands Brewing, and Cali's in Berkeley do appear.
5. The Passport Denver, Kells Irish Restaurant & Pub, and The Bad Apple display their approved concise descriptions.
6. Map markers, list browsing, search, direct venue routes, and selected-venue cards render representative migrated records.
7. Two Pitchers Brewing Company and Valley Ford Creamery remain present with their existing Fan Intent selections.
8. Initial load performance is observed with the realistic Venue volume and compared with issue #19.

## Known observation outside the approved migration dataset

The two preserved MapTiler-created Venue rows currently contain `region = US` rather than `CA`. Milestone 6B preserved those user-created records exactly rather than silently changing data outside the approved migration package. Issue #25 tracks the external-place normalization and existing-row correction.

## Completion boundary

Do not merge this branch or mark Milestone 6B accepted until the corrected dataset has passed cache-refresh and representative desktop/iPhone checks. Do not begin Milestone 7 automatically.
