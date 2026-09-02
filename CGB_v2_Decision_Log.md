# Cal Golden Bars v2.0 — Decision Log

**Status:** Product design locked  
**Date:** July 25, 2026

## 1. Product purpose

- CGB is a fan-facing discovery and coordination product.
- The immediate objective is demonstrated use and engagement, not monetization.
- The core loop is: select game → find or add location → **I’ll be here** → share → return next game.
- No user accounts, profiles, comments, or attendee identities are required.

## 2. Venue model

### Locked

- Two persistent venue types exist:
  - `cal_bar`
  - `community_location`
- A user-selected external venue becomes a permanent Community Location immediately.
- Community Locations remain on the map after the game.
- Historical Cal activity is retained and displayed.
- Fan activity and Watch Parties do not automatically promote a venue to a Cal Bar.
- A Community Location may be nominated as a Cal Bar through a short prefilled form.
- CGB manually reviews Cal Bar nominations and may use the explanation as source material for an edited venue blurb.

### Superseded

- Newly added venues are provisional.
- Community Locations disappear after the game.
- A user must complete a Google Form before adding where they will watch.
- Every added venue requires manual approval before it appears.

## 3. Fan Intent

### Locked

- Primary action: **I’ll be here**.
- One active venue per anonymous browser per game.
- Undo and move behavior are required.
- Browser identity is random and stored locally.
- Current and historical counts are public; identities are not.
- Natural copy is preferred:
  - **3 Bears watching here**
  - **No Bears are watching here yet. Be the first.**
  - **Bears have watched 5 Cal games here.**
- The interface does not need to repeatedly qualify counts as planned or self-reported attendance.

### Superseded

- Public counts must reset without preserving historical activity.
- Copy must avoid ordinary attendance language.
- The venue page must show a recurring disclaimer that counts are self-reported.

## 4. Watch Parties

### Locked

- Use the label **Watch Party**, not **Confirmed Watch Party**, by default.
- Structured Watch Party submissions publish automatically.
- Every original form response remains in a private raw log.
- Apps Script validates and normalizes the submission.
- One form submission may create one Watch Party row per selected game.
- Safe positive structured Venue-capable details may auto-publish from either Venue or Watch Party contribution Forms; one valid submission is sufficient and corroboration is not required.
- Venue-capable controlled values are `21_plus`, `all_ages`, `audio_on`, `food`, `cal_beer`, `large_crowd`, and `cal_memorabilia`. Unchecked means unknown/not asserted; contradictory age assertions remain pending for review.
- Watch Party-only controlled values are `rsvp_requested` and `cal_specials`.
- Destructive or materially conflicting changes remain private for manual review rather than being inferred or overwritten.
- A submitted event at an unlisted venue may create a Community Location.
- Contextual CTA:
  - **Is there a watch party going on?**
  - **Submit a Watch Party**

### Superseded

- CGB manually approves every Watch Party.
- Watch Parties should be described as CGB-confirmed.
- Approval, rejection, and public submission-status workflows are part of the MVP.

## 5. Search

### Locked

- Search existing CGB venues first.
- Use external MapTiler place search for unlisted venues.
- Create the Community Location only after the user taps **I’ll be here**.
- Minimal matching uses external place ID, then normalized address.
- A fallback form exists when place search cannot find the location.
- Google Places is not part of the current architecture.

### Deferred

- Sophisticated fuzzy duplicate detection
- Comprehensive worldwide bar import
- Complex place-identity reconciliation

## 6. Forms

### Locked

Use focused forms for:

1. Tell us about this location
2. Add or update location details
3. Add a Watch Party
4. Add or update Watch Party details
5. Add a Photo
6. Suggest a Missing Location when search fails

Venue and Watch Party entities remain separate even though the first four Forms share a controlled vocabulary where appropriate. Safe additive structured details may be processed automatically. The optional freeform answer from **Tell us about this location** is the deliberate exception to the otherwise-private freeform rule: it is copied into `Fan_Experiences_Raw` for the canonical Venue and may enter **YOU SAY** only if the existing Fan Experience cleaning/moderation pipeline publishes it. Submitter relationship/frequency context, contact information, other freeform text, and consequential identity/destructive changes remain private.

Routine Fan Intent and external venue addition do not use forms.

### Superseded

- The **Tell us about this location** freeform answer must always remain private and can never feed **YOU SAY**.

### Excluded

- Automated approval or rejection email
- Receipt number
- Public submission tracker
- Post-submission edit link
- Contributor account or dashboard

## 6A. Community structured detail presentation

### Locked

- On the mobile continuous Venue Profile, persistent structured Venue observations render in a compact **WHAT TO KNOW** block immediately after venue identity/address and before the Watch Party module.
- **WHAT TO KNOW** includes a quiet header-level **Add info →** link to the existing prefilled **Tell us about this location** Form; it does not add a separate CTA row.
- If no structured Venue observations are known, keep **WHAT TO KNOW** present with a subtle compact empty state.
- Do not duplicate persistent Venue tags later in the mobile community-experience section.
- The community-experience section is labeled **YOU SAY**.
- **CGB SAYS** remains reserved for CGB editorial content.
- Approved Venue photos use the shared 3:2 cover crop and participate in a photo-forward opening on both desktop and mobile rather than being deferred beneath editorial/community content.
- On mobile photo venues, the selected-card opening pairs venue identity with the photo in row 1 and **WHAT TO KNOW** with current attendance in row 2; the Watch Party and selected-game actions then continue at full width.
- After those primary mobile decision and action elements, the continuous profile continues with **CGB SAYS** and **YOU SAY**.
- No-photo mobile Venues retain the existing local-map fallback in the continued profile.
- Watch Party-only tags remain on the specific Watch Party.
- Avoid a redundant second stack of 21+/ALL AGES/audio tags when the same persistent Venue context is already visible.

### Superseded

- Persistent structured Venue observations must render at the top of **BEARS SAY** on mobile.
- A separate mobile **WHAT TO KNOW** block is prohibited.
- On mobile, an approved Venue photo follows **YOU SAY** so core decision information appears first.
- Mobile and desktop may intentionally use unrelated photo hierarchy once an approved photo exists.

## 7. Photos

### Locked

- Community and Cal Bar pages may link to **Add a Photo**.
- Google Form file upload is acceptable even if Google sign-in is required.
- Permission confirmation is required.
- Photos are manually reviewed before publication.
- Submitted images do not publish automatically.

### Deferred

- Native public upload
- Galleries
- Automated photo moderation
- Image editing pipeline

## 8. Architecture and privacy

### Locked

- Static GitHub Pages remains the frontend host.
- MapLibre and MapTiler remain the map/search architecture.
- Use one private multi-tab Google Spreadsheet as the backend database.
- Use Google Apps Script as the controlled public read/write layer.
- Do not publish the full workbook.
- Public responses contain only whitelisted fields.
- Browser IDs, raw form responses, submitter contacts, permission records, and administrative notes remain private.
- A separate spreadsheet file per tab or workflow is unnecessary.

## 9. Data model

### Locked canonical entities

- Venue
- Game
- Watch Party
- Fan Intent

### Locked raw workflows

- Cal Bar nominations
- Watch Party submissions
- Listing updates
- Photo submissions
- Missing-location suggestions

Stable IDs are required. Venue names and addresses are not relationship keys.

## 10. Presentation

### Locked

- Mobile-first map-led homepage.
- Selected-game context controls the experience.
- Combined permanent venue and selected-game detail page.
- Positive Community Location CTAs rather than negative trust disclaimers.
- Gold event treatment for a Watch Party, solid navy for Cal Bar, outline for Community Location.
- Venue/game URLs preserve selected context.
- Native sharing with copy-link fallback.

## 11. Explicitly deferred

- Monetization
- Accounts and profiles
- True venue claiming
- Venue dashboards
- Messaging and comments
- Payments and ticketing
- Native RSVP system
- Email campaigns
- Add to calendar
- Other schools
- Closure and ownership-change workflows
- Sophisticated social-preview generation
- Complex abuse and moderation systems
- Advanced duplicate reconciliation

## 12. Remaining questions

No unresolved product question blocks coding.

The following may be resolved during implementation:

- Exact MapTiler search request and result normalization
- Exact ID format
- Sheet column order
- Apps Script endpoint shape
- Routing technique under GitHub Pages
- Cache and refresh intervals
- Initial map center
- Marker rendering details
- Final microcopy and visual spacing
- Generic versus generated social-preview implementation

Reopen a locked choice only if repository inspection reveals a concrete conflict involving feasibility, licensing, privacy, or launch timing.