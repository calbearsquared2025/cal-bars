# Watch Party Form automation

## Scope

The active processor handles the accepted existing-Venue workflow:

```text
Google Form response
  → private Watch_Party_Submissions_Raw row
  → validation and normalization
  → one canonical Watch Party per selected Game
  → raw processing result
  → public snapshot cache invalidation when public data changed
```

The workflow requires an existing published Venue with valid coordinates. It does not create Venues from free text and does not activate `WatchPartyDiscovery.gs`.

## Publication behavior

A valid response may select one or more Games. Each selected Game has one publication identity:

```text
source_submission_id + game_id
```

The processor now acquires a script lock before reading or writing shared Sheet state. It waits for up to 30 seconds. If the lock cannot be acquired, it returns the private error code `watch_party_processing_busy` without changing the raw processing fields or canonical Watch Parties.

The raw row's canonical `submission_id` is created only when blank and is reused on every later delivery or repair attempt. Before writing, the processor reads existing Watch Parties with that `source_submission_id` and creates only missing Game rows.

This means:

- repeated delivery returns the existing Watch Party IDs rather than creating duplicates;
- a partially completed multi-Game submission creates only the missing Game rows;
- a retry after canonical rows were written but the raw success update failed repairs the raw row without republishing the event;
- a redelivery of an already processed response does not clear the public cache again;
- recovery of a prior public write whose cache was not cleared performs one cache invalidation.

The processor does not attempt semantic duplicate detection across two different human Form submissions. Separate submissions may still intentionally describe separate Watch Parties at the same Venue and Game.

## Supported Form contract

The processor recognizes the finalized friendly question titles documented in `docs/watch-party-form-entry-point.md`, including:

- `Venue ID (existing)`
- `Which game or games will have a Watch Party here?`
- `Organizer or host name`
- `Who is organizing or hosting this Watch Party?`
- `What is your relationship to this Watch Party?`
- `Official event or RSVP link`
- `Are there age restrictions?`
- `Will the game audio be on?`
- `Anything else fans should know?`
- `Contact Email`

Legacy labels remain accepted for historical raw responses. Readable game labels are resolved to canonical Game IDs. Form-created `event_start_at` remains blank and the linked Game supplies date and kickoff information.

A bare domain event link is normalized to HTTPS. Malformed or unsafe URLs fail before publication. Formula-leading public strings are stored as literal text at the canonical Sheet boundary.

`Contact Email` remains only in the private raw response. It is not copied to a canonical Watch Party or the public snapshot.

## Raw processing states

The active path uses:

```text
new
processed
error
```

On success, `created_watch_party_ids` contains the complete ordered list for the selected Games, including previously existing rows reused during recovery. On an ordinary processing error, any canonical rows already associated with the submission are retained in that private field so a later retry can reconcile them.

## Manual Google actions

1. Replace `apps-script/WatchPartyAutomation.gs` in the spreadsheet-bound Apps Script project with the reviewed branch version.
2. Keep the response tab named `Watch_Party_Submissions_Raw`.
3. Do not delete historical Form-response columns.
4. Confirm the installed trigger remains:
   - function: `onWatchPartyFormSubmit`
   - event source: **From spreadsheet**
   - event type: **On form submit**
5. Run `prepareMinimalWatchPartyAutomation()` and confirm the six private processing columns remain present.
6. In a non-production or controlled staged response, submit one test event and confirm the raw row becomes `processed` and one canonical row is created per selected Game.
7. Re-run the same raw response through the processor and confirm no additional Watch Party row is created.

No public web-app deployment is required for this Apps Script change.

## Intentional exclusions

- semantic duplicate detection across separate submissions
- dormant discovery processing
- queues, background retry services, or compensation frameworks
- free-text Venue creation or geocoding
- contributor or administrative dashboards
- frontend, Form-question, public endpoint, or schema expansion
