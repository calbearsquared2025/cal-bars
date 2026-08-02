# Watch Party issue-report Google Form setup

## Form

- Title: `Report a Watch Party issue`
- Description: `Use this form to report incorrect details about a published Cal Golden Bars Watch Party. Reports are reviewed privately and do not automatically edit, delete, unpublish, merge, or otherwise modify any Watch Party.`
- Public Form URL: `https://docs.google.com/forms/d/e/1FAIpQLSfmI00iDXigPXuNcadbwA8JZf8B5Lr0cWvXYCZGKu9WCSHEDA/viewform`

Questions, in order:

1. `Venue name` — short answer, prefilled.
2. `Game` — short answer, prefilled.
3. `What is wrong with this Watch Party?` — required paragraph.
   - Help text only: `Examples: cancellation, wrong organizer, incorrect time, wrong event link, incorrect age policy or audio status, duplicate event, changed venue, or other incorrect event details.`
4. `Name` — short answer, required.
5. `Email` — short answer, required.
6. `Watch Party ID` — short answer, prefilled at the bottom.

Required application entry IDs:

- Venue name: `entry.541323117`
- Game: `entry.456782239`
- Watch Party ID: `entry.703629381`

The remaining Form entry IDs are recorded here only for manual Form verification and are not included in generated application URLs:

- Issue paragraph: `entry.2000839941`
- Name: `entry.570503107`
- Email: `entry.1273593969`

## Settings

- Publish for anyone with the link.
- Link responses to a new sheet in the existing private CGB master workbook.
- Keep responses private for manual review.
- Do not collect verified Google email addresses; the required `Email` question is the only email field.
- Do not require sign-in or limit to one response.
- Do not permit response editing or send response receipts.
- Do not publish a results summary.
- Do not show a link to submit another response.
- Do not make the Form a quiz or shuffle questions.

Confirmation text:

`Thank you. Your Watch Party report was received for private review. The event will not change automatically.`

## Prefill verification

1. Choose **Get pre-filled link** in Google Forms.
2. Enter temporary values for Venue name, Game, and Watch Party ID.
3. Generate the link and verify the three application entry IDs above.
4. Open report links for two Watch Parties at the same Venue and Game.
5. Confirm Venue and Game match while each link retains its own `watch_party_id`.
6. Confirm the issue, Name, and Email fields remain empty and no private values appear in the URL.

## Manual review policy

Submissions never automatically edit, delete, unpublish, merge, relocate, or otherwise modify a Watch Party or Venue. Do not expose report contents, Name, or Email publicly. Verify each report against reliable evidence and deliberately apply any warranted canonical correction through the normal private workflow.

## Acceptance testing

Desktop:

1. Open a Venue with one Watch Party and confirm one subdued report link appears inside that party card.
2. Open a Venue with multiple Watch Parties for the selected Game and confirm exactly one link per card.
3. Open each link and confirm its Watch Party ID matches its card.
4. Change the selected Game and verify cards and report links update together.
5. Refresh a direct Venue route and repeat the association check.
6. Confirm directions, sharing, search, Fan Intent, event links, and multiple-party display still work.

Physical iPhone, portrait:

1. Repeat the one-party and multiple-party checks in Safari portrait orientation.
2. Confirm the subdued text links do not dominate or overwhelm the viewport.
3. Tap every visible report link and verify the correct Venue, Game, and Watch Party ID prefill.
4. Return to the app, change Games, refresh a direct route, and confirm routing, Fan Intent, directions, sharing, search, scrolling, and safe-area behavior remain intact.
