# Watch Party attendance handoff

**Implemented:** August 20, 2026  
**Status:** Draft PR behavior; user-facing wording is intentionally provisional

## Purpose

Submitting or sharing a Watch Party is not the same thing as committing attendance. Before Cal Golden Bars transfers a user to the external Google Watch Party Form, the site now asks for one explicit attendance choice.

Temporary choices:

- **Yes, I’ll be there**
- **No, I’m sharing it**

The copy may be refined after product-owner acceptance testing. The behavioral distinction should remain explicit.

## Existing CGB venue flow

For an existing venue, every Watch Party form entry point uses the shared attendance handoff.

### Yes

1. Reserve a blank child window from the user gesture.
2. Call the existing idempotent `CGBFanIntent.ensureAttendance(venueId, gameId)` owner.
3. Existing attendance at the same venue/game remains a no-op.
4. Attendance elsewhere for that game uses the existing move behavior.
5. After the Fan Intent write succeeds, navigate the reserved child window to the existing prefilled Google Form URL.

### No / sharing

1. Reserve a blank child window from the user gesture.
2. Do not create, move, withdraw, or otherwise modify Fan Intent.
3. Navigate the reserved child window to the same prefilled Google Form URL.

A prior independent Fan Intent selection is not withdrawn merely because the user chooses the sharing path.

## External venue Watch Party flow

An external MapTiler place requires a canonical Venue before the Watch Party Form can be prefilled.

### Yes

The existing `joinExternalVenue` action remains unchanged. It verifies/deduplicates/creates the Community Location and commits Fan Intent in the same transaction, then the frontend opens the prefilled Watch Party Form.

### No / sharing

The new `addExternalVenue` action:

1. Validates the selected upcoming Game.
2. Verifies the MapTiler place on the server.
3. Matches by external place ID and then normalized address.
4. Creates a published Community Location only when no canonical match exists.
5. Returns the whitelisted canonical Venue.
6. Does **not** accept a browser ID.
7. Does **not** read or write `Fan_Intent`.
8. Does **not** return an attendance selection.

The frontend then opens the same prefilled Watch Party Form using the canonical Venue ID.

## Form-transfer behavior

The attendance-choice button click synchronously reserves a blank child window to avoid losing the Google Form transfer to popup blocking while an attendance or venue write is pending.

The temporary child page displays:

> Loading Watch Party submission form…

Before navigating cross-origin, its `opener` reference is cleared. If the child window cannot be reserved or reused, the site falls back to same-tab navigation so the form transfer is not silently lost.

## Covered entry points

- Selected-card **Plan a Watch Party**
- Venue-detail **Submit a Watch Party**
- Venue-detail **Add Another Watch Party**
- Add surface Watch Party action for an existing selected venue
- Watch Party contribution search selecting an existing venue
- External-place **Plan a Watch Party**

## Data and privacy

The Google Form prefill contract is unchanged. Browser identity and Fan Intent records are never added to the Form URL.

`addExternalVenue` returns only public Venue data and response metadata. It does not return browser identity, Fan Intent identity, or a selection object.

## Deployment

No workbook schema change is required.

Before testing the external sharing path against a deployed environment, copy/deploy:

- `apps-script/ExternalVenueContribution.gs`
- updated `apps-script/FanIntent.gs`

Then create/update the Apps Script web-app deployment using the existing project deployment procedure.

Existing-venue attendance handoff behavior is frontend-only and does not depend on the new Apps Script action.

## Deliberate non-goals

- No Google Form fields are changed.
- Watch Party publication behavior is unchanged.
- Ordinary **I’ll be here** behavior is unchanged.
- The standalone external **Add a location** flow is not redesigned by this change.
- Final modal wording is deferred until acceptance testing.
