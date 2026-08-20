# Completed-game and Venue activity

## Approved public behavior

For an upcoming selected game, keep the current-game Fan Intent count as the primary activity message.

When archived Fan Intent exists for completed games in the selected season, show the cumulative season total:

> 12 Bears watched Cal games here this season.

The total counts archived browser-level selections across completed games. It is directional anonymous activity, not a unique-person count across the full season.

For an upcoming game, the prior-season baseline is shown only when the Venue has both:

- zero current-game Fan Intent; and
- zero archived Fan Intent in the selected season.

The baseline copy is evergreen:

> Bears watched Cal games here last season.
>
> Be part of the 2026 season.

As soon as current-game Fan Intent or archived selected-season activity exists, drop the prior-season baseline and use the normal current-season activity messaging.

The frontend does not inspect `short_description` or infer historical activity from venue-specific migration wording. Existing venue descriptions remain independent editorial content.

Completed-game views continue to use archived selected-season activity. When none exists, they show that no Cal-game activity is recorded for the season rather than presenting a live zero count.

## Existing public contract

The normal public snapshot includes `fanCounts` for current-game aggregate activity and `venueSeasonCounts`, with one row per season and Venue that has archived activity. No additional browser request is introduced. Older last-known-good and static fallback snapshots may omit `venueSeasonCounts` and are treated as having no archived season history.

`venueHistoryCounts` remains in the response for backward compatibility but is not used for the approved public season-history wording.

## Manual acceptance

1. Confirm an upcoming Venue with zero current-game Fan Intent and zero archived 2026 activity shows **Bears watched Cal games here last season.** and **Be part of the 2026 season.**
2. Confirm adding current-game Fan Intent immediately removes that two-line baseline, even before any completed 2026 game exists.
3. Confirm an upcoming Venue with archived 2026 activity shows the cumulative **Bears watched Cal games here this season.** sentence instead of the prior-season baseline.
4. Confirm Venue description wording does not change whether the baseline appears.
5. Confirm a completed-game view with archived activity uses the season total and does not show a live zero count.

No new OAuth scope, Script Property, Sheet column, MapTiler request, browser identifier exposure, public attendee identity, or backend change is introduced.
