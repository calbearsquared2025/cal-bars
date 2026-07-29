# Milestone 4B audit follow-up

This note records conclusions from the pre-acceptance audit and manual acceptance of PR #14. It does not expand Milestone 4B scope or authorize later milestones.

## Corrected before manual acceptance

The following material defects were corrected in the current draft PR:

1. **Canonical address reuse:** U.S. state names returned by MapTiler, such as `California`, now compare equivalently with canonical abbreviations such as `CA`. This prevents a common duplicate path when an external result resolves to an existing Community Location or Cal Bar.
2. **Search lifecycle:** submitting the search form or selecting an existing CGB suggestion now invalidates any pending external autocomplete request. A delayed MapTiler response can no longer reopen stale external suggestions after another search action has been committed.
3. **Server-success boundary:** a validated successful `joinExternalVenue` response is no longer reclassified as a failed creation merely because later rendering or map movement throws. Post-success UI effects are best-effort and logged separately.

Focused regression coverage was added for the state-name/address comparison, stale external-search invalidation, and successful writes followed by rendering or map exceptions.

## Manual-acceptance defects corrected; retest required

Manual testing on July 29, 2026 found two additional material failures. Both are corrected in the draft branch but remain acceptance blockers until Matthew completes the focused retest:

1. **External administrative hierarchy:** the MapTiler parser now uses administrative priority instead of first-match response order. A U.S. city-designated municipality is preferred over a neighborhood/local place, state-level `region` is preferred over county, and supported U.S. state codes are persisted canonically. The Two Pitchers regression now resolves Northlake → Oakland and Alameda County → CA, producing `city = Oakland`, `region = CA`, and an Oakland-based slug for newly created records.
2. **ZIP submission consistency:** an exact canonical city, `city + region`, or ZIP match is rendered directly from the loaded CGB snapshot instead of falling through to external area geocoding. A submitted `94612` query therefore shows the same mapped records already visible in autocomplete. If a five-digit U.S. ZIP has no direct mapped match, its fallback MapTiler request is restricted to `country=us`, `types=postal_code`, `autocomplete=false`, and an exact returned ZIP before the 25-mile radius is applied.

Automated coverage includes the actual Two Pitchers hierarchy shape, mapped `94612` submission with multiple venues, and restricted unmatched-ZIP geocoding. The complete validation suite and browser harness pass on the corrected branch.

Keep the original Two Pitchers row and associated Fan Intent intact only until the focused retest is complete. Because the row was created before the parser correction, the code change does not rewrite its stored city, region, or slug. After the corrected result is verified, deliberately repair that row or remove and recreate it while preserving Fan Intent integrity.

## External venue enrichment decision

MapTiler place search provides the location identity and address needed to create a Community Location, but it does not provide dependable canonical values for the enrichment fields used by CGB:

- `website_url`
- `photo_url` and `photo_credit`
- `short_description`

MapTiler's documented Search and Geocoding response does not define a stable website field. POI `feature_tags` are experimental, their keys are unspecified, and a website value is not guaranteed. Photos and an editorial Cal-focused description are also outside the dependable MapTiler result contract. PR #14 therefore leaves these fields blank for newly created MapTiler venues rather than inventing values or depending on undocumented metadata.

The missing values should be supplied later through approved contribution and curation paths: **Suggest an Update** for factual venue information such as a website, **Add a Photo** with permission review, and an edited CGB description derived from a Cal Bar nomination or other reviewed supporting information.

Google Places exposes a supported `websiteUri`, but it is an Enterprise-tier Places field and Google restricts storage of Places content other than specified exceptions such as Place IDs. Google Places data also carries billing, key-management, attribution, privacy-policy, and map-display requirements. A narrow call solely to persist a venue website would therefore conflict with the current durable Google Sheet record model and the locked MapLibre/MapTiler architecture. Google Places is not added in PR #14. Reconsider it only through a separate approved architecture and licensing review.

## Review during Milestone 4B manual acceptance

After the focused hierarchy and ZIP retest passes, these findings should still be explicitly checked on physical devices:

- The external confirmation should be reviewed when a game becomes closed while the dialog is already open. The server rejects the write safely, but the external CTA does not currently mirror the existing-venue **Selections closed** state before submission.
- Success copy and analytics currently say a Community Location was created even when the server reuses an existing Community Location or Cal Bar.
- Verify the visible **Search** button and the iPhone keyboard search action both leave the intended selected/tray state and do not reopen autocomplete.
- Check external-result discoverability when several existing CGB results fill the limited-height suggestion panel.
- Check focus return, Escape behavior, screen-reader announcements, and keyboard navigation for the listbox and native confirmation dialog.
- Test representative iPhone portrait and landscape viewports. The current `max-width: 430px` landscape rule is unlikely to match typical iPhone landscape widths and may need adjustment based on device evidence.

## Review during Milestone 6 supporting contributions

- Resolve the documented scheduling conflict for the missing-location fallback. Milestone 4B contains the exact copy and an HTTPS-only configuration point; Milestone 6 should create/configure the actual form and prefilled venue/game parameters.
- Update the canonical Development Workflow so it clearly states that Milestone 4 owns the link integration point and Milestone 6 owns form construction and final URL configuration.
- Add the approved contribution paths that fill MapTiler enrichment gaps: **Suggest an Update** for website and factual corrections, **Add a Photo** for reviewed authorized images, and reviewed editorial description updates where useful.
- Do not allow a submitter or external API to directly mark a newly created venue as a Cal Bar. The locked model requires every external addition to begin as a Community Location and reserves Cal Bar designation for CGB review.
- Address the current UX gap by making **Think this is a Cal bar? Nominate as a Cal Bar** available contextually after creation and on the Community Location detail view, with the venue ID and name prefilled.

## Review during Milestone 7 launch hardening

- Expand full-frontend browser coverage for external creation followed by Undo, move, refresh, future-game browsing, direct venue/game routing, and sharing.
- Evaluate a lightweight post-selection sharing prompt after a successful **I’ll be here** action. Non-final concept: **Meeting a friend there? Share this location so they can check in too.** It should invoke the existing native-share/copy-link flow, preserve venue and selected-game context, and avoid blocking the successful check-in state.
- Review external-search proximity behavior. Do not automatically request browser geolocation merely because the user focuses the search field. Instead, offer an explicit user-initiated action such as **Search near my location** or **Use my location to prioritize nearby places**. When granted, use location to bias or rank MapTiler results rather than strictly excluding distant results, because users may be searching for an away-game destination, a future location, or a venue near another person. Preserve ordinary search when permission is denied or not requested.
- Review MapTiler query gating and request efficiency. The Milestone 4B baseline starts external autocomplete at three characters after a 300 ms pause. A later optimization should keep local CGB matching immediate while applying type-aware external thresholds: wait for a complete five-digit U.S. ZIP or explicit submission for ZIP searches; consider four characters and roughly a 500–600 ms pause for text searches; allow the explicit **Search** action to force a request; and suppress or delay MapTiler when an existing CGB result is already an obvious exact match.
- Validate any search-gating change against short venue names, short city names, ZIP codes, denied location permission, away-game searches, and explicit keyboard/button submission. Monitor actual MapTiler request volume before and after the change rather than assuming a character threshold alone provides meaningful savings.
- Exercise failure injection after partial Fan Intent updates, during response construction, and during rollback itself. Google Sheets rollback remains best-effort compensating behavior rather than a true transaction.
- Review the public creation endpoint for practical abuse, malformed-but-valid place payloads, monitoring, and rate-limiting needs. Complex abuse prevention remains deferred unless launch evidence requires it.
- Replace runtime MapTiler-key discovery with a clearer shared public configuration value if live-browser evidence shows the resource/style scan to be unreliable.
- Include external search terms sent to MapTiler in the concise launch privacy disclosure.
- Monitor duplicate venue creation caused by postal-code omissions, suite/unit differences, provider-ID changes, and multi-tenant buildings. Sophisticated reconciliation remains deferred.

## Scope guardrail

No item in this note authorizes Milestone 5, Milestone 6, or Milestone 7 implementation. Each item should be reconsidered only in the stated review phase or earlier if manual acceptance reveals a material blocker.
