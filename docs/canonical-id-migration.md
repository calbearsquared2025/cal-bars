# Canonical ID migration

**Status:** Approved contract; private workbook migrated; runtime integration remains under review
**Decision date:** August 3, 2026

## Contract

Canonical entity IDs are opaque, immutable relationship keys. They do not encode dates, sequence numbers, locations, season order, or other business meaning.

| Entity | Canonical form |
|---|---|
| Venue | `venue_<24 lowercase hex>` |
| Game | `game_<24 lowercase hex>` |
| Watch Party | `wp_<24 lowercase hex>` |
| Fan Intent | `fi_<24 lowercase hex>` |
| Watch Party submission | `wps_<24 lowercase hex>` |

Private submission workflows may use other approved entity-specific prefixes, but every generated token must use 24 lowercase hexadecimal characters.

## One-time migration

The private `CGBv2` workbook was backed up before mutation. The migration then reassigned:

- 35 Venue IDs;
- 12 Game IDs;
- both existing Watch Party Venue/Game foreign-key pairs.

The two existing Watch Party IDs and their source submission IDs already matched the approved format and were preserved.

A private `ID_Aliases` tab records all 47 old-to-new mappings using mapping version `sha256-v1`. The mapping is deterministic:

```text
sha256("cgb:v2:<entity>:<legacy_id>") → first 24 hex characters
```

The public-safe mapping is mirrored in `data/id-aliases.json`. It contains identifiers only and no workbook identifier, contact information, browser identifier, raw response, or administrative note.

## Compatibility requirement

Legacy Venue and Game IDs remain permanent aliases. Runtime entry points must resolve them before canonical lookup so these continue to work:

- old prefilled Google Form links;
- browser-stored game/venue selections;
- direct links or cached public snapshots containing an old ID;
- delayed form submissions created before the migration.

All new writes must store only canonical IDs. Alias values must never be written as new primary or foreign keys.

## Validation requirements

Before merging runtime integration:

1. Validate the 47-entry alias manifest against deterministic `sha256-v1` output.
2. Require canonical primary IDs in Venues, Games, Watch Parties, and Fan Intent.
3. Resolve aliases at all public and Form write boundaries.
4. Confirm every Watch Party and Fan Intent foreign key references a canonical Venue and Game.
5. Canonicalize the deployable fallback and synthetic fixtures.
6. Remap browser-stored selections without losing a valid choice.
7. Run the complete unit, data, browser, migration, and private-value test suites.
8. Run the owner-only workbook integrity helper against the staged or production-bound workbook.

## Rollback

The pre-migration workbook copy is the data rollback boundary. `Live-1003`, the immutable v1 rollback branch, GitHub Pages production settings, DNS, MapTiler settings, and production deployment were not changed by the workbook migration.
