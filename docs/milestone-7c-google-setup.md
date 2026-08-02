# Milestone 7C — Google Form setup and manual review

Milestone 7C uses a focused Google Form and the standard private Form response sheet. There is no Apps Script processor, trigger, duplicate detector, secondary review tab, or automatic Venue update.

A nomination never changes a public Venue automatically. Matthew reviews the raw response and makes any approved canonical Venue change separately.

## 1. Create the focused Google Form

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

- Store responses in a private response sheet.
- Do not publish response summaries.
- Do not require sign-in.
- Do not collect email automatically in addition to the explicit email question.
- Confirmation text: `Your nomination was received for private review. The public listing will not change automatically.`

No Apps Script trigger is required.

## 2. Capture the two prefill identifiers

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

Do not commit response-sheet IDs, submitter information, or response data.

## 3. Verification

1. Open a canonical Venue detail page and select **Nominate as a Cal Bar**.
2. Confirm Venue name is prefilled at the top and Selected Venue ID is prefilled at the bottom.
3. Submit once on desktop and once on physical iPhone portrait.
4. Confirm both responses appear only in the private Google Form response sheet.
5. Confirm the public snapshot and canonical Venue remain unchanged.

## 4. Manual operating procedure

For each nomination:

1. Read the raw Form response.
2. Follow up with the submitter when necessary.
3. Decide whether the Venue meets the editorial Cal Bar standard.
4. If approved, manually update the canonical Venue record through the normal controlled process.
5. Draft a concise public explanation or pull quote during Milestone 8 polish.

Multiple nominations for one Venue are not treated as an error; they may provide useful corroborating evidence.
