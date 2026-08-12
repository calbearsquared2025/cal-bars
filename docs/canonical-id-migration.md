# Canonical ID migration

**Status:** Completed; legacy compatibility retired
**Decision date:** August 3, 2026
**Compatibility retirement:** August 12, 2026

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

## Completed one-time migration

The private `CGBv2` workbook was backed up before mutation. The migration reassigned:

- 35 Venue IDs;
- 12 Game IDs;
- both existing Watch Party Venue/Game foreign-key pairs.

The two existing Watch Party IDs and their source submission IDs already matched the approved format and were preserved.

The migration used the deterministic mapping:

```text
sha256("cgb:v2:<entity>:<legacy_id>") → first 24 hex characters
```

The migration is complete. Canonical IDs are now the only supported runtime Venue and Game identifiers.

## Retired compatibility layer

The temporary compatibility layer used during migration has been retired. The public application no longer:

- publishes or loads an ID alias map;
- rewrites legacy Venue or Game IDs in snapshots;
- rewrites legacy `?game=` query parameters;
- remaps legacy browser-stored selections.

Public snapshots, direct links, browser state, and new writes are expected to contain canonical IDs already. Invalid or obsolete stored selections are pruned rather than migrated.

The former public alias ledger and frontend alias modules were removed after the migration was accepted. The private workbook alias tab may be deleted once the corresponding Apps Script compatibility code has also been retired.

## Current validation requirements

1. Require canonical primary IDs in Venues, Games, Watch Parties, and Fan Intent.
2. Confirm every Watch Party and Fan Intent foreign key references a canonical Venue and Game.
3. Require deployable fallback data to contain canonical IDs directly.
4. Reject `idAliases` from the public snapshot contract.
5. Run the normal unit, data, and browser validation suites before release.

## Rollback

The pre-migration workbook copy remains the historical data rollback boundary. `Live-1003`, the immutable v1 rollback branch, GitHub Pages production settings, DNS, MapTiler settings, and production deployment were not changed by the workbook migration.
