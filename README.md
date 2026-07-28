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

## Data and Fan Intent

Milestone 3 adds a separate Fan Intent client and Apps Script service for anonymous join, move, and withdrawal operations. The approved live canary connects automatically to the public Apps Script web app through the `cgb-data-endpoint` metadata in `index.html`; ordinary live-site use does not require local-storage configuration.

Routine acceptance consists of successful automated tests and data validation, a public-response privacy check, one desktop core-path check, and one physical-iPhone core-path check. See `docs/fan-intent-setup.md` for the exact live-canary checklist and the preserved Sheet, Apps Script, privacy, and completed-game archival instructions.

For optional local-preview diagnostics, the frontend uses this public-read sequence:

1. Optional endpoint override configured only for the current browser origin
2. Browser last-known-good snapshot
3. `data/fallback-v2.json`

`CGBPreview.setDataEndpoint()` remains available for an intentional local override, and `CGBPreview.clearDataEndpoint()` returns the browser to the endpoint configured in HTML. Local endpoint overrides, LAN and alternate-port comparisons, forced failures, repeated cache checks, browser emulation, and manual archival manipulation are diagnostic procedures rather than routine acceptance. No workbook identifier, private row, contact information, browser identifier, or authentication credential is committed.
