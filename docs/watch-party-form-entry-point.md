# Milestone 5B — Watch Party Form entry point

## Scope

The venue detail page can show:

> Is there a watch party going on?
>
> **Submit a Watch Party**

The link opens the existing Google Form in a new browser context and prepopulates only:

- canonical `venue_id`
- venue name as a human-readable reference
- selected canonical `game_id`

The action remains hidden when the configuration or venue/game context is missing or invalid. Fan Intent, browser identifiers, raw responses, contacts, processing fields, workbook identifiers, and Apps Script deployment details are never added to the generated URL.

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
   - The current processor continues to use `venue_id` as the relationship key
3. **Game(s)**
   - Type: Checkboxes for multi-game support, or Short answer for the narrow private test
   - Required
   - The selected option/value must be the exact canonical `game_id`
   - The site prefills the currently selected `game_id`

For a checkbox question, each option must be the exact canonical `game_id`; otherwise the current processor will reject the value as an unknown Game ID. Put a readable schedule mapping in the question description rather than changing the option value.

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

## Production-configuration constraint

A static GitHub Pages browser must receive the Form URL and entry IDs to build a prefilled link. Therefore, values used in production cannot be secret from site visitors even if they are not committed to source control.

This milestone deliberately leaves production disabled. After review, Matthew must approve a separate production configuration method before deployment:

- a reviewed configuration-only source change, which would make the values public in Git history; or
- a small public runtime configuration supplied by the existing Apps Script layer, which avoids a source commit but requires an approved API/configuration change and redeployment.

The current instruction prohibits committing Matthew's actual values, so this PR does not choose or implement either production activation path. Private testing uses the browser-local helper above.

## Verify the generated prefilled link

1. Configure the test browser with non-sensitive test values.
2. Open a direct venue/game route such as `?venue=<slug>&game=<game_id>`.
3. Confirm the venue detail shows the approved prompt and action.
4. Right-click or inspect **Submit a Watch Party** and confirm:
   - the original Form origin and path are preserved
   - existing Form query parameters remain
   - `usp=pp_url` is present unless already configured
   - the venue ID parameter equals the canonical `venue_id`
   - the venue-name parameter is decoded correctly, including punctuation and non-ASCII text
   - the game parameter equals the selected canonical `game_id`
5. Open the link and confirm the three Form answers are populated correctly.
6. Change the selected game while remaining on the venue detail and confirm the generated link changes only the game context.
7. Clear the configuration and confirm the CTA disappears without affecting venue detail, Watch Party rendering, or Fan Intent.

## PR #20 website-field caveat

Implementation PR #20, **Normalize bare Watch Party website domains**, is separate and is not required for this entry point.

Until PR #20 is merged and its revised `apps-script/WatchPartyAutomation.gs` is copied into the spreadsheet-bound Apps Script project:

- do not claim that `example.com` is accepted
- the current processor requires a complete HTTP(S) URL

After PR #20 is merged and installed, configure **Official Event URL** as an optional **Short answer** question without Google Forms' built-in URL validation. That validation can reject a bare domain before Apps Script can normalize it.

## Account-bound actions not performed by this PR

This repository change does not create or edit the Google Form, link it to the Sheet, install a trigger, copy Apps Script code, set browser-local production values, deploy Apps Script, change GitHub Pages, change DNS, or change MapTiler.
