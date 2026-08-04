# Completed-game and migrated Venue activity

## Approved public behavior

For an upcoming selected game, keep the current-game Fan Intent count as the primary activity message.

When archived Fan Intent exists for completed games in the selected season, show the cumulative season total:

> 12 Bears watched Cal games here this season.

The total counts archived browser-level selections across completed games. It is directional anonymous activity, not a unique-person count across the full season.

When no selected-season total exists, a migrated Venue with reviewed Cal-game or watch-party history uses the same standardized fallback, even when its older evidence sentence did not include the year:

> Bears watched Cal games here in 2025.
>
> Be part of the 2026 season.

The frontend suppresses the more precise evidence sentence when it is used to generate this standardized copy. Venues without reviewed Cal-game or watch-party history receive no migrated-history claim.

## Existing public contract

The normal public snapshot now includes `venueSeasonCounts`, with one row per season and Venue that has archived activity. No additional browser request is introduced. Older last-known-good and static fallback snapshots may omit the collection and are treated as having no season history.

`venueHistoryCounts` remains in the response for backward compatibility but is not used for the approved public season-history wording.

## Manual acceptance after merge

1. Upload the reviewed `apps-script/Code.gs` to the staged Apps Script project.
2. Build a staged snapshot containing two archived selections at one Venue for one completed 2026 Game.
3. Confirm the public snapshot contains one `venueSeasonCounts` row with `count: 2`.
4. Confirm an upcoming 2026 Venue detail shows current-game activity plus the cumulative season sentence.
5. Confirm a migrated Venue with reviewed history and no 2026 archived activity shows only the standardized two-line history treatment.
6. Confirm a Venue without reviewed Cal-game or watch-party history shows no 2025 claim.
7. Run the complete repository, browser, privacy, and exact-SHA validation commands before merge or deployment.

No new OAuth scope, Script Property, Sheet column, MapTiler request, browser identifier exposure, or public attendee identity is introduced.
