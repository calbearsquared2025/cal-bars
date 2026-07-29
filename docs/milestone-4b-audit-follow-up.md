# Milestone 4B audit follow-up

This note records conclusions from the pre-acceptance audit and manual acceptance of PR #14. It does not expand Milestone 4B scope or authorize later milestones.

## Corrected before manual acceptance

The following material defects were corrected in the current draft PR:

1. **Canonical address reuse:** U.S. state names returned by MapTiler, such as `California`, now compare equivalently with canonical abbreviations such as `CA`. This prevents a common duplicate path when an external result resolves to an existing Community Location or Cal Bar.
2. **Search lifecycle:** submitting the search form or selecting an existing CGB suggestion now invalidates any pending external autocomplete request. A delayed MapTiler response can no longer reopen stale external suggestions after another search action has been committed.
3. **Server-success boundary:** a validated successful `joinExternalVenue` response is no longer reclassified as a failed creation merely because later rendering or map movement throws. Post-success UI effects are best-effort and logged separately.

Focused regression coverage was added for the state-name/address comparison, stale external-search invalidation, and successful writes followed by rendering or map exceptions.

## Blocking defects found during manual acceptance

Manual testing on July 29, 2026 found two material failures that pause acceptance of PR #14 until corrected and retested:

1. **External administrative hierarchy is persisted at the wrong level.** Searching for Two Pitchers Brewing Company in Oakland created a row with `city = Northlake` and `region = Alameda`. Northlake is a neighborhood/local place within Oakland, while Alameda is the county. The canonical row should use `city = Oakland` and `region = CA`. The current parser accepts several city-like and region-like context types but takes the first matching context item rather than preferring municipality/city over neighborhood/local place and state region over county. This also produced the incorrect slug `two-pitchers-brewing-company-northlake` and weakens normalized-address duplicate matching. Add a regression fixture representing Northlake → Oakland → Alameda County → California before acceptance resumes.
2. **ZIP submission contradicts the visible mapped matches.** Entering `94612` displays multiple mapped locations in autocomplete, but submitting the same ZIP reports zero listed locations within 25 miles. The current submit path recognizes that the query matches a mapped postal-code field, then geocodes the raw query using the first unrestricted MapTiler result and radius-filters from that point. The request is not limited to the United States or to a postal-code result, and it does not validate that the chosen result represents the submitted ZIP. A city/ZIP submission must not report zero nearby locations when the same query already matches mapped venues in that ZIP.

Keep the Two Pitchers row and its associated Fan Intent intact as test evidence until the correction and deliberate retest are complete. Do not merge PR #14 while either blocker remains.

## External website metadata decision

MapTiler's documented Search and Geocoding response does not define a stable website field. POI `feature_tags` are experimental, their keys are unspecified, and a website value is not guaranteed. PR #14 should therefore continue leaving `website_url` blank for newly created MapTiler venues rather than depending on undocumented metadata.

Google Places exposes a supported place website field, but Google Places is not part of the locked current architecture. Reintroducing it would require a separate product, cost, licensing, privacy, key-management, and implementation review; this note does not authorize that change.

## Review during Milestone 4B manual acceptance

After the blocking defects above are corrected, these findings should still be explicitly checked on physical devices:

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
