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
| `game_2026_01` | `Sep 5 — Cal vs. UCLA` |
| `game_2026_02` | `Sep 12 — Cal at Syracuse` |
| `game_2026_03` | `Sep 19 — Cal vs. Wagner` |
| `game_2026_04` | `Sep 25 — Cal vs. Clemson` |
| `game_2026_05` | `Oct 3 — Cal at UNLV` |
| `game_2026_06` | `Oct 10 — Cal vs. Virginia Tech` |
| `game_2026_07` | `Oct 17 — Cal vs. Wake Forest` |
| `game_2026_08` | `Oct 24 — Cal at SMU` |
| `game_2026_09` | `Oct 31 — Cal at NC State` |
| `game_2026_10` | `Nov 14 — Cal at Virginia` |
| `game_2026_11` | `Nov 21 — Cal vs. Stanford` |
| `game_2026_12` | `Nov 28 — Cal vs. Pittsburgh` |

Frontend and Apps Script derive the label from canonical `game_date`, `home_away`, and `opponent_name`. Kickoff time is deliberately excluded. Apps Script accepts these readable labels and legacy canonical Game IDs. Unknown labels and games that are not upcoming fail before publication.

## Processing behavior

On a valid submission, Apps Script:

1. Preserves the original Form response in `Watch_Party_Submissions_Raw`.
2. Recognizes finalized friendly titles before legacy aliases.
3. Resolves every readable game choice to a canonical `game_id`.
4. Validates the existing published venue, upcoming games, and required structured fields.
5. Normalizes organizer type, submitter relationship, age, audio, and optional event URL.
6. Creates one canonical Watch Party per selected game.
7. Leaves `event_start_at` blank.
8. Stores the combined public note in `game_day_note`.
9. Keeps Contact Email only in the private raw response.
10. Marks the raw response processed and clears the public snapshot cache only after canonical publication succeeds.

Google Forms may retain columns from deleted or renamed questions. Do not delete historical response columns or manually rename Form-owned headers. The processor trims header whitespace and supports legacy titles.

## Event-link validation

Accepted examples include:

- `example.com`
- `www.example.com/event`
- `https://example.com/event`
- `http://example.com/event`

Bare domains are stored with an `https://` prefix. Whitespace, credentials, malformed authorities, and non-web schemes are rejected before publication.

This branch incorporates the URL-normalization work previously isolated in draft PR #20. Do not also merge PR #20 after this branch lands.

## Resolve permanent Form configuration

The frontend requires public routing identifiers for:

- Form URL
- **Venue ID (existing)** entry ID
- **Venue Name** entry ID
- **Which game or games will have a Watch Party here?** entry ID

Install `apps-script/WatchPartyFormConfig.gs` in the spreadsheet-bound Apps Script project and run:

```javascript
inspectWatchPartyFormPrefillConfiguration()
```

The owner-only helper reads the Form linked to `Watch_Party_Submissions_Raw`, verifies the required question titles and types, and returns/logs the Form URL and three `entry.<digits>` values. It creates no response and exposes no private response data.

After verification, commit the returned values to the four reviewed meta tags in `index.html`:

```html
<meta name="cgb-watch-party-form-url" content="https://docs.google.com/forms/d/e/.../viewform">
<meta name="cgb-watch-party-venue-id-entry" content="entry.111111111">
<meta name="cgb-watch-party-venue-name-entry" content="entry.222222222">
<meta name="cgb-watch-party-game-id-entry" content="entry.333333333">
```

The checkbox configuration name remains `gameIdEntry` for compatibility, but the prefilled value is the readable Form choice rather than the canonical `game_id`.

There is no browser-console or local-storage configuration path. The CTA remains safely hidden until all four reviewed values are present and valid.

## Acceptance checks

1. Copy revised `apps-script/WatchPartyAutomation.gs` and new `apps-script/WatchPartyFormConfig.gs` into the bound Apps Script project.
2. Save the project.
3. Confirm the spreadsheet **On form submit** trigger still targets `onWatchPartyFormSubmit`.
4. Run `inspectWatchPartyFormPrefillConfiguration()` and commit the returned public routing values.
5. Open a venue detail for `game_2026_01` and confirm the real Form preselects `Sep 5 — Cal vs. UCLA` plus the correct venue name and ID.
6. Select a second game and submit.
7. Confirm the private raw row preserves readable labels and optional Contact Email.
8. Confirm one canonical Watch Party exists per selected game, with no contact email and blank `event_start_at`.
9. Test a bare-domain event link and confirm the canonical URL begins with `https://`.
10. Confirm the public snapshot and website show the new Watch Parties without private fields.
11. Repeat the entry-point test in physical iPhone portrait mode.

No Google Sheet schema change is required.

## Weekly maintenance

Planning issue #8 records the recurring season checklist:

- review official schedule changes
- update the canonical `Games` tab
- keep Form date-and-matchup choices synchronized with canonical dates
- remove completed games from Form choices without deleting historical canonical Games or Watch Parties
- clear and verify the public snapshot after schedule changes
- update `data/fallback-v2.json` through a reviewed repository change when schedule data changes materially

A date change requires updating the Form choice. The backend mapping is derived from canonical Games data and does not require a hard-coded mapping-table edit.
