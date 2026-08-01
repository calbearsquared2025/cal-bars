# Milestone 6A dry-run aggregate summary

**Source snapshot:** authorized v1 production `Public` location tab archived July 26, 2026

**Migration timestamp:** `2026-07-26T00:00:00Z`

**Status:** product-owner review complete; no v2 workbook load

## Final reconciliation

| Metric | Result |
|---|---:|
| v1 source rows | 36 |
| Proposed accepted Venues | 35 |
| Proposed Cal Bars | 16 |
| Proposed Community Locations | 19 |
| Held for Matthew review | 0 |
| Rejected rows | 1 |
| Suspected duplicate groups | 0 |
| Rows in suspected duplicate groups | 0 |
| Rows excluded from candidate dataset | 1 |
| All source rows accounted for exactly once | Yes |

Matthew approved all previously flagged Venue classifications. Three event-only records were accepted as Community Locations because the existing v1 source documents a specific Cal watch party at each venue. Each receives one concise source-supported explanation; no historical Watch Party, attendance record, timeline, filter, or research requirement is created.

Dogwood Domain was rejected with `VENUE_CLOSED` after current-business review confirmed that the location is closed.

## Public-safe simulation

- 35 proposed Venue records
- 12 current fallback Game records retained
- 0 migrated Watch Parties
- 0 Fan Intent rows or aggregates
- all 35 `venueHistoryCounts` values remain zero
- 22,248 bytes, approximately 21.7 KiB, uncompressed compact JSON
- private provenance and administrative fields excluded

The measured payload does not indicate that migrated Venue volume alone requires an architecture or performance change. This is an observed size finding, not a latency conclusion: Apps Script response time, cache behavior, CDN conditions, and device rendering cost require separate runtime measurement.

## Approved migration policy

- Existing v1 evidence of a prior Cal watch party may justify initial inclusion as a Community Location.
- The specific event, organizer, and year may be stated when already present in the v1 source.
- No additional historical research or ongoing historical-data maintenance is required.
- Google Maps source links remain private provenance.
- Legacy promotional, ownership, discount, television, and miscellaneous descriptive copy remains excluded unless separately approved.
- The migration timestamp is administrative metadata, not historical venue metadata.

The detailed production-derived candidate, decision, mapping, reconciliation, and checklist files remain outside the public repository. Milestone 6A closeout does not load the private v2 workbook or begin Milestone 6B.
