# Milestone 5B — Watch Party Form entry point

## Scope

When the selected venue has no active Watch Party for the selected upcoming game, the venue detail page shows:

> Is there a watch party going on?
>
> **Submit a Watch Party**

When an active Watch Party already exists for that venue and game, it shows:

> Is there another watch party going on?
>
> **Add Another Watch Party**

The action opens the finalized Google Form in a new secure browser context and prefills only:

- canonical `venue_id`
- venue name as a readable reference
- the exact readable checkbox label for the selected canonical game

The action remains hidden when configuration or venue/game context is missing or invalid, and for games whose `game_status` is not `upcoming`. Fan Intent, browser identifiers, raw responses, contacts, processing fields, workbook identifiers, and Apps Script deployment details are never added to the generated URL.

## Final Google Form contract

The finalized Form is titled **Cal Golden Bars Watch Party Submission**.

### Prefilled context

1. **Venue Name**
   - Short answer
   - Required
   - Readable confirmation only; `venue_id` remains the relationship key
2. **Which game or games will have a Watch Party here?**
   - Checkboxes
   - Required
   - The selected game is prechecked
   - Additional games at the same venue may be selected
3. **Venue ID (existing)**
   - Short answer
   - Required
   - Canonical technical reference positioned at the bottom

### Required organizer information

4. **Organizer or host name**
5. **Who is organizing or hosting this Watch Party?**
   - `Alumni group`
   - `Venue`
   - `Other organization`
   - `Individual or group of fans`
   - `Not Sure`
6. **What is your relationship to this Watch Party?**
   - `I represent the alumni group or organization hosting it`
   - `I represent the venue hosting it`
   - `I am organizing it as an individual or group of fans`
   - `I am sharing a public event organized by someone else`

### Optional public information

7. **Official event or RSVP link**
   - No Google Forms complete-URL validation
   - Apps Script accepts a bare domain or complete HTTP(S) URL
8. **Are there age restrictions?**
   - `All ages`
   - `21+ Only`
   - Blank normalizes to `unknown`
9. **Will the game audio be on?**
   - `Yes`
   - `No`
   - Blank normalizes to `unknown`
10. **Anything else fans should know?**
    - Paragraph
    - Stored in canonical `game_day_note`

### Optional private contact

11. **Contact Email**
    - Short answer with email validation
    - Preserved only in the private raw response
    - Never copied into a canonical Watch Party or public snapshot

Do not add a start-time question. Canonical `event_start_at` remains blank for this workflow. Legacy raw start-time and restrictions columns remain intact and are ignored by the finalized Form path.

## Readable game labels

| Canonical Game ID | Form choice |
|---|---|
| `game_9e8f4860c6a256c0fae6007d` | `Sep 5 — Cal vs. UCLA` |
| `game_64902a48440e55522742d631` | `Sep 12 — Cal at Syracuse` |
| `game_98623ba154f59012256c39ac` | `Sep 19 — Cal vs. Wagner` |
| `game_bf8616724877adc20fb78ac9` | `Sep 25 — Cal vs. Clemson` |
| `game_416f957fa7bbd325fa2d9b13` | `Oct 3 — Cal at UNLV` |
| `game_d865a3e1eac52bbbd848d545` | `Oct 10 — Cal vs. Virginia Tech` |
| `game_2d86d2a1538503a070d1ee68` | `Oct 17 — Cal vs. Wake Forest` |
| `game_5f8281482583c43917f6f2a5` | `Oct 24 — Cal at SMU` |
| `game_6bc7b90491088cca24f8ca52` | `Oct 31 — Cal at NC State` |
| `game_f4ebc4f05457bb40f3bc66ab` | `Nov 14 — Cal at Virginia` |
| `game_ca62dd014907c6fdcc7520bd` | `Nov 21 — Cal vs. Stanford` |
| `game_1535f732d3d1061b8e8cf07e` | `Nov 28 — Cal vs. Pittsburgh` |

Frontend and Apps Script derive the label from canonical `game_date`, `home_away`, and `opponent_name`. Kickoff time is deliberately excluded. Apps Script accepts these readable labels and canonical Game IDs. Unknown labels and games that are not upcoming fail before publication.

## Processing behavior

On a valid submission, Apps Script:

1. Preserves the original Form response in `Watch_Party_Submissions_Raw`.
2. Recognizes finalized friendly titles before historical question-title variants.
3. Resolves readable game choices and canonical Game IDs to canonical `game_id` values.
4. Requires the submitted canonical `venue_id` to match an existing Venue.
5. Validates the existing published venue, upcoming games, and required structured fields.
6. Normalizes organizer type, submitter relationship, age, audio, and optional event URL.
7. Creates one canonical Watch Party per selected game.
8. Leaves `event_start_at` blank.
9. Stores the combined public note in `game_day_note`.
10. Keeps Contact Email only in the private raw response.
11. Marks the raw response processed and clears the public snapshot cache only after canonical publication succeeds.

Google Forms may retain columns from deleted or renamed questions. Do not delete historical response columns or manually rename Form-owned headers. The processor trims header whitespace and supports historical question titles, but Venue and Game identifiers must be canonical.

## Event-link validation

Accepted examples include:

- `example.com`
- `www.example.com/event`
- `https://example.com/event`
- `http://example.com/event`

Bare domains are stored with an `https://` prefix. Whitespace, credentials, malformed authorities, and non-web schemes are rejected before publication.

## Verified permanent Form configuration

The owner-only helper `inspectWatchPartyFormPrefillConfiguration()` verified the Form linked to `Watch_Party_Submissions_Raw` and returned these public routing identifiers:

```html
<meta
  name="cgb-watch-party-form-url"
  content="https://docs.google.com/forms/d/e/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ/viewform"
>
<meta name="cgb-watch-party-venue-id-entry" content="entry.1451856849">
<meta name="cgb-watch-party-venue-name-entry" content="entry.307282250">
<meta name="cgb-watch-party-game-id-entry" content="entry.1519015315">
```

These values are committed in `index.html`. They are public Google Forms routing identifiers, not credentials.

The checkbox configuration name remains `gameIdEntry` for compatibility, but the prefilled value is the readable Form choice rather than the canonical `game_id`.

There is no browser-console or local-storage configuration path.

### Apps Script authorization

`inspectWatchPartyFormPrefillConfiguration()` uses `FormApp.openByUrl()` and therefore requires Google Forms authorization.

When the bound Apps Script project's `appsscript.json` explicitly lists `oauthScopes`, it must include:

```text
https://www.googleapis.com/auth/forms
```

After adding that scope, run the inspector manually from the Apps Script editor so Google can display the authorization prompt. Installed triggers cannot request new authorization interactively.

## Acceptance checks

Completed before the canonical-ID migration:

1. Revised `apps-script/WatchPartyAutomation.gs` installed in the bound Apps Script project.
2. `apps-script/WatchPartyFormConfig.gs` installed.
3. Forms OAuth scope authorized.
4. Permanent Form URL and all three entry IDs verified and committed.

Required after deploying the canonical-ID branch:

1. Confirm the spreadsheet **On form submit** trigger still targets `onWatchPartyFormSubmit`.
2. Open a venue detail for canonical game `game_9e8f4860c6a256c0fae6007d` and confirm the real Form preselects `Sep 5 — Cal vs. UCLA` plus the correct canonical Venue ID and name.
3. Select a second game and submit.
4. Confirm the private raw row preserves readable labels and optional Contact Email.
5. Confirm one canonical Watch Party exists per selected game, with no contact email and blank `event_start_at`.
6. Test a bare-domain event link and confirm the canonical URL begins with `https://`.
7. Confirm the public snapshot and website show the new Watch Parties without private fields.
8. Repeat the entry-point test in responsive desktop and physical iPhone portrait mode.

No contribution-sheet schema change is required.

## Weekly maintenance

Planning issue #8 records the recurring season checklist:

- review official schedule changes
- update the canonical `Games` tab
- keep Form date-and-matchup choices synchronized with canonical dates
- remove completed games from Form choices without deleting historical canonical Games or Watch Parties
- clear and verify the public snapshot after schedule changes
- update `data/fallback-v2.json` through a reviewed repository change when schedule data changes materially

A date change requires updating the Form choice. The backend mapping is derived from canonical Games data and does not require a hard-coded mapping-table edit.
