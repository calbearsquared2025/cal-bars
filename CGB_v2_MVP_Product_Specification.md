# Cal Golden Bars v2.0 — MVP Product Specification

**Status:** Design locked for functional prototype  
**Date:** July 25, 2026  
**Target:** Public soft launch before the September 5, 2026 home opener

## 1. Product objective

Cal Golden Bars helps Cal fans answer:

> Where are Bears gathering for this game—and can I help create a gathering where I am?

The MVP is intended to demonstrate use and engagement rather than monetization. It should prove that fans will:

1. Visit for a specific Cal football game.
2. Find an existing location or add a neighborhood venue.
3. Select **I’ll be here**.
4. See other Cal activity at that location.
5. Share the location.
6. Return for another game.

## 2. Primary users

- **Fans** find venues, add locations through place search, indicate where they will watch, and share locations.
- **Alumni organizers** submit game-specific watch parties and update event details.
- **Venue owners or managers** submit watch parties, nominate their venue as a Cal Bar, and provide corrections or photos.
- **Cal Golden Bars** curates the Cal Bar designation and approves public photos and editorial descriptions.

There are no contributor accounts, venue dashboards, passwords, or public attendee lists in the MVP.

## 3. Core information model

Keep permanent places separate from game-specific activity.

### Cal Bar

A recurring Cal gathering location designated by Cal Golden Bars after reviewing a nomination or other supporting information.

### Community Location

A persistent venue added through user activity. A Community Location remains on the map for future games and may show current and historical Cal activity. It is not automatically a Cal Bar.

### Watch Party

A user-submitted organized gathering linked to one venue and one game. Structured submissions are automatically published and logged. CGB does not manually approve routine watch-party submissions.

### Fan Intent

An anonymous browser-level selection linking one venue to one game.

One venue may host many Watch Parties. One game may have many venues. A Community Location may host a Watch Party without becoming a Cal Bar.

## 4. Venue and event presentation

| Visual treatment | Meaning |
|---|---|
| Gold star or equivalent event treatment | Watch Party for the selected game |
| Solid navy pin | Cal Bar |
| Outlined pin | Community Location |

Rules:

- A Watch Party at a Cal Bar uses the Watch Party treatment for the selected game while retaining a **CAL BAR** badge.
- A user-added Community Location persists after the game.
- Fan activity never automatically changes a Community Location into a Cal Bar.
- A Watch Party does not automatically make its venue a Cal Bar.
- Current-game fan activity may add a count badge or stronger visual emphasis without changing venue type.

Use positive next-step framing on Community Location pages:

> Think this is a Cal bar?  
> **Nominate as a Cal Bar**

> Is there a watch party going on?  
> **Submit a Watch Party**

Do not lead with negative language about what the location is not.

## 5. Game and time behavior

- The homepage defaults to the next Cal football game.
- Game time appears in the selected-game header.
- Kickoff time is localized to the visitor and includes a timezone abbreviation.
- Use **Time TBD** when kickoff has not been announced.
- A compact schedule selector lets users plan for another game.
- The selected game controls Watch Parties, fan counts, selected state, and venue messaging.

## 6. “I’ll be here”

Primary action:

> **I’ll be here**

Count copy:

- **1 Bear watching here**
- **3 Bears watching here**
- **No Bears are watching here yet. Be the first.**

Selected state:

> **You’ll be here · Undo**

Historical copy:

- **Bears have watched 5 Cal games here.**
- **5 Bears watched here for the Stanford game.**

These counts are based on CGB selections. The product does not need to repeatedly qualify the language as planned or self-reported attendance.

Rules:

- One active venue per anonymous browser per game.
- Selecting another venue moves the user’s selection.
- The user may undo the selection.
- No names, accounts, comments, profiles, or public attendee lists.
- Store a random anonymous browser identifier locally.
- The selection does not create a Watch Party.
- After a game, current selections are archived for historical counts rather than deleted.

## 7. Search and persistent Community Location creation

Search operates in this order:

1. Search existing CGB venues.
2. Show external place results through the existing MapTiler/MapLibre architecture.
3. Let the user choose a concrete place result.
4. Add the venue to CGB only when the user confirms **I’ll be here**.

When an external venue is selected:

1. Attempt to match an existing venue using the external place ID.
2. If no external ID match exists, check the normalized address.
3. Create a permanent Community Location.
4. Record Fan Intent for the selected game.
5. Display the new location immediately.
6. Keep the location available for future games.

A sophisticated duplicate-detection system is not required for the prototype.

If the user cannot find the location through search, provide:

> **Can’t find the location? Suggest it here.**

This routes to a short form for manual addition.

## 8. Landing and map experience

The mobile-first landing screen contains:

- Compact branded header with logo and full **CAL GOLDEN BARS** name.
- Selected-game context with opponent, localized kickoff time, and game-selection action.
- A concise selected-game Watch Party count and broader location count.
- City/ZIP search and a user-initiated **Near me** action.
- Map occupying the remaining useful viewport height.
- Draggable lower tray with peek, selected-card, and full-list states.
- Optional full-screen map control.

Recommended opening statistic:

> **6 watch parties for this game · 36 locations mapped**

Nearby results rank:

1. Watch Parties for the selected game
2. Cal Bars
3. Community Locations

Within each category, rank by distance. Locations with current fan activity may receive stronger visual emphasis.

## 9. Selected venue tray

The selected tray should provide enough information to choose a location without opening the full page:

- Venue name
- City and distance
- Venue type
- Short description when available
- Watch Party host and event link when applicable
- Critical restrictions such as 21+
- Current Bear count
- **I’ll be here**
- Directions
- View details
- Share

The map pans only enough to keep the selected marker visible above the tray. Extra screen height expands the map rather than stretching the card.

## 10. Venue detail page

The page combines permanent venue information with selected-game activity.

Recommended Community Location content:

```text
COMMUNITY LOCATION

McNally’s Irish Pub
Oakland, CA

3 Bears watching here for Cal–UCLA.
Bears have watched 5 Cal games here.

[ I’ll be here ]

Think this is a Cal bar?
Tell us why Cal fans gather here.
[ Nominate as a Cal Bar ]

Is there a watch party going on?
[ Submit a Watch Party ]

[ Add a Photo ]
[ Suggest an Update ]
```

Recommended Watch Party module:

- Selected game and kickoff
- **WATCH PARTY**
- Hosted by
- Event or organizer link
- Start or arrival information
- Event-specific positive tags such as **RSVP REQUESTED** and **CAL SPECIALS** when known
- Event-level 21+, ALL AGES, or audio information only when it adds context not already represented persistently for the venue
- Restrictions or game-day note when present
- Current Bear count
- **I’ll be here**

On the mobile continuous Venue Profile, persistent community-contributed Venue observations appear in a compact **WHAT TO KNOW** block immediately after the venue identity/address and before the Watch Party module. The header includes a quiet **Add info →** link to the existing prefilled **Tell us about this location** Form without adding a separate CTA row. Render only known positive tags: **21+**, **ALL AGES**, **AUDIO ON**, **FOOD**, **CAL BEER**, **LARGE CROWD**, and **CAL MEMORABILIA**. When none are known, keep the block compact with a subtle empty state. Do not duplicate these tags later under community quotes.

The community experience section is labeled **YOU SAY** and contains fan experiences plus the existing experience-contribution prompt. **CGB SAYS** remains reserved for CGB editorial content. When an approved venue photo exists, mobile and desktop both use a photo-forward opening rather than deferring the image beneath community/editorial content. On mobile, the selected-card opening pairs venue identity with the approved 3:2 photo in the first row and **WHAT TO KNOW** with current attendance in the second row; the Watch Party and selected-game actions then continue below at full width. **CGB SAYS** and **YOU SAY** remain in the continuous profile below those primary decision and action elements.

Approved venue photos use the shared 3:2 cover crop. When no approved photo is available, the photo position disappears and the existing local-map fallback behavior remains available in the continued profile.

## 11. Venue contributions

Every Venue may link to a short prefilled **Tell us about this location** Form containing the canonical Venue name and Venue ID. The contributor may provide relationship/frequency context, optional freeform context, and any known positive structured Venue details.

The structured Venue details are intentionally additive. A single valid submission may seed a previously absent persistent Venue tag without corroboration. Unchecked options mean unknown/not asserted, not false. The optional freeform answer is copied into `Fan_Experiences_Raw` for the canonical Venue and processed through the same Fan Experience cleaning and moderation pipeline as the focused Fan Experience form. It may appear under **YOU SAY** only when that pipeline publishes it; it never becomes **CGB SAYS** copy. Submitter relationship/frequency context and private email remain private.

A separate **Add or update location details** Form handles missing information and corrections. Safe additive structured Venue tags may publish automatically. Closure, relocation, Venue identity/name/address changes, and other destructive or materially conflicting changes remain private for manual review.

Cal Bar classification remains an editorial decision. Structured contributions do not automatically change:

```text
community_location → cal_bar
```

The Venue ID, history, Watch Parties, URL, and Fan Intent records remain unchanged by classification decisions.

## 12. Watch Party submissions

Every relevant venue page includes:

> **Is there a watch party going on?**  
> **Submit a Watch Party**

The Google Form collects structured information:

- Venue
- Game or games
- Organizer or host
- Organizer type
- Optional official event/RSVP link
- Optional event start or suggested arrival time; include a timezone for automatic publication
- Submitter relationship
- Optional private contact email
- Optional combined structured detail block
- Optional freeform game-day note

The combined structured detail block uses the same contributor-facing vocabulary across Watch Party creation and update Forms. Venue-capable selections normalize to **21+**, **ALL AGES**, **AUDIO ON**, **FOOD**, **CAL BEER**, **LARGE CROWD**, and **CAL MEMORABILIA**. Watch Party-only selections normalize to **RSVP REQUESTED** and **CAL SPECIALS**.

Submission behavior:

1. Google Forms preserves the original response in a private raw log.
2. Apps Script validates required structured fields.
3. Apps Script creates one Watch Party record per selected game.
4. The Watch Party publishes automatically.
5. Venue-capable positive selections may immediately seed absent persistent Venue tags; one valid submission is sufficient.
6. Watch Party-only selections remain attached only to that event.
7. Existing event-level 21+, all-ages, and audio fields remain supported for backward compatibility.
8. A valid timezone-qualified start/arrival time may publish automatically. Ambiguous times remain private for review.
9. Destructive or identity changes such as cancellation/move, organizer replacement, or material event-link replacement are never auto-applied from an unreviewed update.
10. The user sees a simple submission confirmation.

Use **Watch Party**, not **Confirmed Watch Party**, as the default label.

A separate prefilled **Add or update Watch Party details** Form targets the canonical Watch Party ID. Safe additive structured details may update automatically; consequential corrections remain private for review.

## 13. Photos

Users may add venue photos through a separate Google Form.

The form contains:

- Prefilled venue ID
- Prefilled venue name
- File upload
- Optional caption
- Optional photographer credit
- Required permission confirmation

Permission language:

> I took this photo or have permission to share it, and I authorize Cal Golden Bars to display it on the website.

Google sign-in may be required for file upload. Photos do not publish automatically. CGB reviews the image and adds the approved photo URL and credit to the venue record.

Native website photo upload is deferred.

## 14. Other forms

Use focused forms rather than one large branched form:

1. **Tell us about this location**
2. **Add or update location details**
3. **Add a Watch Party**
4. **Add or update Watch Party details**
5. **Add a Photo**
6. **Suggest a Missing Location**, only when place search fails

The first four Forms share a controlled structured vocabulary where relevant, but Venue and Watch Party entities remain separate. Contributors should not need to understand that underlying ownership split.

No automated email, receipt number, public status tracker, post-submission edit link, contributor account, or venue dashboard is required.

## 15. Backend and privacy

Use one private Google Spreadsheet with multiple tabs as the backend database.

The workbook is not published to the web and is not shared publicly. A Google Apps Script web app reads and writes the private workbook using the owner’s permissions.

The public website receives only deliberately selected public fields. It never receives:

- Anonymous browser IDs
- Raw form submissions
- Submitter contact information
- Photo permission records
- Administrative notes
- Spreadsheet IDs or URLs

## 16. URLs and sharing

Preferred logical routes:

- Homepage and next game: `/`
- Game-specific map: query or route preserving `game_id`
- Venue: `/venue/{slug}`
- Venue focused on a game: `/venue/{slug}?game={game_id}`

Sharing preserves venue and selected-game context. Use the native share sheet when available and copy-link fallback otherwise.

Generic social metadata is acceptable for the prototype if unique server-readable previews would delay core engagement work.

## 17. Included in the functional prototype

- Mobile-first game-aware map
- 2026 schedule data
- Cal Bars and persistent Community Locations
- External venue search
- Immediate Community Location creation through **I’ll be here**
- Anonymous Fan Intent, undo, and move behavior
- Current and historical Bear activity
- Venue detail pages
- Watch Party auto-publication and logging
- Structured Venue contribution and location-update Forms
- Structured Watch Party creation and update Forms
- Photo-upload form
- Private multi-tab Google Sheets backend
- Apps Script controlled public read/write layer
- Stable IDs and shareable venue/game URLs
- Basic analytics
- Resilient data loading or last-known-good fallback

## 18. Explicitly excluded or deferred

- Monetization
- Venue or organizer accounts
- True venue claiming
- User profiles
- Comments or messaging
- Public attendee identities
- Payments or ticketing
- Native RSVP management
- Automated email notifications
- Submission receipts or status tracker
- Native anonymous photo uploads
- Sophisticated duplicate detection
- Detailed closure, ownership-change, and rename workflows
- Other schools
- Dynamic social-preview infrastructure if it threatens launch timing

## 19. Prototype acceptance criteria

The prototype is functional when a mobile user can:

1. Select a game.
2. View Cal Bars and Community Locations.
3. Open a venue.
4. Tap **I’ll be here** without completing a form.
5. See the current count update.
6. Undo or move the selection.
7. Search for an unlisted venue.
8. Select an external place result.
9. Create a persistent Community Location.
10. Return later and find the venue still available.
11. See historical Cal-game activity on the venue page.
12. Submit a Watch Party that publishes automatically and is logged.
13. Open a prefilled **Tell us about this location** form.
14. Open the correct Venue or Watch Party update form with stable entity context.
15. Open an optional photo-upload form.

## 20. Product-design status

No additional product decision is required before coding. Exact visual spacing, API shapes, ID formats, caching, and similar engineering details may be resolved during implementation.