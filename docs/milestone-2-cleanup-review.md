# Milestone 2 Cleanup Review

This replacement branch keeps the reviewed Milestone 2 mobile interface and removes the need for runtime interception or library monkey patches.

## Direct safeguards

- Apps Script omits a published venue when latitude or longitude is blank, nonnumeric, or outside valid geographic ranges.
- The frontend rejects a malformed live or cached snapshot through its existing validation boundary and continues to the next configured data source.
- The map container has an explicit viewport-derived height before MapLibre initializes.

## Deliberately not used

- No `window.fetch` wrapping
- No `Storage` prototype modification
- No MapLibre prototype modification
- No bootstrap interception layer
- No separate runtime guard scripts

## Owner review

1. Run `npm test` and `npm run validate:data` after pulling the branch.
2. Serve the branch locally and confirm the map loads with the valid fallback snapshot.
3. Configure the non-production Apps Script endpoint and confirm malformed live data falls back without a MapLibre exception.
4. Correct or set to draft any private `Venues` row marked `published` without valid coordinates.
5. Copy the updated `apps-script/Code.gs` into the private Apps Script project and redeploy the non-production web app before live-endpoint acceptance testing.
