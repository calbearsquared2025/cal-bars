# Venue migration and load validation

The migration tooling converts an authorized local export of the legacy production `Public` tab into a deterministic, review-only v2 Venue package. It does not read or write Google resources, call network services, create Watch Parties, or modify deployment configuration.

Raw production exports, generated candidate rows, private provenance, workbook exports, preserved Venue IDs, and review reports must remain outside Git.

## Requirements

- Node.js 22 or newer
- An authorized local CSV export with these headers:

```text
name,address,city,state,zip,lat,lon,url,promo,details,tvs,affiliation,submitted_as,place_id
```

## Generate a migration package

```bash
node scripts/migrate-v1-venues.mjs \
  --input /private/path/v1-public.csv \
  --output /private/path/migration-output \
  --base-snapshot data/fallback-v2.json \
  --overrides config/migration/milestone-6a-approved-overrides.json \
  --migration-timestamp 2026-07-26T00:00:00Z
```

Omit `--overrides` for an unreconciled baseline run.

The retained override filename is historical, but the file is an operationally required immutable record of the accepted product-owner review decisions. Do not repurpose it as a general data source or edit it casually.

Each populated source row receives a stable source key and exactly one disposition:

- `accepted`
- `probable_duplicate`
- `held_for_review`
- `rejected`

The tool never silently merges source rows.

## Generated package

The output directory may contain:

- `proposed-venues.csv` and `proposed-venues.json`
- duplicate, ambiguity, held, and rejected reports
- reconciliation and transformation summaries
- a product-owner review checklist
- a public-snapshot simulation
- `manifest.json` with deterministic SHA-256 hashes and byte counts

The raw source is not copied into the generated package.

## Field and classification rules

- Venue IDs and slugs are deterministic.
- Addresses, ZIP codes, coordinates, and supported URLs are normalized and validated.
- Google Maps source links remain private provenance rather than public venue websites.
- Legacy promotional text does not automatically become a public description.
- Historical source text never creates a Watch Party, Fan Intent row, timeline, or attendance count.
- A recurring or established Cal-community pattern may support `cal_bar`; uncertain or one-time activity defaults to `community_location` unless deliberately reviewed.
- Migration candidates remain `draft` until a separate controlled load publishes them.

## Validate a workbook load

Export the canonical `Venues` tab to a private CSV, then compare it with the approved migration CSV:

```bash
node scripts/validate-venue-load.mjs \
  --approved /private/path/proposed-venues.csv \
  --actual /private/path/workbook-venues.csv \
  --preserve-venue-ids ven_preserved_1,ven_preserved_2 \
  --approved-publication-status published \
  --report /private/path/venue-load-report.json
```

The validator rejects:

- schema drift
- missing approved Venue IDs
- unexpected non-allowlisted Venues
- changed canonical fields
- missing preserved Venues
- duplicate Venue IDs or slugs
- approved-set hash mismatches

Only the explicitly requested migration `draft` to workbook `published` status transformation is permitted.

Run the focused migration tests with:

```bash
npm run test:migration
```

## Safety boundary

- Keep the private workbook, raw source, exports, backups, contacts, browser identifiers, and review notes outside Git.
- Do not modify `Live-1003` or `v1-production-2026-07-26` during migration work.
- Do not load a generated package without product-owner review, a private workbook backup, exact readback validation, and a reviewed change plan.
- Re-run public-data validation after any accepted canonical data change.
