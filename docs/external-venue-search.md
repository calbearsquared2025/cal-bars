# Milestone 4B — External Venue Search and Persistent Community Locations

## Scope

This milestone adds MapTiler external-place search and the combined `joinExternalVenue` write. It does not add Watch Party automation, Cal Bar nomination, listing-update, photo, or other contribution workflows.

Production remains on `Live-1003`. The feature branch and its draft pull request target `main`; neither the production Pages source nor the immutable v1 rollback branch is changed.

## Search architecture

The frontend preserves the Milestone 4A application architecture:

```text
appState.snapshot
  ├── venues
  ├── games
  ├── watchParties
  ├── fanCounts
  └── venueHistoryCounts

appState.externalSearch
  ├── query
  ├── normalized external results
  ├── selected external result
  ├── pending
  ├── retry
  └── error
```

There is no second Venue snapshot, selected-game state, or Fan Intent state.

Search behavior:

1. `app.js` immediately searches the loaded canonical CGB Venue records.
2. `external-venue-search.js` debounces the same query and requests concrete MapTiler `poi,address` results.
3. Existing CGB records and external results appear in separate labeled groups.
4. Selecting an external result stores only a narrow, noncanonical selection and opens the verification dialog.
5. No marker, Venue, count, or permanent selected state is created at selection time.
6. The selected game is copied into the pending external selection and rechecked before the write.
7. Only a successful, validated `joinExternalVenue` response inserts or replaces the canonical public Venue by stable `venue_id`.

If MapTiler search fails, existing CGB suggestions and the existing Venue map/list remain available.

## MapTiler request and normalization

The external adapter uses the existing MapTiler Geocoding API:

```text
GET https://api.maptiler.com/geocoding/{query}.json
  ?key={existing public browser key}
  &language=en
  &limit=6
  &autocomplete=true
  &types=poi,address
```

The adapter accepts only concrete `poi` and `address` features and normalizes them into:

```json
{
  "source": "maptiler",
  "placeId": "poi.example",
  "name": "Example Pub",
  "address": "123 Main St, Oakland, CA 94612, United States",
  "addressLine1": "123 Main St",
  "addressLine2": "",
  "city": "Oakland",
  "region": "CA",
  "postalCode": "94612",
  "countryCode": "US",
  "latitude": 37.8,
  "longitude": -122.2,
  "locationContext": "Oakland, CA, United States",
  "placeType": "poi"
}
```

Results without a provider ID, point coordinates, full address, city, region, or country code are not offered for creation.

### Key handling

The existing application already loads a public MapTiler browser key for its map style. External search reuses that loaded key from the MapTiler resource/style URLs available in the browser. It does not commit a second key, service token, or secret.

The public browser key should remain restricted by allowed HTTP origins in MapTiler. The private workbook ID remains in Apps Script Properties and is not present in this repository.

## External confirmation

The confirmation dialog displays:

- external-place label
- Venue name
- full address
- city/region/country context
- explicit disclosure that the place is not yet a Cal Bar or Community Location
- **I’ll be here**
- Cancel

On iPhone-sized screens it is a safe-area-aware bottom sheet. On wider screens it becomes a centered dialog.

## Combined Apps Script action

Request:

```json
{
  "action": "joinExternalVenue",
  "browserId": "browser_...",
  "gameId": "game_...",
  "externalPlace": {
    "source": "maptiler",
    "placeId": "poi.example",
    "name": "Example Pub",
    "address": "123 Main St, Oakland, CA 94612, United States",
    "addressLine1": "123 Main St",
    "addressLine2": "",
    "city": "Oakland",
    "region": "CA",
    "postalCode": "94612",
    "countryCode": "US",
    "latitude": 37.8,
    "longitude": -122.2
  }
}
```

Processing runs under the existing Apps Script script lock:

1. Validate browser ID, Game ID, open-game status, provider, provider place ID, name, full and structured address, country code, latitude, and longitude.
2. Match an existing Venue by `external_source + external_place_id`.
3. If not matched, compare normalized canonical address fields.
4. Reuse the matched Venue, including a Cal Bar if the external result resolves to an existing Cal Bar.
5. Otherwise create one published `community_location` with a UUID-based stable `venue_id`, unique stable slug, user-added verification, private external identifiers, and timestamps.
6. Reuse or update the browser/game Fan Intent row so only one active Venue remains.
7. Clear the public-snapshot cache.
8. Return the canonical public Venue, active selection, current aggregate counts, and historical aggregate counts.

The response uses the existing Venue public-field whitelist. It omits browser IDs, Fan Intent rows, private external identifiers, publication status, workbook identifiers, contacts, and administrative fields.

## Failure and retry

- Duplicate taps are disabled while the combined write is pending.
- External-search failures and Apps Script creation failures use different copy.
- External selection does not optimistically alter the canonical snapshot.
- Failed creation preserves the selected external result for Retry.
- A newly appended Venue is deleted if the related Fan Intent write fails.
- Updated Fan Intent rows are restored, or an appended Fan Intent row is deleted, if a later step in the combined operation fails.
- No false permanent marker or count remains after failure.

Apps Script and Google Sheets do not provide a general multi-row transaction. The shared script lock plus explicit rollback protects ordinary simultaneous/repeated requests and ordinary write failures within this combined operation. Recovery from catastrophic spreadsheet/service interruption between separate Sheet operations remains a platform limitation and should be monitored during launch hardening.

## Missing-location scheduling conflict

The Product Specification, MVP Implementation Plan, Working Lists, and Repository Audit place the missing-location fallback with external search. The ChatGPT Development Workflow lists the missing-location fallback under Milestone 6 supporting contributions.

This branch applies the smallest reconciled scope:

- It includes the exact copy: **Can’t find the location? Suggest it here.**
- It renders that link only when `cgb-missing-location-form-url` contains a valid HTTPS URL.
- `index.html` contains a blank documented meta configuration point.
- No placeholder production URL is committed.
- No Google Form or other Milestone 6 contribution workflow is built.

Form creation and final URL configuration remain account-bound unresolved work.

## Codespaces preview for physical iPhone acceptance

1. Open the repository in GitHub Codespaces from `feature/external-venue-search`.
2. Run:

   ```bash
   npm test
   npm run validate:data
   python3 -m http.server 8000
   ```

3. In the Codespaces **Ports** panel, locate port `8000`.
4. Set the port visibility to **Public** only for the acceptance session.
5. Open the forwarded HTTPS URL on the desktop first.
6. On the iPhone, open the same forwarded HTTPS URL in Safari.
7. Test existing CGB search, external result groups, confirmation, create/move, Undo, Retry, refresh, game switching, and direct Venue/game links.
8. Return port `8000` to **Private** or stop the server after testing.

The MapTiler key's allowed origins must include the Codespaces forwarded-host pattern or the exact forwarded origin for external search to work. Do not change the production GitHub Pages source for this preview.

## Account-bound deployment checklist

### MapTiler

1. Open the MapTiler Cloud key settings for the key currently used by the site.
2. Confirm the Geocoding API is available for the account and key.
3. Confirm the current quota and expected per-query request usage.
4. Confirm production allowed origins include `https://calgoldenbars.com` and `https://www.calgoldenbars.com` if both are used.
5. Add the approved branch-preview/Codespaces HTTPS origin only for testing, then remove temporary origins when no longer needed.
6. Do not create or paste a private service token into the repository.

### Private Google Sheet and Apps Script

7. Confirm the private `Venues` tab contains the existing columns `external_source` and `external_place_id`; do not add public copies of either field.
8. Confirm all canonical `Venues` headers still match `apps-script/Code.gs` exactly.
9. Add a new Apps Script file named `ExternalVenue.gs` to the bound private Apps Script project.
10. Copy the repository file `apps-script/ExternalVenue.gs` into that Apps Script file.
11. Replace the bound project's `FanIntent.gs` with the branch version.
12. Confirm `Code.gs` remains the branch-compatible current version and the workbook ID remains only in the `CGB_WORKBOOK_ID` Script Property.
13. Save all Apps Script files.
14. Run an owner-only review function or a safe test deployment before production acceptance.
15. Authorize any new spreadsheet permissions requested by Apps Script.
16. Edit the existing web-app deployment, create a new version, keep execution as the owner, and preserve the approved public access setting.
17. Copy the resulting `/exec` URL and compare it with `cgb-data-endpoint` in `index.html`. Update the public endpoint only if Google issued a different deployment URL.
18. Verify the private workbook remains Restricted and is not published to the web.

### Missing-location form

19. If an approved missing-location Google Form already exists, obtain its final HTTPS public form URL.
20. Set that URL as the content value of `cgb-missing-location-form-url` in `index.html` in a separate reviewed commit.
21. If no form exists, leave the meta value blank; the fallback link remains hidden.

### GitHub and iPhone acceptance

22. Keep GitHub Pages configured to `Live-1003` throughout review.
23. Keep `v1-production-2026-07-26` unchanged.
24. Review the draft pull request, automated checks, complete diff, and screenshots.
25. Use the Codespaces procedure above for a physical iPhone preview.
26. On iPhone Safari, test external search success, external search unavailable, create, move, Undo, failed creation and Retry, refresh, game switch, direct link, sharing, and portrait/landscape layout.
27. Test at least one iPhone in-app browser.
28. Do not merge or change the production Pages source until acceptance is explicit.
