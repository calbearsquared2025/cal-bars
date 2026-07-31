# Cal Golden Bars v2

This repository contains the static GitHub Pages frontend and spreadsheet-bound Apps Script source for California Golden Bars v2.

## Local validation

Requirements:

- Node.js 22 or newer
- Python 3 for a simple static development server

Run the complete automated suite:

```bash
npm test
npm run test:browser
npm run validate:data
```

Run a local static preview:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. This local server is for diagnostics and development checks; it is not part of routine live-canary acceptance.

## Data, Fan Intent, external venues, and Watch Parties

Milestone 3 adds a separate Fan Intent client and Apps Script service for anonymous join, move, and withdrawal operations. Milestone 4A consolidates the frontend around one canonical application snapshot and state. Milestone 4B adds MapTiler external-place results and the combined `joinExternalVenue` action, which creates or reuses a persistent Community Location only when **I’ll be here** succeeds. Milestone 5A adds the minimal existing-Venue Watch Party Form processor. Milestone 5B adds a disabled-by-default contextual link from a venue and selected game to that Form.

The private canonical `Games` tab and the committed fallback both contain the verified 12-game 2026 regular-season schedule with stable IDs `game_2026_01` through `game_2026_12`. The private Sheet is the normal live-data source; `data/fallback-v2.json` is a development and endpoint-failure recovery snapshot. Update the private `Games` tab first, clear the public snapshot cache, validate the Apps Script response, and then update the fallback through a reviewed repository change. Do not maintain a separate Apps Script copy of the schedule.

The approved live canary connects automatically to the public Apps Script web app through the `cgb-data-endpoint` metadata in `index.html`; ordinary live-site use does not require local-storage configuration. External search reuses the public MapTiler browser key already loaded by the map and does not add a second credential.

Routine acceptance consists of successful automated tests and data validation, public-response privacy checks, desktop and mobile previews, and a physical-iPhone core-path check. See:

- `docs/fan-intent-setup.md` for the existing Fan Intent deployment and acceptance process.
- `docs/external-venue-search.md` for the external-search architecture, missing-location integration point, Apps Script deployment checklist, and Codespaces/iPhone preview procedure.
- `docs/minimal-watch-party-automation.md` for the Milestone 5A Google Form processor and account-bound setup.
- `docs/watch-party-form-entry-point.md` for the Milestone 5B schedule IDs, Form questions, entry-ID discovery, private-test configuration, verification, rollback, and PR #20 caveat.

For optional local-preview diagnostics, the frontend uses this public-read sequence:

1. configured Apps Script endpoint
2. browser last-known-good snapshot
3. committed `data/fallback-v2.json`

The production Pages source remains separate from `main` until v2 acceptance and launch approval.
