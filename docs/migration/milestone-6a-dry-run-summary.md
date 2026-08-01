# Milestone 6A dry-run aggregate summary

**Source snapshot:** authorized v1 production `Public` location tab archived July 26, 2026

**Migration timestamp:** `2026-07-26T00:00:00Z`

**Status:** review-only; no v2 workbook load

## Reconciliation

| Metric | Result |
|---|---:|
| v1 source rows | 36 |
| Proposed accepted Venues | 32 |
| Proposed Cal Bars | 16 |
| Proposed Community Locations | 16 |
| Held for Matthew review | 4 |
| Rejected rows | 0 |
| Suspected duplicate groups | 0 |
| Rows in suspected duplicate groups | 0 |
| Rows excluded from candidate dataset | 4 |
| All source rows accounted for exactly once | Yes |

The four held rows appear to document a single historical Big Game or Watch Party without enough source evidence of durable recurring venue value. The private review package identifies the source rows and preserves the supporting source text. No row was rejected for missing core location data, invalid coordinates, or malformed identity fields in this source snapshot.

## Public-safe simulation

- 32 proposed Venue records
- 12 current fallback Game records retained
- 0 migrated Watch Parties
- 0 Fan Intent rows or aggregates
- approximately 20.0 KiB uncompressed compact JSON
- private provenance and administrative fields excluded

The measured payload does not indicate that migrated Venue volume alone requires an architecture or performance change. This is an observed size finding, not a latency conclusion: Apps Script response time, cache behavior, CDN conditions, and device rendering cost require separate runtime measurement.

## Review required

Matthew must decide the four held-record dispositions, review all conservative Community Location classifications that retain Cal-related evidence, confirm that source Google Maps links remain private rather than becoming venue websites, and approve the 32-record candidate count and 16/16 classification split before Milestone 6B.

The detailed production-derived candidate, ambiguity, held-record, mapping, reconciliation, and checklist files remain outside the public repository.
