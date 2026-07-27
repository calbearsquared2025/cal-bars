# California Golden Bars

This repository contains the public static website for California Golden Bars.

## Branch roles

- `Live-1003`: current GitHub Pages production source; do not modify during v2 development.
- `main`: v2 integration branch.
- `feature/*` and `release/*`: reviewable milestone branches targeting `main`.
- `v1-production-2026-07-26`: immutable rollback branch.

## Milestone 1: read-only data foundation

The additive files introduced in `feature/data-foundation` define the v2 public data boundary without changing the current frontend or production data source:

- `docs/public-data-contract.md`: public response and stable-ID rules
- `docs/workbook-setup.md`: private workbook and Apps Script setup steps
- `apps-script/Code.gs`: staged read-only Apps Script endpoint and workbook-tab setup
- `data/fallback-v2.json`: synthetic public-safe fallback/test snapshot
- `scripts/validate-v2-data.mjs`: dependency-free contract validator
- `tests/data-foundation.test.mjs`: focused privacy and integrity tests

The fallback records are synthetic and are not production listings or events.

## Local validation

Requires a current Node.js runtime; no package installation is required.

```bash
npm run validate:data
npm test
```

For browser work, serve the repository through HTTP rather than opening files directly:

```bash
python3 -m http.server 8000
```

## Privacy

Never commit workbook identifiers, Apps Script deployment URLs, raw form responses, contact information, browser identifiers, private spreadsheet exports, or credentials. The private v2 workbook is accessed only through a field-whitelisted Apps Script API.
