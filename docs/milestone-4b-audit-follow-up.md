# Milestone 4B audit follow-up

This note records conclusions from the pre-acceptance audit of PR #14. It does not expand Milestone 4B scope or authorize later milestones.

## Corrected before manual acceptance

The following material defects were corrected in the current draft PR:

1. **Canonical address reuse:** U.S. state names returned by MapTiler, such as `California`, now compare equivalently with canonical abbreviations such as `CA`. This prevents a common duplicate path when an external result resolves to an existing Community Location or Cal Bar.
2. **Search lifecycle:** submitting the search form or selecting an existing CGB suggestion now invalidates any pending external autocomplete request. A delayed MapTiler response can no longer reopen stale external suggestions after another search action has been committed.
3. **Server-success boundary:** a validated successful `joinExternalVenue` response is no longer reclassified as a failed creation merely because later rendering or map movement throws. Post-success UI effects are best-effort and logged separately.

Focused regression coverage was added for the state-name/address comparison, stale external-search invalidation, and successful writes followed by rendering or map exceptions.

## Review during Milestone 4B manual acceptance

These findings do not block the corrected branch from entering Matthew's manual acceptance, but should be explicitly checked on physical devices:

- The external confirmation should be reviewed when a game becomes closed while the dialog is already open. The server rejects the write safely, but the external CTA does not currently mirror the existing-venue **Selections closed** state before submission.
- Success copy and analytics currently say a Community Location was created even when the server reuses an existing Community Location or Cal Bar.
- Verify the visible **Search** button and the iPhone keyboard search action both leave the intended selected/tray state and do not reopen autocomplete.
- Check external-result discoverability when several existing CGB results fill the limited-height suggestion panel.
- Check focus return, Escape behavior, screen-reader announcements, and keyboard navigation for the listbox and native confirmation dialog.
- Test representative iPhone portrait and landscape viewports. The current `max-width: 430px` landscape rule is unlikely to match typical iPhone landscape widths and may need adjustment based on device evidence.

## Review during Milestone 6 supporting contributions

- Resolve the documented scheduling conflict for the missing-location fallback. Milestone 4B contains the exact copy and an HTTPS-only configuration point; Milestone 6 should create/configure the actual form and prefilled venue/game parameters.
- Update the canonical Development Workflow so it clearly states that Milestone 4 owns the link integration point and Milestone 6 owns form construction and final URL configuration.

## Review during Milestone 7 launch hardening

- Expand full-frontend browser coverage for external creation followed by Undo, move, refresh, future-game browsing, direct venue/game routing, and sharing.
- Exercise failure injection after partial Fan Intent updates, during response construction, and during rollback itself. Google Sheets rollback remains best-effort compensating behavior rather than a true transaction.
- Review the public creation endpoint for practical abuse, malformed-but-valid place payloads, monitoring, and rate-limiting needs. Complex abuse prevention remains deferred unless launch evidence requires it.
- Replace runtime MapTiler-key discovery with a clearer shared public configuration value if live-browser evidence shows the resource/style scan to be unreliable.
- Include external search terms sent to MapTiler in the concise launch privacy disclosure.
- Monitor duplicate venue creation caused by postal-code omissions, suite/unit differences, provider-ID changes, and multi-tenant buildings. Sophisticated reconciliation remains deferred.

## Scope guardrail

No item in this note authorizes Milestone 5, Milestone 6, or Milestone 7 implementation. Each item should be reconsidered only in the stated review phase or earlier if manual acceptance reveals a material blocker.
