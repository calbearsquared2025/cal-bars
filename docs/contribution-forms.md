# Contribution Forms

California Golden Bars uses focused Google Forms backed by the private CGB workbook. The original Form response is always retained privately. Safe controlled positive information may update canonical public records automatically; freeform text, submitter identity/contact information, and destructive or materially conflicting corrections do not.

This document supersedes older statements that all Venue/listing updates require manual review. The later approved rule is additive: a single valid structured contribution can create useful public Venue or Watch Party context without corroboration.

## Shared privacy and processing rules

For the structured contribution Forms below:

- Preserve the existing public Form URL and linked private response destination.
- Keep response sheets and response summaries private.
- Do not collect a verified Google email automatically.
- Do not limit to one response, enable public results, or create contributor accounts.
- Prefilled entity questions remain in place whenever possible so existing `entry.*` IDs stay stable.
- Google Forms owns the original response columns; Apps Script appends only private processing status/error/timestamp plus `review_status` and `manual_review_reason` fields.
- Processors resolve fields by question-title aliases rather than brittle column positions so legacy responses remain auditable.
- Unchecked structured options mean **unknown / not asserted**, not false.
- Freeform answers never create public tags and never auto-publish into **YOU SAY** or **CGB SAYS**.
- Names and email addresses never enter the public snapshot.
- Safe additive structured changes may auto-publish after canonical-ID validation and a script lock.
- Closure, relocation, cancellation/move, Venue identity/name/address changes, organizer replacement, and material event-link replacement remain private for review. The raw row is durably marked `review_status = pending` with a machine-readable `manual_review_reason`; safe structured additions in the same response may still apply.
- If a Watch Party base submission publishes successfully but its structured enhancement fails afterward, the raw row is marked retryable `processing_status = enhancement_error`, retains the canonical Watch Party relationship created by the idempotent base processor, and remains `review_status = pending` until enhancement succeeds or is reviewed.

For launch, the four existing Google Forms are maintained manually. The repository intentionally does not include Apps Script that creates, deletes, reorders, or edits Form questions. Do not run or recreate `syncContributionForms()` as part of owner setup. Preserve each existing public Form URL, linked response destination, prefill question, and `entry.*` ID, and maintain the approved questions below directly in Google Forms.

The structured contribution processor remains `ContributionAutomation.gs`. Install exactly one spreadsheet-bound `onContributionFormSubmit` trigger manually in Apps Script using **From spreadsheet → On form submit**. Establish that trigger before removing any obsolete `onWatchPartyFormSubmit` trigger. Leave unrelated project triggers alone. The canonical workbook must contain `Venues.venue_tags` and `Watch_Parties.feature_tags` before structured contributions are enabled.

## Controlled structured vocabulary

### Persistent Venue-capable values

Contributor-facing labels normalize to canonical values:

| Form label | Canonical value | Public display |
|---|---|---|
| `21+` | `21_plus` | `21+` |
| `AUDIO ON — game sound is usually on` or Watch Party equivalent | `audio_on` | `AUDIO ON` |
| `FOOD AVAILABLE` | `food` | `FOOD` |
| `Serves Cal beer (Oski's Gold, Coach Ron Golden Ale)` | `cal_beer` | `CAL BEER` |
| `LARGE CROWD — typically 10+ Cal fans` | `large_crowd` | `LARGE CROWD` |
| `CAL MEMORABILIA — Cal flags, signs, memorabilia, or similar` | `cal_memorabilia` | `CAL MEMORABILIA` |

On the mobile continuous Venue Profile, persistent Venue tags render in the compact **WHAT TO KNOW** block before the Watch Party module. The block uses the existing prefilled **Tell us about this location** Form through a quiet **Add info →** header link and does not duplicate the tags later under **YOU SAY**. Wider layouts retain their existing tag placement unless separately changed. These values remain community-contributed observations, not CGB editorial statements; **CGB SAYS** remains editorial only.

### Watch Party-only values

| Form label | Canonical value | Public display |
|---|---|---|
| `RSVP REQUESTED` | `rsvp_requested` | `RSVP REQUESTED` |
| `CAL SPECIALS — special food, drink, or pricing for the Cal group` | `cal_specials` | `CAL SPECIALS` |

These stay with the specific Watch Party. Event-level legacy 21+/audio values remain supported, but the UI suppresses a redundant event tag when the same persistent Venue context is already visible.

Rejected concepts are not part of the current public tag model: `ALL AGES`, `RSVP REQUIRED`, `CAL AREA`, `DEDICATED CAL AREA`, `OUTDOOR`, `ARRIVE EARLY`, `ALUMNI OWNED`, and `ALUMNI GROUP`.

## 1. Tell us about this location

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSdlXsf9M0Rzru8F_0orKqSu-rc4HSY8NxzAUQxMlMSEFkmhTQ/viewform`

Existing application prefill fields:

- Venue Name: `entry.2017964730`
- Venue ID: `entry.272269917`

The live response tab is currently `Venue Details`. Historical headings remain in that private tab; do not delete legacy response columns solely to make the current Form look cleaner.

Approved questions:

1. `Venue Name` — required short answer; prefilled.
2. `Your relationship to this venue` — required: `Venue owner or staff`, `Alumni group organizer`, `Attendee`, `Other`.
3. `How often do Cal fans gather here?` — required: `Most Cal football games`, `Several times per season`, `At least once per season`, `Other`.
4. `Which of these describe this location?` — optional checkbox block using the six Venue-capable labels above.
5. `Anything else we should know about this venue?` — optional paragraph. Helper: `What makes this place special for Cal fans, or what should someone know before watching a game here?`
6. `Your email (optional, kept private)` — optional short answer.
7. `Venue ID` — required short answer; prefilled internal reference.

There is no name field. One selected safe tag is a useful submission and may immediately seed a previously absent `Venues.venue_tags` value. The optional paragraph remains private source material.

The post-add Community Location prompt continues to open this same Form with Venue Name + Venue ID.

## 2. Add or update location details

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A/viewform`

Existing application prefill fields:

- Venue Name: `entry.1985686020`
- Venue ID: `entry.1316297830`

The live response tab is currently `Venue Problem Submission`.

Approved questions:

1. `Venue Name` — required, prefilled.
2. `What are you sharing?` — required: `Add missing information`, `Correct existing information`, `Location closed or moved`, `Other`.
3. `Which of these describe this location?` — optional, exact six-option Venue tag block.
4. `Anything else we should add or change?` — optional paragraph.
5. `Name (optional)` — optional/private.
6. `Email (optional)` — optional/private.
7. `Venue ID` — required, prefilled.

This Form is Venue-only. Safe additive structured tags auto-publish. Closure/move and identity corrections remain raw/manual-review items and are durably marked pending in the private response row. The application-facing action is **Add or update location details**.

## 3. Add a Watch Party

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ/viewform`

Existing application prefill fields:

- Venue ID: `entry.1451856849`
- Venue Name: `entry.307282250`
- selected Game checkbox: `entry.1519015315`

Response tab: `Watch_Party_Submissions_Raw`.

Approved structure:

1. `Venue Name` — required, prefilled.
2. `Which game or games will have a Watch Party here?` — required checkbox; selected game is prefilled. Keep the checkbox choices aligned manually with upcoming canonical Games.
3. `Organizer or host name` — required.
4. `Who is organizing or hosting this Watch Party?` — required organizer type.
5. `Official event or RSVP link` — optional.
6. `What is your relationship to this Watch Party?` — required.
7. `Event start or suggested arrival time` — optional. Include a timezone for automatic publication, e.g. `4:30 PM PT` or `7:00 PM ET`.
8. `Which of these details apply?` — optional combined eight-option block: six Venue-capable values plus `RSVP REQUESTED` and `CAL SPECIALS`.
9. `Anything else fans should know?` — optional.
10. `Contact Email` — optional/private.
11. `Venue ID (existing)` — required, prefilled.

Routine valid Watch Party submissions continue to auto-publish one canonical Watch Party per selected game. The combined structured checkbox replaces the older separate age/audio questions in the manually maintained Form. Processors remain tolerant of those historical raw columns.

Venue-capable selected values may seed absent persistent Venue tags. `21+` and `AUDIO ON` also populate the existing Watch Party `age_policy`/`sound_status` compatibility fields when non-conflicting. `RSVP REQUESTED` and `CAL SPECIALS` populate only `Watch_Parties.feature_tags`.

A timezone-qualified start/arrival time may populate `event_start_at`; an ambiguous time remains private for review rather than being guessed.

If base Watch Party publication succeeds but a later structured enhancement fails, the canonical base row remains published and is not recreated on redelivery. The private raw row records `enhancement_error` plus the enhancement reason so the structured portion can be retried/recovered without losing the original response.

The live raw tab currently contains a checkbox heading `What should Bears know about this Watch Party?`; the processor explicitly accepts that historical/live heading so responses created under that heading are not lost.

## 4. Add or update Watch Party details

Public Form URL:

`https://docs.google.com/forms/d/e/1FAIpQLSfmI00iDXigPXuNcadbwA8JZf8B5Lr0cWvXYCZGKu9WCSHEDA/viewform`

Existing application prefill fields:

- Venue Name: `entry.541323117`
- Game: `entry.456782239`
- Watch Party ID: `entry.703629381`

The live response tab is currently `Watch Party Problem Submission`.

Approved questions:

1. `Venue Name` — required, prefilled.
2. `Game` — required, prefilled.
3. `What are you sharing?` — required: `Add missing information`, `Correct existing information`, `Event canceled or moved`, `Organizer / event link update`, `Other`.
4. `Which of these details apply?` — optional, same eight-option block as Watch Party creation.
5. `Event start or suggested arrival time` — optional; include timezone for automatic publication.
6. `Anything else we should add or change?` — optional.
7. `Name (optional)` — optional/private.
8. `Email (optional)` — optional/private.
9. `Watch Party ID` — required, prefilled stable relationship key.

Safe additive structured changes update the exact canonical Watch Party automatically. Venue-capable values may also seed the Venue. Cancellation/move, organizer changes, and material event-link replacement remain private/manual-review items and are durably marked pending even when safe structured additions from the same response are applied.

## Routing contract

The frontend keeps the four destinations distinct:

- Venue Profile **Tell us about this location** → Venue information Form → Venue Name + Venue ID.
- Venue Profile **Add or update location details** → Venue maintenance Form → Venue Name + Venue ID.
- Watch Party card **More to share about this watch party? Tell us →** → Watch Party update Form → Venue + Game + Watch Party ID.
- **Add a Watch Party** / **Add another Watch Party** → Watch Party submission Form → Venue + selected Game context.
- New Community Location follow-up **Tell us about this location** → same persistent Venue information Form.

## Other focused Forms — unchanged

### Add a Photo

Photo intake remains manually reviewed. Google Forms file upload may require sign-in; the uploaded original and respondent identity remain private. Only an approved prepared public derivative and curated caption/credit may enter the public Venue photo record. No photo auto-publication is introduced by the structured contribution work.

### Share your Cal Game Experience

This remains the primary workflow for public **YOU SAY** prose. Its focused Apps Script moderation/publication path remains separate from the four structured contribution Forms. Structured Venue tags can appear alongside these experiences according to the profile presentation rules above, but freeform answers from Venue/listing Forms do not become **YOU SAY** quotes automatically.

### Suggest a Missing Location

This remains the fallback only when external place search cannot find the desired location. It does not replace the MapTiler-based direct Community Location flow.
