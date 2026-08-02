# Milestone 7D — Google Form setup and manual review

This is the consolidated setup checklist for the separate Milestone 7D Form. Responses stay private for manual review. There is no Apps Script processor or trigger, and a response never changes public data automatically.

## Form checklist

- **Title:** `Report a problem with a Cal Golden Bars listing`
- **Description:** `Use this form to report a problem with an existing venue listing. Reports are reviewed privately and do not change the public listing automatically.`
- **Questions, in this exact order:**
  1. `Venue name` — Short answer — required — prefilled from the Venue detail page.
  2. `What is wrong with this listing?` — Paragraph — required.
     - Help text only: `Examples include a closure, relocation, rename, duplicate listing, incorrect address, website, classification, or description.`
  3. `Name` — Short answer — optional.
  4. `Email` — Short answer — optional. Enable response validation for an email address if Google Forms permits blank optional validated responses.
  5. `Venue ID` — Short answer — required — place at the bottom and prefill from the Venue detail page.
     - Help text: `Filled automatically by California Golden Bars. Please do not change.`
- **Settings:**
  - Link responses to a private response spreadsheet owned by CGB.
  - Keep the Form and response spreadsheet restricted; do not publish or share response summaries.
  - Do not require sign-in.
  - Do not automatically collect email addresses; use only the optional `Email` question.
  - Do not send response receipts or allow response editing.
  - Do not add branching, file upload, Apps Script, add-ons, or an installable trigger.
- **Confirmation text:** `Thank you. Your report was received for private review. The public listing will not change automatically.`

## Prefill checklist and required entry IDs

The supplied public Form URL and inspected entry IDs are already configured in `index.html`:

- `cgb-listing-update-form-url`: `https://docs.google.com/forms/d/e/1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A/viewform`
- `cgb-listing-update-venue-name-entry`: `entry.1985686020`
- `cgb-listing-update-venue-id-entry`: `entry.1316297830`

After completing the Form, verify the IDs have not changed:

1. Choose **Get pre-filled link** in Google Forms.
2. Enter recognizable temporary values in `Venue name` and `Venue ID`, then generate the link.
3. Confirm the generated URL uses the two entry IDs above. If either ID changed, update only the corresponding public meta value in `index.html`.
4. Remove the temporary values when verifying the prefill.
5. Do not commit the edit URL, response-sheet ID, responses, names, email addresses, or any other private value.

## Desktop and physical-iPhone acceptance

### Desktop

1. Serve the branch from a local HTTP server and open a canonical Venue detail route.
2. Confirm **Report a problem with this listing.** appears in the Venue detail and opens the separate Form in a new tab.
3. Confirm `Venue name` is prefilled at the top and the canonical `Venue ID` is prefilled at the bottom.
4. Confirm the paragraph is required; `Name` and `Email` remain optional; the examples appear only as paragraph help text.
5. Submit a clearly marked test response. Confirm it appears only in the private response store and the public snapshot and Venue remain unchanged.

### Physical iPhone

1. Open the deployed non-production branch preview in Safari on a physical iPhone in portrait orientation.
2. Open a canonical Venue detail and confirm the full CTA is readable, comfortably tappable, and does not overlap other contribution actions or the safe area.
3. Tap the CTA and repeat the prefill, required/optional-field, help-text, submission, and private-response checks above.
4. Return to the app and confirm the same Venue detail remains usable. Repeat once in an available in-app browser if that browser is part of acceptance coverage.

## Manual review safety gate

For every response, verify the report against reliable evidence and deliberately decide whether a canonical edit is warranted. Do not automatically change, delete, merge, relocate, reclassify, or publish any Venue.

Before any manual deletion, merge, relocation, or identity-changing correction, check all dependent Watch Party and Fan Intent references. Preserve or deliberately remap those relationships before changing the Venue identity, then re-run the normal exact Venue-load and public-data validation.
