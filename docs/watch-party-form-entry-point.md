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

The link opens the existing Google Form in a new browser context and prepopulates only:

- canonical `venue_id`
- venue name as a human-readable reference
- selected canonical `game_id`

The action remains hidden when the configuration or venue/game context is missing or invalid. Fan Intent, browser identifiers, raw responses, contacts, processing fields, workbook identifiers, and Apps Script deployment details are never added to the generated URL.

## Official 2026 schedule and stable Game IDs

The repository fallback now contains the verified 12-game 2026 regular-season schedule. The owner-only `apps-script/Official2026Schedule.gs` helper can upsert the same rows into the private canonical `Games` tab.

All confirmed times below are Pacific. A blank kickoff remains `kickoff_status = tbd` and renders as the confirmed date followed by **Time TBD**.

| Game ID | Form reference | Date | Kickoff |
|---|---|---|---|
| `game_2026_01` | UCLA at Cal | Sat, Sep 5 | 7:30 PM |
| `game_2026_02` | Cal at Syracuse | Sat, Sep 12 | 12:30 PM |
| `game_2026_03` | Wagner at Cal | Sat, Sep 19 | 12:30 PM |
| `game_2026_04` | Clemson at Cal | Fri, Sep 25 | 7:30 PM |
| `game_2026_05` | Cal at UNLV | Sat, Oct 3 | 12:30 PM |
| `game_2026_06` | Virginia Tech at Cal | Sat, Oct 10 | Time TBD |
| `game_2026_07` | Wake Forest at Cal | Sat, Oct 17 | Time TBD |
| `game_2026_08` | Cal at SMU | Sat, Oct 24 | Time TBD |
| `game_2026_09` | Cal at NC State | Sat, Oct 31 | Time TBD |
| `game_2026_10` | Cal at Virginia | Sat, Nov 14 | Time TBD |
| `game_2026_11` | Stanford at Cal | Sat, Nov 21 | Time TBD |
| `game_2026_12` | Pittsburgh at Cal | Sat, Nov 28 | Time TBD |

To populate or refresh the private Sheet after copying the new Apps Script file into the spreadsheet-bound project, run:

```js
upsertOfficial2026Schedule();
```

The helper updates existing rows by `game_id`, appends missing rows, preserves unrelated Games, and clears the public snapshot cache after success. This account-bound action is not performed by the repository PR.

## Required Google Form questions

Use the Milestone 5A processor labels below. Do not add a separate start-time question.

### Prefilled context questions

1. **Venue ID (existing)**
   - Type: Short answer
   - Required
   - Prefilled by the site with the canonical `venue_id`
2. **Venue Name**
   - Type: Short answer
   - Recommended as required for a readable private response log
   - Prefilled by the site as a reference only
   - The processor continues to use `venue_id` as the relationship key
3. **Game(s)**
   - Type: Checkboxes for multi-game support, or Short answer for the narrow private test
   - Required
   - The site prefills the selected canonical `game_id`

### Current Game-field limitation

Google Forms does not support separate machine values and display labels for checkbox or multiple-choice options. The current accepted processor expects exact canonical Game IDs, so a Form option such as **UCLA at Cal — Sat, Sep 5** will not yet resolve to `game_2026_01`.

For the immediate private test, use the exact Game IDs in the Form or use a Short answer field populated by the contextual link. This proves the relationship and auto-publication flow, but it is not the preferred production presentation.

The preferred production correction is a backend resolver that accepts approved human-readable Form labels and maps each one to its canonical `game_id` before publication. That change belongs in the Watch Party processor and should be implemented after PR #20 is resolved so the two backend changes remain reviewable rather than modifying the same processor in parallel. `getOfficial2026GameFormChoices()` returns the recommended readable label-to-ID references for that follow-up.

### Processor-required questions

4. **Organizer Name** — Short answer, required
5. **Submitter Role** — Multiple choice, required
   - `Fan`
   - `Venue owner or manager`
   - `Alumni group`

### Recommended structured questions

6. **Organizer Type** — Multiple choice
   - `Alumni group`
   - `Venue`
   - `Other organization`
   - `Individual`
   - `Unknown`
7. **Official Event URL** — Short answer, optional
8. **Age Policy** — Multiple choice
   - `All ages`
   - `21+`
   - `Unknown`
9. **Sound Status** — Multiple choice
   - `On`
   - `Off`
   - `Unknown`
10. **Restrictions Note** — Paragraph, optional
11. **Game Day Note** — Paragraph, optional; use for early-arrival or special timing details

Optional submitter name or email questions may remain private in the Form response sheet. They are not prefilled by the site and are not included in the public snapshot.

Set the Form confirmation message to:

> Your watch party has been added.

## Website validation

The event website is still validated. The question is where validation occurs.

Google Forms' built-in URL validation generally expects a complete URL such as `https://example.com`. It can reject a bare domain such as `example.com` before Apps Script receives the response. Because the approved correction in PR #20 is intended to accept either format and normalize a bare domain to HTTPS, the Form question should be an optional **Short answer** without built-in URL validation after PR #20 is active.

Apps Script then performs the authoritative validation and normalization. This approach accepts the user-friendly input while still rejecting malformed values, credentials, whitespace, and non-web schemes.

If the product instead decides to require complete HTTP(S) URLs and reject bare domains, Google Forms URL validation may be enabled. That would reverse the previously requested `example.com` behavior.

## Obtain the Google Forms entry IDs

1. Open the Form in edit mode.
2. Select **More** (`⋮`) and **Get pre-filled link**.
3. Enter unmistakable sample values in **Venue ID (existing)**, **Venue Name**, and **Game(s)**.
4. Select **Get link**, then copy the generated URL.
5. In the URL query string, match each sample value to its `entry.<digits>` parameter.
6. Record the complete `entry.<digits>` value for each of the three questions.
7. Verify that all three entry IDs are different.

The frontend accepts either `entry.123456789` or the numeric portion `123456789`; it normalizes numeric values to the standard `entry.` form.

## Repository configuration points

The disabled defaults are the four empty meta tags in `index.html`:

```html
<meta name="cgb-watch-party-form-url" content="">
<meta name="cgb-watch-party-venue-id-entry" content="">
<meta name="cgb-watch-party-venue-name-entry" content="">
<meta name="cgb-watch-party-game-id-entry" content="">
```

Do not replace these empty values with Matthew's account-specific values in the Milestone 5B branch.

### Private-test configuration without a commit

On the HTTPS preview origin, open the browser developer console and run:

```js
CGBWatchPartyForm.setConfig({
  formUrl: 'https://docs.google.com/forms/d/e/FORM_ID/viewform',
  venueIdEntry: 'entry.111111111',
  venueNameEntry: 'entry.222222222',
  gameIdEntry: 'entry.333333333'
});
```

The helper validates the URL and entry IDs, stores the values only in that browser origin's local storage, and rerenders the current venue detail. Refreshing the page preserves the private-test configuration in that browser.

Remove the private-test configuration with:

```js
CGBWatchPartyForm.clearConfig();
```

Clearing configuration is also the rollback method for disabling the CTA in a test browser.

### Physical-iPhone test without an iPhone developer console

Use an uncommitted preview-only edit in a Codespace or local checkout:

1. Check out `feature/m5b-watch-party-form-entry-point`.
2. Replace the four empty `content` values in `index.html` with the test Form URL and the three entry IDs.
3. Do not commit or push the edited file.
4. Start the existing static preview and open its HTTPS forwarded URL on the iPhone.
5. Complete the physical-iPhone checklist.
6. Run `git restore index.html` immediately after testing.
7. Run `git status --short` and confirm no account-specific Form value remains in the working tree.

This is a test-only bridge. The draft PR and production branch remain disabled.

## Production-configuration constraint

The Form URL and `entry.<digits>` identifiers are not credentials and should not be treated as security secrets. Anyone who can open the public Form or inspect a generated prefilled link can discover them.

The actual constraint was narrower: the implementation instruction prohibited committing Matthew's account-specific values to source control. Because the static browser needs those public identifiers at runtime, the PR could not both obey that restriction and ship an active production link.

Production therefore needs one explicit activation choice:

- place the public Form URL and entry IDs in reviewed source configuration; or
- return them through a small public runtime configuration from the existing Apps Script layer.

The second method keeps the values out of Git history but does not make them secret. It merely centralizes configuration and permits changes without another frontend commit. Private values such as the workbook ID, raw responses, contacts, and credentials remain outside the public configuration.

## Verify the generated prefilled link

1. Populate or refresh the canonical Games rows.
2. Configure the test browser with non-sensitive Form configuration.
3. Open a direct venue/game route such as `?venue=<slug>&game=game_2026_01`.
4. Confirm the venue detail shows the normal submission copy when no party exists.
5. Confirm a venue with an existing selected-game Watch Party shows **Add Another Watch Party**.
6. Inspect the link and confirm:
   - the original Form origin and path are preserved
   - existing Form query parameters remain
   - `usp=pp_url` is present unless already configured
   - the venue ID parameter equals the canonical `venue_id`
   - the venue-name parameter is decoded correctly, including punctuation and non-ASCII text
   - the game parameter equals the selected canonical `game_id`
7. Open the link and confirm the three Form answers are populated correctly.
8. Change the selected game while remaining on the venue detail and confirm the generated link changes only the game context.
9. Clear or remove the test configuration and confirm the CTA disappears without affecting venue detail, Watch Party rendering, or Fan Intent.

## PR #20 website-field caveat

Implementation PR #20, **Normalize bare Watch Party website domains**, is separate and is not required for this entry point.

Until PR #20 is merged and its revised `apps-script/WatchPartyAutomation.gs` is copied into the spreadsheet-bound Apps Script project:

- do not claim that `example.com` is accepted
- the current processor requires a complete HTTP(S) URL

After PR #20 is merged and installed, configure **Official Event URL** as an optional **Short answer** question without Google Forms' built-in URL validation.

## Account-bound actions not performed by this PR

This repository change does not create or edit the Google Form, link it to the Sheet, install a trigger, copy Apps Script code, run `upsertOfficial2026Schedule()`, deploy Apps Script, change GitHub Pages, change DNS, or change MapTiler.
