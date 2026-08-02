# Milestone 7C — Google setup and verification

The repository implementation stores Cal Bar nominations privately for manual review. A submission never changes a public Venue automatically.

## 1. Prepare the private workbook

In the Apps Script project bound to the confirmed private v2 workbook:

1. Add `apps-script/CalBarNomination.gs`.
2. Run `verifyCalBarNominationWorkbook()`.
3. Run `prepareCalBarNominationWorkbook()` once.
4. Run `verifyCalBarNominationWorkbook()` again and confirm `ok: true`.

The helper appends private review fields for alumni-group affiliation, alumni ownership, Cal memorabilia, other Cal context, processing state, duplicate reference, and errors.

## 2. Create the focused Google Form

Title: `Nominate a Cal Bar`

Description:

`A Cal Bar is a place that feels meaningfully connected to the Cal community. Tell us why this venue belongs on the list. Consider whether Cal fans gather there regularly, an alumni association or Cal group is affiliated with it, it is alumni-owned or operated, it displays Cal memorabilia, or it has another recurring Cal connection. Nominations are reviewed manually and do not change the public listing automatically.`

Create these questions in this order:

1. `Venue name` — Short answer — required. Prefilled when launched from a Venue page.
2. `What makes this a Cal Bar?` — Paragraph — required.
   - Description: `Describe the Cal community connection in your own words. This may include recurring gatherings, alumni-group involvement, alumni ownership, Cal memorabilia, traditions, or another reason the venue feels like a Cal home.`
3. `How often do Cal fans gather here?` — Multiple choice — required:
   - `Most Cal football games`
   - `Several times per season`
   - `At least once per season`
   - `Other recurring schedule`
   - `Not sure`
4. `Is an alumni association or Cal group affiliated with this venue?` — Multiple choice — required:
   - `Yes`
   - `No`
   - `Not sure`
5. `Is the venue Cal alumni-owned or operated?` — Multiple choice — required:
   - `Yes`
   - `No`
   - `Not sure`
6. `Does the venue display Cal memorabilia or other visible Cal identity?` — Multiple choice — required:
   - `Yes`
   - `No`
   - `Not sure`
7. `Other Cal connection or supporting context` — Paragraph — optional.
8. `Your relationship to this venue` — Multiple choice — required:
   - `Venue owner or staff`
   - `Alumni group organizer`
   - `Regular attendee`
   - `Occasional attendee`
   - `Other`
9. `Your name` — Short answer — required.
10. `Your email` — Short answer — required; enable email validation.
11. `Selected Venue ID` — Short answer — optional. Put this last and prefill it from the Venue page. Description: `Internal reference; please do not change when prefilled.`

Form settings:

- Do not publish response summaries.
- Do not require sign-in.
- Do not collect email automatically in addition to the explicit email question.
- Confirmation text: `Your nomination was received for private review. The public listing will not change automatically.`

## 3. Link responses and install the trigger

1. Link the Form to the confirmed private v2 workbook.
2. Confirm the destination is private and is not an archived resource.
3. In Apps Script, add a trigger:
   - Function: `processCalBarNominationFormSubmit`
   - Deployment: `Head`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`

## 4. Capture the two prefill identifiers

Use **Get pre-filled link** and enter recognizable values for:

- `Venue name`
- `Selected Venue ID`

Record only:

- Form URL
- Venue name entry ID
- Selected Venue ID entry ID

Add them to `index.html` as:

- `cgb-cal-bar-nomination-form-url`
- `cgb-cal-bar-nomination-venue-name-entry`
- `cgb-cal-bar-nomination-venue-id-entry`

Do not commit workbook IDs, response-sheet IDs, submitter information, or response data.

## 5. Verification

1. Open a canonical Venue detail page and select **Nominate as a Cal Bar**.
2. Confirm Venue name is prefilled at the top and Selected Venue ID is prefilled at the bottom.
3. Submit once on desktop and once on physical iPhone portrait.
4. Confirm each private row is `needs_review` unless it is correctly marked as a duplicate.
5. Run `buildPublicSnapshotForReview()` and confirm no nomination, submitter, contact, reviewer, processing, or error field appears publicly.
6. Confirm the Venue remains unchanged until Matthew manually approves and separately edits the canonical Venue record.

A future polish milestone may add a reviewed one- or two-sentence `Why this is a Cal Bar` pull quote to the public Venue presentation. That public-copy workflow is not part of 7C.
