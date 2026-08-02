# Milestone 7C — Google setup and verification

The repository implementation stores nominations privately for review. It never changes a public Venue automatically.

## 1. Prepare the private workbook

In the Apps Script editor bound to the confirmed private v2 workbook:

1. Add the accepted repository file `apps-script/CalBarNomination.gs` to the project.
2. Run `verifyCalBarNominationWorkbook()` first.
3. Run `prepareCalBarNominationWorkbook()` once.
4. Run `verifyCalBarNominationWorkbook()` again and confirm `ok: true`.

The helper appends these private columns to `Cal_Bar_Nominations_Raw` without replacing existing columns:

`address`, `city`, `region`, `postal_code`, `country_code`, `website_url`, `source_response_key`, `processing_status`, `processing_error`, `processed_at`, `duplicate_submission_id`.

## 2. Create the focused Google Form

Title: `Nominate a Cal Bar`

Description:

`Nominate a location where Cal alumni or fans gather on a recurring basis. A nomination is reviewed before any public listing changes. Submitting this form does not automatically make a venue a Cal Bar.`

Create questions with these exact titles and settings:

1. `Selected Venue ID` — Short answer — optional.
2. `Venue name` — Short answer — required.
3. `Street address` — Short answer — required when Selected Venue ID is blank.
4. `City` — Short answer — required when Selected Venue ID is blank.
5. `State / region` — Short answer — required when Selected Venue ID is blank.
6. `Postal code` — Short answer — optional.
7. `Country code` — Short answer — optional; description `Two-letter code, such as US.`
8. `Venue website` — Short answer — optional.
9. `Why should this be a Cal Bar?` — Paragraph — required.
10. `How often do Cal fans gather here?` — Multiple choice — required. Options: `Most Cal football games`, `Several times per season`, `At least once per season`, `Other recurring schedule`.
11. `Supporting link` — Short answer — optional.
12. `Your relationship to this venue` — Multiple choice — required. Options: `Venue owner or staff`, `Alumni group organizer`, `Regular attendee`, `Other`.
13. `Your name` — Short answer — optional.
14. `Your email` — Short answer — required; enable email validation.
15. `Photo link` — Short answer — optional.

Form settings:

- Do not publish response summaries.
- Do not collect email automatically in addition to the explicit email question.
- Do not require sign-in.
- Do not permit respondents to edit responses.
- Confirmation text: `Your nomination was received for private review. The public listing will not change automatically.`

## 3. Link responses and install the trigger

1. Link the Form to the confirmed private v2 workbook.
2. Confirm the response destination is private and not the public workbook or an archived resource.
3. In Apps Script, open **Triggers** → **Add Trigger**.
4. Function: `processCalBarNominationFormSubmit`.
5. Deployment: `Head`.
6. Event source: `From spreadsheet`.
7. Event type: `On form submit`.
8. Authorize using the owner account.

## 4. Capture frontend prefill identifiers

Use Google Forms **Get pre-filled link**, enter recognizable test values in the first six location questions, and copy the generated URL. Record:

- Form URL.
- `Selected Venue ID` entry ID.
- `Venue name` entry ID.
- `Street address` entry ID.
- `City` entry ID.
- `State / region` entry ID.
- `Postal code` entry ID.

Do not commit a private workbook ID, response-sheet ID, submitter information, or any response data.

## 5. Verification submissions

Existing Venue test:

1. Open a canonical Venue detail page.
2. Select **Nominate as a Cal Bar**.
3. Confirm Venue ID, name, address, city, region, and postal code are prefilled.
4. Submit on desktop and confirm one private row with `processing_status = needs_review`.

No-existing-Venue test:

1. Open the base nomination Form directly.
2. Leave Selected Venue ID blank.
3. Enter structured location fields and submit from iPhone portrait.
4. Confirm one private row with `processing_status = needs_review`.

Duplicate test:

1. Submit the same canonical Venue again.
2. Confirm `processing_status = duplicate` and `duplicate_submission_id` references the earlier private nomination.

Privacy test:

1. Run `buildPublicSnapshotForReview()`.
2. Confirm no nomination, email, submitter name, reviewer note, processing field, source key, or error appears.
3. Confirm the canonical Venue type and publication status did not change.

## 6. Repository configuration still required

After the Form URL and six entry IDs are available, add these public, non-secret meta values to `index.html` on the 7C branch:

- `cgb-cal-bar-nomination-form-url`
- `cgb-cal-bar-nomination-venue-id-entry`
- `cgb-cal-bar-nomination-venue-name-entry`
- `cgb-cal-bar-nomination-address-entry`
- `cgb-cal-bar-nomination-city-entry`
- `cgb-cal-bar-nomination-region-entry`
- `cgb-cal-bar-nomination-postal-code-entry`

The nomination CTA remains hidden until all values form a valid Google Forms prefill contract.
