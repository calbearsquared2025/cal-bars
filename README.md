# Cal Golden Bars

The v2 application remains a static GitHub Pages site using MapLibre, MapTiler, a private Google Spreadsheet, and Google Apps Script.

## Branch roles

- `Live-1003`: current production Pages source; do not modify during v2 development.
- `main`: reviewed v2 integration branch.
- `feature/*` and `release/*`: narrow pull-request branches targeting `main`.
- `v1-production-2026-07-26`: immutable rollback branch.

## Local validation

```bash
npm test
npm run validate:data
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Data and Fan Intent configuration

The frontend uses this public-read sequence:

1. Non-production Apps Script endpoint configured only in browser local storage
2. Browser last-known-good snapshot
3. `data/fallback-v2.json`

Milestone 3 adds a separate Fan Intent client and Apps Script write service for anonymous join, move, and withdrawal operations. The same endpoint is used for public reads and writes. Configure it in a non-production browser with:

```js
CGBPreview.setDataEndpoint('PASTE_NON_PRODUCTION_APPS_SCRIPT_URL_HERE')
```

No deployment URL, workbook identifier, private row, contact information, or browser identifier is committed. See `docs/fan-intent-setup.md` for Sheet, Apps Script, privacy, and acceptance instructions.
