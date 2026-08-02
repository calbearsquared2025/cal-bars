# Milestone 7E Google Form setup

## Form

- Title: `Suggest a missing Cal Golden Bars location`
- Description: `Use this form when a place does not appear in Cal Golden Bars or the external place search. Suggestions are reviewed privately and do not create or publish a listing automatically.`
- Public Form URL: `https://docs.google.com/forms/d/e/1FAIpQLSeIMtG66ri_FuczGhcyd6NhysdNglTuIzPqCk1P74tpLgUXvQ/viewform`

Questions, in order:

1. `Place name` — short answer, required; prefilled when existing search text is available.
2. `Address or Google Maps link` — short answer, required.
3. `Email` — short answer, optional.

Required entry ID:

- Place name: `entry.294173271`

## Settings

- Keep responses private and review them manually.
- Link responses to a new sheet in the existing private master project workbook.
- Do not collect verified email addresses.
- Do not limit to one response or require sign-in.
- Do not allow response editing.
- Do not send response receipts.
- Do not publish a results summary.
- Do not show a link to submit another response.
- Do not make this a quiz or shuffle question order.
- Publish for anyone with the link.

Confirmation text:

`Thank you. Your suggestion was received for private review. No location will be created or published automatically.`

## Prefill verification

1. In Google Forms, choose **Get pre-filled link**.
2. Enter a temporary value in `Place name` and generate the link.
3. Confirm the generated parameter is `entry.294173271`.
4. Open the application-generated link after a no-result search.
5. Confirm the entered search text appears only in `Place name`; the address and email remain empty.
6. Confirm special characters are URL encoded and no private values appear in the URL.

No selected Game is included: it is not a Form field and adding it would require a new contribution-link contract. Form responses must not trigger automatic Venue creation, classification, publication, or modification, and must not be treated as Cal Bar nominations.

## Acceptance testing

Desktop:

1. Load a direct Venue route and refresh; confirm no missing-location CTA appears.
2. Search for an existing CGB Venue; confirm its option appears and the CTA does not.
3. Search for a valid external MapTiler place; confirm its option appears and the CTA does not.
4. Search for a clearly nonexistent place and wait for both paths to finish; confirm `Can’t find the location? Suggest it here.` appears.
5. Open it and verify only the search text is prefilled in `Place name`.
6. Submit a test response and confirm it reaches the private response sheet without changing application Venue data.

Physical iPhone, portrait:

1. Repeat the direct-route refresh and existing-result checks in Safari.
2. Run a no-result search and confirm the fallback is readable, tappable, and does not crowd the results tray.
3. Open the Form and verify the place-name prefill, required fields, keyboard flow, confirmation text, and return-to-app behavior.
4. Confirm rotation back to portrait and a selected-Game change do not expose a stale fallback or create a Venue.
