# Contribution and issue-report Forms

California Golden Bars uses separate Google Forms for manually reviewed contributions and reports. These Forms do not write to canonical Venue or Watch Party records automatically except where a separate accepted workflow explicitly says otherwise. Responses and submitter details remain private.

## Common settings

For every Form in this document:

- Publish for anyone with the link, subject to the photo-upload sign-in exception below.
- Link responses to the existing private CGB workbook.
- Keep response sheets and summaries private.
- Do not limit users to one response.
- Do not collect a verified Google email address automatically unless Google Forms requires account identity for file upload; that account identity remains private and is never a public credit.
- Do not enable response editing, receipts, quizzes, shuffled questions, or public result summaries.
- Do not install an Apps Script trigger unless a separate operating document explicitly requires one.
- Never commit edit URLs, response-sheet identifiers, responses, names, email addresses, uploaded files, Drive file IDs, or reviewer notes.

All non-photo Forms should remain usable without Google sign-in. **Submit a Photo is the deliberate exception:** Google Forms file upload requires sign-in. The uploaded original remains private in Google Drive and is never served directly by the public site.

After any Form question is recreated, reordered, or replaced, generate a new prefilled link and verify that the public entry IDs configured by the application are still correct.

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

## Submit a Photo

The dedicated photo Form is a manually reviewed intake workflow. It is not yet configured in the public application; until its public Form URL and two prefill entry IDs are supplied, Venue Detail hides only **Submit a Photo** and preserves the other contribution actions.

Required application configuration after the Form exists:

- Public Form URL → `PHOTO_FORM_CONFIG.formUrl` in `js/photo-form-config.mjs`
- Venue ID entry → `PHOTO_FORM_CONFIG.venueIdEntry`
- Venue name entry → `PHOTO_FORM_CONFIG.venueNameEntry`

The runtime also accepts equivalent `cgb-photo-form-*` meta configuration if configuration is later centralized in `index.html`.

Questions, in order:

1. `Venue name` — required short answer; prefilled.
2. `Upload a photo` — required file upload.
3. `What’s happening in this photo?` — optional paragraph. Helper examples: `Cal–Louisville game, 2025` and `Regular Saturday watch party`. This is source material, not final published copy.
4. `Photo credit / display name` — optional short answer. Example: `@oskistraw`.
5. `Credit profile or website` — optional URL. May be X, Instagram, a photographer website, or another HTTP(S) profile.
6. `Permission confirmation` — required checkbox with exactly: `I took this photo or have permission to share it, and I authorize Cal Golden Bars to display it on the website.`
7. `Submitter email` — optional short answer with email validation when supported.
8. `Venue ID` — required short answer; prefilled internal reference near the end.

Settings and workflow:

- File upload requires Google sign-in; this is intentional and applies only to this Form.
- Do not enable response receipts, public results, editing after submission, contributor accounts, approval/rejection emails, or an Apps Script auto-publication trigger.
- Responses remain private and are reviewed manually in `Photo_Submissions_Raw`/the linked Form response sheet.
- The user-supplied context answer may be rewritten by CGB before becoming public `photo_caption`.
- A submitted credit link is private source data until CGB deliberately copies an approved HTTP(S) value to public `photo_credit_url`.
- A later approved photo may replace the Venue’s current public primary photo; there is no public gallery or photo history.

Approval/publication is manual:

```text
Form upload
→ private Google Drive original
→ manual review
→ optimize approved copy (prefer WebP, about 1200–1600 px max width, generally about 200–500 KB)
→ commit under assets/venues/{venue-slug}.webp
→ set Venue photo_url/photo_caption/photo_credit/photo_credit_url
→ publish through the normal site/data deployment
```

Do not hotlink the Drive upload or commit the raw Form original.

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
3. Confirm free-text issue, context, address, name, and email fields remain empty unless the user enters them.
4. Submit a clearly marked test response.
5. Confirm the response and any file upload appear only in the private response storage.
6. Confirm canonical records and the public snapshot remain unchanged until the applicable approved manual/automated workflow runs.
7. For photo submissions, confirm the Drive original is private and no Drive file ID or raw response enters public data.
8. Remove the test response only according to the private operating policy; never commit it.
