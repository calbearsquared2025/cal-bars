# California Golden Bars v2

This repository contains the deployable static frontend and spreadsheet-bound Google Apps Script source for California Golden Bars v2.

## Architecture

- GitHub Pages serves the HTML, CSS, JavaScript, and public fallback data.
- MapLibre renders the map and MapTiler provides map and external place-search data.
- A private Google Spreadsheet stores canonical and raw records.
- Google Apps Script exposes only approved public fields and handles supported writes.
- Google Forms collect Watch Party submissions and manually reviewed contributions or reports.

The private workbook, raw Form responses, submitter contact information, browser identifiers, private exports, and credentials must never be committed.

## Local development

Requirements:

- Node.js 22 or newer
- Python 3 for a simple static server

Run the repository checks:

```bash
npm test
npm run test:browser
npm run validate:data
npm run test:migration
```

Run a local preview:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

The frontend renders the browser last-known-good snapshot or committed fallback first, then refreshes from the configured Apps Script endpoint in the background. While the tab remains visible, it refreshes every 15 minutes and refreshes on return when the last attempt is more than 5 minutes old. Hidden tabs do not poll.

## Operating documentation

- `docs/public-data-contract.md` — public/private data boundary
- `docs/workbook-setup.md` — private workbook and Apps Script setup
- `docs/fan-intent-setup.md` — anonymous selection service
- `docs/external-venue-search.md` — external place search and persistent Community Locations
- `docs/minimal-watch-party-automation.md` — Watch Party Form processing
- `docs/watch-party-form-entry-point.md` — Watch Party Form prefill and schedule maintenance
- `docs/contribution-forms.md` — nomination, listing, Watch Party issue, and missing-location Forms
- `docs/migration/venue-migration.md` — deterministic Venue migration and load validation

The production Pages source remains separate from `main` until v2 release approval. Do not modify `Live-1003` or `v1-production-2026-07-26` through ordinary development work.
