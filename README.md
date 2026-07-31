# Cal Golden Bars

The v2 application remains a static GitHub Pages site using MapLibre, MapTiler, a private Google Spreadsheet, and Google Apps Script.

## Branch roles

- `Live-1003`: current production Pages source; do not modify during v2 development.
- `main`: reviewed v2 integration branch.
- `feature/*` and `release/*`: narrow pull-request branches targeting `main`.
- `v1-production-2026-07-26`: immutable rollback branch.

## Optional local-preview validation

```bash
npm test
npm run validate:data
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. This local server is for diagnostics and development checks; it is not part of routine live-canary acceptance.

## Data, Fan Intent, external venues, and Watch Parties

Milestone 3 adds a separate Fan Intent client and Apps Script service for anonymous join, move, and withdrawal operations. Milestone 4A consolidates the frontend around one canonical application snapshot and state. Milestone 4B adds MapTiler external-place results and the combined `joinExternalVenue` action, which creates or reuses a persistent Community Location only when **I’ll be here** succeeds. Milestone 5A adds the minimal existing-Venue Watch Party Form processor. Milestone 5B adds a disabled-by-default contextual link from a venue and selected game to that Form.

The approved live canary connects automatically to the public Apps Script web app through the `cgb-data-endpoint` metadata in `index.html`; ordinary live-site use does not require local-storage configuration. External search reuses the public MapTiler browser key already loaded by the map and does not add a second credential.

Routine acceptance consists of successful automated tests and data validation, public-response privacy checks, desktop and mobile previews, and a physical-iPhone core-path check. See:

- `docs/fan-intent-setup.md` for the existing Fan Intent deployment and acceptance process.
- `docs/external-venue-search.md` for the external-search architecture, missing-location integration point, Apps Script deployment checklist, and Codespaces/iPhone preview procedure.
- `docs/minimal-watch-party-automation.md` for the Milestone 5A Google Form processor and account-bound setup.
- `docs/watch-party-form-entry-point.md` for the Milestone 5B Form questions, entry-ID discovery, private-test configuration, verification, rollback, and PR #20 caveat.

For optional local-preview diagnostics, the frontend uses this public-read sequence:

1. Optional endpoint override configured only for the current browser origin
2. Browser last-known-good snapshot
3. `data/fallback-v2.json`

`CGBPreview.setDataEndpoint()` remains available for an intentional local override, and `CGBPreview.clearDataEndpoint()` returns the browser to the endpoint configured in HTML. Local endpoint overrides, LAN and alternate-port comparisons, forced failures, repeated cache checks, browser emulation, and manual archival manipulation are diagnostic procedures rather than routine acceptance. No workbook identifier, private row, contact information, browser identifier, or authentication credential is committed.
