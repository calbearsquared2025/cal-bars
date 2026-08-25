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

After any Form question is recreated, reordered, or replaced, generate a new prefilled link and verify that the public entry IDs configured by the application are still correct. Prefer editing existing prefilled Venue name/ID questions in place so their entry IDs remain stable.

## Tell us about this location

This is the existing manually reviewed venue-information Form previously presented to users as **Nominate a Cal Bar**. The application reuses the same Form and existing prefill IDs, but the public action is now **Tell us about this location** for both Community Locations and Cal Bars. Fans provide useful venue context; Cal Bar classification remains an editorial/manual decision and is never changed automatically by this Form.

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSdlXsf9M0Rzru8F_0orKqSu-rc4HSY8NxzAUQxMlMSEFkmhTQ/viewform`

Configured application fields:

- Venue name: `entry.2017964730`
- Selected Venue ID: `entry.272269917`

Questions, in order:

1. `Venue name` — required short answer; prefilled.
2. `What should other Bears know about watching Cal games here?` — required paragraph.
3. `How often do Cal fans gather here?` — required multiple choice:
   - `Most Cal football games`
   - `Several times per season`
   - `At least once per season`
   - `Other recurring schedule`
   - `Not sure`
4. `Is an alumni association or Cal group affiliated with this venue?` — required: `Yes`, `No`, or `Not sure`.
5. `Is the venue Cal alumni-owned or operated?` — required: `Yes`, `No`, or `Not sure`.
6. `Does the venue display Cal memorabilia or other visible Cal identity?` — required: `Yes`, `No`, or `Not sure`.
7. `Anything else we should know?` — optional paragraph.
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

`Thanks. Your information was received and will help us improve this listing.`

Manual review may result in a deliberate canonical Venue update or later Cal Bar classification. Multiple submissions for the same Venue are permitted and may provide corroborating evidence.

When a user creates a genuinely new Community Location through the MapTiler flow, location creation and any chosen Fan Intent remain immediate. After the successful canonical write, the application may show an optional **Tell us about this location** follow-up that opens this same prefilled Form. Dismissing the prompt never affects the newly created Venue. If the MapTiler result resolves to an already-existing canonical Venue, the new-location follow-up is not shown.

This venue-information workflow remains distinct from **Share your Cal Game Experience** below. Venue-information responses are private/manual-review source material; Fan Experiences are short public **BEARS SAY** contributions with their own moderation/publication path.

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

The dedicated photo Form is a manually reviewed intake workflow. It is configured in the public application and Venue Detail generates a prefilled link for the selected Venue.

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/viewform`

Configured application fields in `js/photo-form-config.mjs`:

- Venue name: `entry.1077046729`
- Venue ID: `entry.893543394`

The runtime also accepts equivalent `cgb-photo-form-*` meta configuration if configuration is later centralized in `index.html`.

Questions, in order:

1. `Venue Name` — required short answer; prefilled. Helper: `Pre-filled from the venue profile. Please don’t change this field.`
2. `Upload a photo` — required file upload. Helper: `Upload a photo you took or have permission to share. Please do not submit inappropriate or offensive content.`
3. `What's happening in this photo?` — optional paragraph. Helper: `Optional. Tell us what’s happening — for example, “Cal–Louisville game, 2025” or “Regular Saturday watch party with the Cal Alumni of Los Angeles.”` This is source material, not final published copy.
4. `Photo credit/Display name` — optional short answer. Helper: `Enter the name or social handle you’d like displayed. If using a handle, specify the service, such as X or Instagram.`
5. `Permission Confirmation` — required checkbox with exactly: `I took this photo or have permission to share it, and I authorize Cal Golden Bars to display it on the website.`
6. `Venue ID` — required short answer; prefilled. Helper: `Pre-filled from the venue profile. Please don’t change this field.`

There is no separate submitter-email question. Google Forms requires sign-in for the file upload and automatically collects the respondent account email; that email remains private and is never used as public credit.

There is no separate credit-URL question. A reviewer may populate public `photo_credit_url` manually when the credited identity and service are unambiguous. Do not infer an X/Instagram URL from a bare `@handle` when the service is unknown.

Settings and workflow:

- File upload requires Google sign-in; this is intentional and applies only to this Form.
- Automatically collected Google account email remains private.
- Do not enable response receipts, public results, editing after submission, contributor accounts, approval/rejection emails, or an Apps Script auto-publication trigger.
- Responses remain private and are reviewed manually in the Form-owned `Photo_Submission` response sheet.
- The user-supplied context answer may be rewritten by CGB before becoming public `photo_caption`.
- Public credit identity/link fields are curated manually and do not publish directly from Form responses.
- A later approved photo may replace the Venue’s current public primary photo; there is no public gallery or photo history.

Approval/publication is fully human-controlled:

```text
Form upload
→ private Google Drive original
→ manual review and approval
→ create and visually inspect an optimized WebP outside the repository
→ manually upload the approved file under assets/venues/<venue-slug>.webp in GitHub
→ confirm the GitHub Pages image URL returns the approved image
→ add or update the Venue_Photos publication row for the canonical venue_id
→ publish through the normal site/data deployment
```

Prefer WebP at about 1200–1600 px maximum width and generally about 200–500 KB. Preserve the source aspect ratio; Venue Detail owns the visible 3:2 presentation. `Venue_Photos` is the only publication source for `photo_url`, `photo_caption`, `photo_credit`, and `photo_credit_url`. Add only curated public metadata to that tab—never a Drive file ID, respondent email, permission record, reviewer note, or raw submission content.

Do not hotlink the Drive upload or commit the raw Form original.

### Photo publication runbook

1. In the private `Photo_Submission` sheet, verify that the Venue name and canonical Venue ID agree, the uploaded image is appropriate for the Venue, and the permission checkbox was affirmatively selected. Treat the context and credit answers as editorial source material, not automatically approved public copy.
2. Open the private Drive upload and inspect it at full size. Reject or follow up on images that are blurry, misleading, offensive, visibly copyrighted by an unapproved third party, or too tightly composed for the Venue Detail 3:2 crop.
3. Download the approved original to a private working folder. Never add that raw original to the public repository.
4. Auto-orient the image, preserve its aspect ratio, and resize only when its longest dimension exceeds 1600 px. Do not upscale smaller originals. Export an sRGB WebP at roughly quality 80–85 and strip EXIF/location metadata. Aim for 200–500 KB, but accept a smaller file when it remains visually clean.
5. Name the output `assets/venues/<venue-slug>.webp`. Open the WebP itself and inspect faces, text, shadows, gradients, and the approximate center-cropped 3:2 composition before committing it.
6. Add only the optimized WebP to the feature/release branch, run the photo tests and data validator, and merge it through the normal reviewed release process. Confirm the final `https://calgoldenbars.com/assets/venues/<venue-slug>.webp` URL loads the approved image before changing the workbook row to `published`.
7. Add or update exactly one `Venue_Photos` row for the canonical Venue ID. Use `draft` while the asset or copy is still under review; use `published` only after the public asset URL works. Curate the caption, display credit, optional credit URL, and an ISO-8601 UTC `updated_at` value. Archive a superseded row or replace the existing row; never leave two `published` rows for one Venue.
8. In Apps Script, run `buildPublicSnapshotForReview()`. It clears the endpoint cache, rebuilds the snapshot, and logs the review copy. Confirm the matching Venue contains only the approved `photo_url`, `photo_caption`, `photo_credit`, and `photo_credit_url`, with no Form upload link, Drive ID, account email, permission response, or reviewer data.
9. Load the Venue Detail from the release candidate on desktop and a physical iPhone in portrait. Confirm the image crop, caption, credit link, map fallback behavior, and `Submit a Photo` action. After release, reload once after the endpoint refresh and repeat the production check.

Free conversion options:

- [Squoosh](https://squoosh.app/) works in a browser: enable **Resize**, set the longest dimension to at most `1600`, choose **WebP**, start near quality `82`, compare the preview, and download the result.
- [GIMP](https://www.gimp.org/) is a free desktop editor: use **Image → Scale Image**, set width or height to at most `1600` with the chain linked, then **File → Export As**, choose `.webp`, and use quality `80–85`.
- [ImageMagick](https://imagemagick.org/) is a free command-line option: `magick input.jpg -auto-orient -resize "1600x1600>" -strip -quality 82 output.webp`. The `>` prevents upscaling; quote the geometry in PowerShell so it is not interpreted as redirection.

## Share your Cal Game Experience

This focused Form collects one venue-centric Fan Experience for the **BEARS SAY** section. Fans may optionally provide a public display name; blank submissions render as **Anonymous**. It is the deliberate exception to the default no-trigger rule above: install the repository's focused spreadsheet-bound `onFanExperienceFormSubmit` trigger after the response tab exists.

Public Form configuration in `js/fan-experience-form-config.mjs`:

- Form URL: `https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform`
- Venue ID: `entry.120767699`
- Venue name: `entry.202050515`

Do not commit a Form edit URL, response-sheet identifier, responses, or private Form metadata. Equivalent `cgb-fan-experience-form-*` meta configuration remains supported.

Form title:

`Share your Cal Game Experience`

Questions, in order:

1. `Venue name` — required short answer; prefilled from the canonical Venue Profile.
2. `What should other Bears know about watching a Cal game here?` — required paragraph, maximum 500 characters. Helper: `Tell us what makes watching Cal here special—the crowd, the watch party, the atmosphere, or anything another Bear should know.`
3. `Name to display (optional)` — optional short answer. Treat 60 characters as the public maximum. Blank responses publish as **Anonymous**.
4. `Venue ID` — required short answer; prefilled with the canonical Venue ID.

Confirmation text:

`Thanks for sharing your experience with other Bears.`

Do not collect an email, Game, Watch Party, rating, structured survey answers, account, or response receipt. `Name to display (optional)` is the only public attribution field and must not be treated as a verified identity or attendee name. Keep the Form usable without Google sign-in.

Link responses to the existing private CGB workbook and rename/confirm the Form-owned response tab as `Fan_Experiences_Raw`. Google Forms owns the original timestamp, Venue name, experience answer, optional display-name answer, and Venue ID columns. The Apps Script trigger appends only:

- `public_text`
- `public_display_name` — cleaned optional public attribution; blank remains blank in the private sheet and renders as **Anonymous** in the client
- `moderation_status` — `published` or `held`
- `moderation_reason`

On submission, Apps Script validates the canonical Venue ID, performs only technical cleanup, copies the cleaned experience to `public_text`, cleans the optional attribution into `public_display_name`, and applies the small deterministic moderation rules in `apps-script/FanExperienceAutomation.gs`. An unsafe display name holds the submission just as unsafe experience text does; a blank display name does not. Negative but useful feedback is not held merely for being negative. Held rows remain private until manually changed in the Sheet. CGB may edit `public_text`, `public_display_name`, or `moderation_status` directly; there is no separate moderation dashboard.

A newly auto-published experience clears the public snapshot cache. After a manual edit or status change that should immediately affect public output, run `buildPublicSnapshotForReview()` to clear and rebuild the cache before verification.

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

The selected Game is not submitted because this Form has no Game field. A suggestion must not be treated as a location-information submission or used to publish a Venue automatically.

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