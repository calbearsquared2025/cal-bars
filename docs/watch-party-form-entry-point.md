# Milestone 5B — Watch Party Form entry point

## Scope

When the selected venue has no active Watch Party for the selected game, the venue detail page shows:

> Is there a watch party going on?
>
> **Submit a Watch Party**

When an active Watch Party already exists for that venue and game, the contribution copy changes to:

> Is there another watch party going on?
>
> **Add Another Watch Party**

The link opens the finalized Google Form in a new browser context and prefills only:

- canonical `venue_id`
- venue name as a human-readable reference
- the readable checkbox label for the selected canonical game

The action remains hidden when configuration or venue/game context is missing or invalid. Fan Intent, browser identifiers, raw responses, contacts, processing fields, workbook identifiers, and Apps Script deployment details are never added to the generated URL.

## Final Google Form contract

The finalized Form is titled **Cal Golden Bars Watch Party Submission** and uses the following questions.

### Prefilled context

1. **Venue Name**
   - Short answer
   - Required
   - Prefilled from the selected canonical venue
   - Human-readable confirmation only; the processor continues to use `venue_id` as the relationship key
2. **Which game or games will have a Watch Party here?**
   - Checkboxes
   - Required
   - The selected game is prechecked by the site
   - Additional games at the same venue may be selected
3. **Venue ID (existing)**
   - Short answer
   - Required
   - Prefilled with the canonical `venue_id`
   - Positioned at the bottom because it is a technical reference

### Required organizer information

4. **Organizer or host name**
   - Short answer
   - Required
5. **Who is organizing or hosting this Watch Party?**
   - Multiple choice
   - Required
   - `Alumni group`
   - `Venue`
   - `Other organization`
   - `Individual or group of fans`
   - `Not Sure`
6. **What is your relationship to this Watch Party?**
   - Multiple choice
   - Required
   - `I represent the alumni group or organization hosting it`
   - `I represent the venue hosting it`
   - `I am organizing it as an individual or group of fans`
   - `I am sharing a public event organized by someone else`

### Optional public event information

7. **Official event or RSVP link**
   - Short answer
   - Optional
   - No Google Forms complete-URL validation
   - Apps Script accepts a bare domain or complete HTTP(S) URL and stores a normalized HTTP(S) URL
8. **Are there age restrictions?**
   - Multiple choice
   - Optional
   - `All ages`
   - `21+ Only`
   - Blank normalizes to canonical `unknown`
9. **Will the game audio be on?**
   - Multiple choice
   - Optional
   - `Yes`
   - `No`
   - Blank normalizes to canonical `unknown`
10. **Anything else fans should know?**
    - Paragraph
    - Optional
    - Stored in canonical `game_day_note`
    - The former separate restrictions field remains available for legacy or administrative records but is not collected separately by the final public Form

### Optional private contact

11. **Contact Email**
    - Short answer with email validation
    - Optional
    - Preserved only in the private raw Form response
    - Never copied into a canonical Watch Party row or the public snapshot

Do not add a start-time question. Canonical `event_start_at` remains blank for this form workflow. Legacy raw start-time columns and values remain intact and are ignored by the processor.

## Readable game labels

The Form presents date-and-matchup checkbox choices rather than canonical IDs:

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

The frontend and Apps Script both derive this label from canonical `game_date`, `home_away`, and `opponent_name`. Kickoff times are deliberately excluded, so a kickoff moving from TBD to confirmed does not require a Form-label change.

Apps Script accepts the readable labels and retains support for canonical Game IDs in older raw responses. Unknown labels fail before publication.

## Processing behavior

On a valid submission, Apps Script:

1. Preserves the complete original Form response in `Watch_Party_Submissions_Raw`.
2. Reads the finalized friendly question titles while retaining aliases for older question titles.
3. Resolves each readable game choice to a canonical `game_id` from the private `Games` tab.
4. Validates the existing published venue and required structured fields.
5. Normalizes organizer type, submitter relationship, age policy, audio status, and optional event URL.
6. Creates one canonical Watch Party row per selected game.
7. Leaves `event_start_at` and `restrictions_note` blank for the finalized Form workflow.
8. Stores the combined public note in `game_day_note`.
9. Keeps Contact Email only in the private raw response.
10. Marks the raw response processed and clears the public snapshot cache only after canonical publication succeeds.

The linked response Sheet may retain columns from deleted or renamed Form questions. Do not delete historical response columns or manually rename Google-owned question headers. The processor trims header whitespace and prioritizes the finalized titles before legacy aliases.

## Event-link validation

The Form field remains optional and does not use Google Forms' complete-URL validation.

Accepted examples:

- `example.com`
- `www.example.com/event`
- `https://example.com/event`
- `http://example.com/event`

Bare domains are stored with an `https://` prefix. Whitespace, credentials, malformed authorities, and non-web schemes are rejected before publication.

This branch now includes the behavior previously isolated in draft PR #20. PR #20 should not also be merged after this branch lands.

## Obtain the three Google Forms entry IDs

The permanent frontend configuration still requires the entry IDs for:

- **Venue ID (existing)**
- **Venue Name**
- **Which game or games will have a Watch Party here?**

In the Form editor:

1. Select **More** (`⋮`) and **Get pre-filled link**.
2. Enter unmistakable sample values in the three fields above.
3. For the game field, select one exact existing checkbox choice.
4. Select **Get link** and copy the complete generated URL.
5. Match each sample value to its `entry.<digits>` query parameter.
6. Confirm all three entry IDs are different.

The frontend configuration continues to call the checkbox entry `gameIdEntry` for compatibility, but the parameter value is now the exact readable Form choice, not the canonical `game_id`.

## Repository configuration points

The disabled defaults remain the four meta tags in `index.html`:

```html
<meta name="cgb-watch-party-form-url" content="">
<meta name="cgb-watch-party-venue-id-entry" content="">
<meta name="cgb-watch-party-venue-name-entry" content="">
<meta name="cgb-watch-party-game-id-entry" content="">
```

After the real entry IDs are verified, replace the empty values through a narrow reviewed commit. These are public routing identifiers, not credentials.

Until that configuration commit is accepted, browser-local testing remains available:

```js
CGBWatchPartyForm.setConfig({
  formUrl: 'https://docs.google.com/forms/d/e/FORM_ID/viewform',
  venueIdEntry: 'entry.111111111',
  venueNameEntry: 'entry.222222222',
  gameIdEntry: 'entry.333333333'
});
```

Remove browser-local configuration with:

```js
CGBWatchPartyForm.clearConfig();
```

## Acceptance checks

1. Copy the revised `apps-script/WatchPartyAutomation.gs` into the spreadsheet-bound Apps Script project.
2. Save the project. A web-app redeployment is required only if the deployed project version must include the revised processor source; the spreadsheet form-submit trigger uses saved bound-project code.
3. Confirm the existing spreadsheet **On form submit** trigger still targets `onWatchPartyFormSubmit`.
4. Obtain and configure the three Form entry IDs.
5. Open a venue detail for `game_2026_01` and confirm the generated Form link preselects `Sep 5 — Cal vs. UCLA` plus the correct venue name and ID.
6. Select a second game in the Form and submit.
7. Confirm the private raw row preserves the readable checkbox labels and optional Contact Email.
8. Confirm one canonical Watch Party row exists per selected game, with no contact email and blank `event_start_at`.
9. Test a bare-domain event link and confirm the canonical URL begins with `https://`.
10. Confirm the public snapshot and website show the new Watch Parties after refresh.
11. Repeat the entry-point test in physical iPhone portrait mode.

## Weekly maintenance

Planning issue #8 records the recurring season checklist. Weekly maintenance includes:

- reviewing official schedule changes
- updating the canonical `Games` tab
- keeping Form date-and-matchup choices synchronized with canonical dates
- pruning completed games from the Form choices without deleting historical canonical Game or Watch Party records
- clearing and verifying the public snapshot after schedule changes
- updating `data/fallback-v2.json` through a reviewed repository change when canonical schedule data changes materially

A date change requires updating the Form choice. The backend mapping itself is derived from the canonical Games data and does not require a hard-coded code-table edit.
