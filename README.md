# California Golden Bars v2

This public repository contains the deployable California Golden Bars implementation and the development/test assets required to maintain it safely. Canonical product planning, audits, raw operational data, credentials, and other private account-bound material are maintained outside this repository.

## Architecture

- GitHub Pages serves the HTML, CSS, JavaScript, and public fallback data.
- MapLibre renders the map and MapTiler provides map and external place-search data.
- A private Google Spreadsheet stores canonical and raw records.
- Google Apps Script exposes only approved public fields and handles supported writes.
- Google Forms collect Watch Party submissions and manually reviewed contributions or reports.

Browser-required configuration such as public service endpoints or client keys must be treated as public. Security must come from provider restrictions, server-side validation, and the public/private data boundary rather than obscuring client-visible values.

Never commit the private workbook, raw Form responses, submitter contact information, concrete browser identifiers, private exports, credentials, internal planning documents, or private audit reports.

## Local development

Requirements:

- Node.js 22 or newer
- Python 3 for a simple static server

Run the repository checks:

```bash
npm test
npm run test:browser
npm run validate:data
npm run validate:private
npm run test:migration
```

Run a local preview:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

The frontend renders the browser last-known-good snapshot or committed fallback first, then refreshes from the configured Apps Script endpoint in the background. While the tab remains visible, it refreshes every 15 minutes and refreshes on return when the last attempt is more than 5 minutes old. Hidden tabs do not poll.

## Implementation documentation

The `docs/` directory contains code-facing setup and maintenance notes. Canonical product requirements, planning, audits, and project-control documentation belong only in the private planning repository.

Do not modify `Live-1003` or `v1-production-2026-07-26` through ordinary development work.
