# Milestone 7E — Missing-location fallback Form

Status: awaiting acceptance.

Scope is limited to a separate, manually reviewed missing-location Form shown only after normal existing-Venue and MapTiler paths produce no valid options, or when the user explicitly chooses the missing-location action.

No submission automatically creates, classifies, publishes, or modifies a Venue. Milestone 7F is not included.

The fallback reuses the existing external-search query state and appears only after both existing CGB results and external MapTiler results are exhausted. Direct routes and refreshes do not show it by default. The selected Game is intentionally not added to this Form because the separate Form has no Game field and preserving it would add a new link contract beyond the accepted contribution-form pattern.

Responses remain private in the master project workbook for manual review. The application sends no submission to Apps Script and performs no automatic Venue action.
