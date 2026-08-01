# Milestone 6A — Existing-location migration tooling

## Scope

This tooling converts an authorized local export of the v1 production `Public` location tab into a deterministic, review-only v2 Venue package. It does not write to Google Sheets, call a network service, create Watch Parties, or modify deployment configuration.

The raw v1 export and production-derived reports must remain outside Git. Only the tool, synthetic fixture, tests, aggregate summary, and this mapping documentation are repository-safe.

## Run

```bash
node scripts/migrate-v1-venues.mjs \
  --input /private/path/v1-public.csv \
  --output /private/path/migration-output \
  --base-snapshot data/fallback-v2.json \
  --migration-timestamp 2026-07-26T00:00:00Z
```

Optional reviewed decisions can be supplied separately:

```bash
node scripts/migrate-v1-venues.mjs \
  --input /private/path/v1-public.csv \
  --output /private/path/migration-output \
  --base-snapshot data/fallback-v2.json \
  --overrides /private/path/reviewed-overrides.json \
  --migration-timestamp 2026-07-26T00:00:00Z
```

An override is keyed by `v1_public_row_NNNN` or source row number. It may set a reviewed disposition, venue type, website, short description, alumni-owned value, and note. Automated decisions remain marked `automated: true`; any override changes that marker to `false` and preserves the review note.

## Source contract

Required v1 headers:

```text
name,address,city,state,zip,lat,lon,url,promo,details,tvs,affiliation,submitted_as,place_id
```

Every populated source row receives one stable source key and exactly one disposition:

- `accepted`
- `probable_duplicate`
- `held_for_review`
- `rejected`

The tool never silently merges rows.

## Venue field mapping

| v1 field | v2 treatment |
|---|---|
| `name` | Whitespace-normalized into `name`. |
| `address` | Whitespace-normalized into `address_line_1`; a trailing `#Suite` or `# Suite` segment is separated into `address_line_2`. |
| `city` | Whitespace-normalized into `city`. |
| `state` | Whitespace-normalized and uppercased into `region`. |
| `zip` | Preserved as text, with accidental numeric `.0` removed and short U.S. ZIPs left-padded. |
| `lat`, `lon` | Parsed as finite decimals and validated against geographic ranges. |
| `url` | Only safe HTTP(S) venue websites are eligible for `website_url`. Bare domains normalize to HTTPS. Google Maps source links remain private provenance and do not publish as venue websites. |
| `place_id` | Private source provenance in `external_place_id`; Google-style identifiers use `external_source = google_places_v1`. |
| `promo`, `details`, `tvs`, `affiliation` | Classification and ambiguity evidence only. They do not automatically populate `short_description` or create Watch Parties. |
| `submitted_as` | Private source provenance only. |

Generated fields:

- `venue_id`: numeric `ven_<digits>` derived deterministically from place identity or normalized address/name.
- `slug`: normalized name plus city; collisions receive deterministic source-key hash suffixes and are reported.
- `country_code`: `US` for the current v1 source contract.
- `verification_status`: proposed `cgb_reviewed` for migration candidates.
- `alumni_owned`: `yes` only for an explicit `Alumni-Owned` source statement; otherwise `unknown`.
- `publication_status`: always `draft` in Milestone 6A.
- `created_at` and `updated_at`: the supplied deterministic administrative migration timestamp, not an inferred historical venue date.
- `short_description`, photo fields, and source submission ID: blank unless later approved through a manual override.

## Classification rules

The automated classifier proposes `cal_bar` only when source text supports repeated or established Cal-community use, such as:

- every-game or every-week activity;
- multiple Watch Parties hosted at the venue;
- a long-running Watch Bar relationship;
- an explicit Game Watch Bar designation;
- annual recurring Big Game activity;
- an occasional but repeated alumni meetup pattern;
- another explicit recurring Cal-fan pattern.

Generic promotional language, alumni ownership alone, willingness to show Cal games, Cal decoration, a single event, or an unsupported “Cal bar” assertion defaults to `community_location` and is flagged when Cal-related evidence remains ambiguous.

A source row that appears to document only one historical Big Game or Watch Party is held for product-owner review. No v1 text creates a Watch Party record.

## Duplicate signals

Possible duplicate groups are deterministic and may be triggered by:

- exact normalized address;
- exact private external/source identifier;
- exact approved website;
- base-slug collision;
- deterministic Venue ID collision;
- coordinates within 100 meters combined with substantial name similarity.

Each group records source rows, matching signals, a proposed primary source row, and conflicting values. Non-primary rows become `probable_duplicate` unless a manual override already controls their disposition.

## Review package

The output directory contains:

- `proposed-venues.csv` and `proposed-venues.json`
- `duplicate-report.csv` and `duplicate-report.json`
- `ambiguity-report.csv`
- `held-records.csv`
- `rejected-records.csv`
- `reconciliation.json`
- `transformation-mapping.md`
- `matthew-review-checklist.md`
- `public-snapshot-simulation.json`
- `snapshot-and-reconciliation.md`
- `manifest.json`

`manifest.json` records deterministic SHA-256 hashes and byte counts for every generated package file. The raw source is never copied into the package.

## Safety boundary

- No Google resource is read or written by the tool.
- No network enrichment occurs.
- No workbook, Form, deployment, MapTiler, DNS, credential, production branch, or rollback branch configuration is present.
- Public simulation uses the canonical public Venue fields only and excludes provenance, draft status, source IDs, and administrative timestamps not already public.
- Raw production-derived outputs remain untracked and should be reviewed through a private handoff.
