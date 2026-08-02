# Contribution and issue-report Forms

California Golden Bars uses separate Google Forms for manually reviewed contributions and reports. These Forms do not write to canonical Venue or Watch Party records automatically. Responses and submitter details remain private.

## Common settings

For every Form in this document:

- Publish for anyone with the link.
- Link responses to the existing private CGB workbook.
- Keep response sheets and summaries private.
- Do not require Google sign-in or limit users to one response.
- Do not collect a verified Google email address automatically.
- Do not enable response editing, receipts, quizzes, shuffled questions, or public result summaries.
- Do not install an Apps Script trigger unless a separate operating document explicitly requires one.
- Never commit edit URLs, response-sheet identifiers, responses, names, email addresses, or reviewer notes.

After any Form question is recreated, reordered, or replaced, generate a new prefilled link and verify that the public entry IDs configured in `index.html` are still correct.

## Nominate a Cal Bar

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSdlXsf9M0Rzru8F_0orKqSu-rc4HSY8NxzAUQxMlMSEFkmhTQ/viewform`

Configured application fields:

- Venue name: `entry.2017964730`
- Selected Venue ID: `entry.272269917`

Questions, in order:

1. `Venue name` — required short answer; prefilled.
2. `What makes this a Cal Bar?` — required paragraph.
3. `How often do Cal fans gather here?` — required multiple choice:
   - `Most Cal football games`
   - `Several times per season`
   - `At least once per season`
   - `Other recurring schedule`
   - `Not sure`
4. `Is an alumni association or Cal group affiliated with this venue?` — required: `Yes`, `No`, or `Not sure`.
5. `Is the venue Cal alumni-owned or operated?` — required: `Yes`, `No`, or `Not sure`.
6. `Does the venue display Cal memorabilia or other visible Cal identity?` — required: `Yes`, `No`, or `Not sure`.
7. `Other Cal connection or supporting context` — optional paragraph.
8. `Your relationship to this venue` — required multiple choice:
   - `Venue owner or staff`
   - `Alumni group organizer`
   - `Regular attendee`
   - `Occasional attendee`
   - `Other`
9. `Your name` — required short answer.
10. `Your email` — required short answer with email validation.
11. `Selected Venue ID` — final short answer; prefilled and marked as an internal reference.

Confirmation text:

`Your nomination was received for private review. The public listing will not change automatically.`

Manual review may result in a deliberate canonical Venue update. Multiple nominations for the same Venue are permitted and may provide corroborating evidence.

## Report a problem with a listing

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A/viewform`

Configured application fields:

- Venue name: `entry.1985686020`
- Venue ID: `entry.1316297830`

Questions, in order:

1. `Venue name` — required short answer; prefilled.
2. `What is wrong with this listing?` — required paragraph.
3. `Name` — optional short answer.
4. `Email` — optional short answer with email validation when supported.
5. `Venue ID` — required final short answer; prefilled.

Confirmation text:

`Thank you. Your report was received for private review. The public listing will not change automatically.`

Before manually deleting, merging, relocating, or changing a Venue identity, check dependent Watch Party and Fan Intent references and deliberately preserve or remap them.

## Report a problem with a Watch Party

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSfmI00iDXigPXuNcadbwA8JZf8B5Lr0cWvXYCZGKu9WCSHEDA/viewform`

Configured application fields:

- Venue name: `entry.541323117`
- Game: `entry.456782239`
- Watch Party ID: `entry.703629381`

Questions, in order:

1. `Venue name` — short answer; prefilled.
2. `Game` — short answer; prefilled.
3. `What is wrong with this Watch Party?` — required paragraph.
4. `Name` — required short answer.
5. `Email` — required short answer.
6. `Watch Party ID` — final short answer; prefilled.

The issue, Name, and Email entry IDs are not used in generated application URLs and must remain empty until the user completes the Form.

Confirmation text:

`Thank you. Your Watch Party report was received for private review. The event will not change automatically.`

A report never automatically edits, deletes, unpublishes, merges, relocates, or reclassifies a Watch Party or Venue.

## Suggest a missing location

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSeIMtG66ri_FuczGhcyd6NhysdNglTuIzPqCk1P74tpLgUXvQ/viewform`

Configured application field:

- Place name: `entry.294173271`

Questions, in order:

1. `Place name` — required short answer; prefilled from the completed no-result search when available.
2. `Address or Google Maps link` — required short answer.
3. `Email` — optional short answer.

Confirmation text:

`Thank you. Your suggestion was received for private review. No location will be created or published automatically.`

The selected Game is not submitted because this Form has no Game field. A suggestion must not be treated as a Cal Bar nomination or used to publish a Venue automatically.

## Verification checklist

For each Form:

1. Open the relevant action from the application on desktop and a physical iPhone in portrait.
2. Confirm only the intended public context fields are prefilled.
3. Confirm free-text issue, address, name, and email fields remain empty.
4. Submit a clearly marked test response.
5. Confirm the response appears only in the private response sheet.
6. Confirm canonical records and the public snapshot remain unchanged.
7. Remove the test response only according to the private operating policy; never commit it.
