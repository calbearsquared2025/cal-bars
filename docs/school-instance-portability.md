# School instance portability proof

## Status

This document records the findings from the fictional-school portability proof built after the school-instance configuration extraction.

This is technical groundwork only. It does **not** change the MVP Product Specification decision that other schools are deferred. Production remains hard-wired to the Cal instance, there is no public school selector, and this proof does not deploy a second school site.

The fictional instance is intentionally non-production: **Test University / Test U / Test Foxes / Test Fox Bars**. It exists to expose Cal-specific assumptions without introducing another real institution's identity, data, integrations, or licensing concerns.

## What the proof established

A materially different school presentation can be generated from the current application while preserving Cal production behavior and presentation outside explicitly approved shared-instance corrections. The proof changes visible identity, fan terminology, designated/community venue terminology, colors, mark assets, default geography, home timezone, canonical/social identity, storage namespace, and fixture data.

The generated test instance disables Cal production writes, Google Forms, and analytics. It uses isolated browser storage keys and synthetic public data. The existing public MapTiler client integration is retained for map rendering.

The checked-in application still selects `CAL_INSTANCE_CONFIG`. `npm run materialize:test` creates a disposable copy under `.instance-build/test` and selects `TEST_INSTANCE_CONFIG` only inside that generated output. The materializer refuses to write outside `.instance-build/`.

## Minimum school-instance record suggested by the proof

A future reusable school catalog entry will need at least:

- institution name, short school name, team name, fan singular/plural, product name, and product short name;
- designated-venue and community-location terminology, including badges;
- brand colors and mark/icon assets;
- default map center/zoom and home timezone;
- canonical URL, page title/description, disclaimer, and social identity;
- per-instance browser-storage namespace;
- integration capabilities and URLs, including data endpoint, Forms, analytics, and map configuration.

Backend contract identity should remain separate from display identity. Existing canonical values such as `cal_bar`, `cgb_reviewed`, and `cgb_added`, plus established `cgb-*` DOM/meta identifiers, can remain compatibility identifiers unless a later backend productization milestone explicitly changes those contracts.

## Static surfaces still requiring materialization

Not every school-specific value is runtime-configurable yet. The proof currently materializes or rewrites these surfaces in the disposable output:

- first-paint title, description, canonical URL, JSON-LD, loading treatment, and social metadata;
- mark/favicon references and generated social/share assets;
- explicit semantic and legacy CSS color literals;
- the copied MapTiler style asset and its colors;
- remaining school/fan/product display strings in static HTML or JavaScript;
- frontend storage keys that are not yet consumed directly from the shared instance config;
- fallback/test snapshot data.

The portability proof also found renderer-level display assumptions that were better fixed at source rather than hidden by materialization. Selected-profile attendance labels and Watch Party matchup/specials labels now read active instance identity instead of embedding Cal/Bear/CGB display text. The shared header gradient also now ends in the semantic cover/loading background role instead of a Cal-specific hardcoded blue, so each instance can blend the header into its own cover treatment.

## Color-system implication

The current frontend uses both semantic brand roles and legacy shade/fallback roles. A future setup flow that asks an operator for only four or five school colors is therefore **not yet fully specified**.

Before that simplification is implemented, the product needs an explicit rule for each existing legacy color role: derive it deterministically from the smaller palette, replace it with an existing semantic role, or eliminate it. The fictional instance deliberately supplies explicit legacy colors so this proof does not guess at that later design decision.

## What remains for actual multi-school productization

This proof does not establish a public school catalog, runtime school selection, a second-school data backend, per-school Google resources, deployment automation, custom-domain provisioning, or an admin/setup UI. Those are separate milestones and remain unapproved by this proof.

A real second-school rollout should also decide how instance-specific backend resources are provisioned and separated before enabling writes. The frontend proof intentionally avoids production Forms, Apps Script writes, analytics, or private Google data for the fictional instance.

## Validation standard

The proof is considered successful only when all of the following remain true:

- the normal test suite, public-data validation, private-value scan, and syntax checks pass;
- Cal 390px and 1440px landing/selected screenshot differences from the branch base are limited to explicitly approved shared-instance corrections, with no unrelated visual changes;
- fictional 390px and 1440px captures show the alternate identity, terminology, colors, geography, and fixture data without visible Cal/Bear/CGB branding leakage;
- generated output contains no Cal production write endpoint, Google Form URLs, Cal analytics measurement ID, or Cal browser-storage keys;
- no second-school site is deployed by this PR.
