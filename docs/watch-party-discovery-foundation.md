# Milestone 5A — Watch Party Discovery Foundation

## Scope

This milestone adds the private schema and pure processing rules required before Watch Party Form processing. It does not install a Form trigger, process a raw response, create a canonical Venue or Watch Party, or clear the public snapshot cache.

Approved flow:

```text
raw Form response / private research / demo
        → Watch_Party_Discovery
        → validation + idempotency + trusted Venue resolution
        → canonical Watch_Parties
        → public snapshot cache invalidation after complete success
```

## Added Apps Script foundation

`apps-script/WatchPartyDiscovery.gs` defines:

- the complete private `Watch_Party_Discovery` header contract
- controlled source kinds, candidate statuses, raw processing statuses, and candidate enums
- conditional canonical `discovery_id` and `publication_key` requirements
- owner-only workbook verification and additive preparation helpers
- candidate, Game ID, URL, and controlled-value normalization and validation
- deterministic discovery-delivery and canonical publication keys
- candidate status transitions and status-repair decisions
- trusted Venue resolution decisions
- retry and partial multi-Game publication plans
- the rule that cache invalidation is permitted only after every intended canonical row exists

The file contains no public endpoint action and no live publication write path.

## Owner-only workbook helpers

### `verifyWatchPartyDiscoveryWorkbook()`

Read-only. Reports whether:

- `Watch_Party_Discovery` exists with the exact approved schema
- `Watch_Parties` includes private `discovery_id` and `publication_key` columns
- `Watch_Party_Submissions_Raw` includes private `discovery_id`

### `prepareWatchPartyDiscoveryWorkbook()`

Additive, owner-only preparation for a later approved account-bound step. It:

- creates `Watch_Party_Discovery` only when missing
- refuses a non-empty discovery tab whose headers differ from the approved schema
- appends only missing approved private columns to existing canonical/raw tabs
- does not alter data rows
- does not create triggers, Venues, Watch Parties, deployments, or cache invalidations

Do not run either helper against the owner workbook as part of Milestone 5A.

## Trusted Venue resolution

The pure resolver applies this order:

1. Use one valid published submitted `venue_id`.
2. Match a supported trusted place source and identifier to one published Venue.
3. Match a complete normalized structured address to exactly one published Venue.
4. Propose normalized Community Location data only from a complete verified MapTiler place result with a supported place ID and valid coordinates.
5. Otherwise retain the candidate privately as `needs_venue_resolution` or `needs_research`.

A venue name, flat/free-text address, city-only value, source URL, or research inference is never sufficient to propose public Venue creation.

## Idempotency and recovery

- `source_kind + source_record_id` produces a deterministic private discovery-delivery key.
- Redelivery returns the existing `discovery_id` when exactly one candidate already has that key.
- `discovery_id + game_id` produces a deterministic canonical publication key.
- A retry after full success returns existing `watch_party_id` values.
- A partial multi-Game retry identifies only missing Game rows for creation.
- Duplicate stored keys are surfaced as private errors rather than silently selected.
- Existing canonical rows are authoritative when repairing raw/discovery status drift.
- Cache invalidation is allowed only when all intended publication keys exist exactly once.

The later write path must recheck these keys and references under the accepted shared Apps Script script lock and 10-second timeout convention.

## Privacy boundary

The public snapshot whitelist remains unchanged. Tests verify that it cannot expose discovery rows, raw submissions, source URLs, contacts, validation errors, research notes, private failures, workbook identifiers, or browser identifiers. Discovery-only decisions do not call the cache-clearing helper.

## Deliberate limitations for Milestone 5B

Two implementation details remain for the Form-processing stage without changing approved behavior:

1. The approved discovery schema stores trusted source identity and a flat candidate address, but not a full structured place payload. Form processing must either persist the approved trusted fields available from the Form or re-resolve trusted place data before proposing a new Community Location. This milestone accepts structured place data only as private pure-function input and does not add unapproved schema fields.
2. The discovery schema does not contain a canonical `source_type_candidate`. Form processing must map the trusted Form/source context to the existing canonical `source_type` controlled values without inferring it from a source URL.

Neither limitation blocks the schema and pure-domain foundation.

## Manual actions

None. Do not modify the private workbook, Google Form, triggers, Apps Script deployment, MapTiler configuration, DNS, Pages settings, production branch, or rollback branch for this milestone.
