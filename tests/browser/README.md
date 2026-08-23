# Browser acceptance tests

The browser suite validates the current user-visible CGB contract. It intentionally avoids treating internal navigation variables, `body.dataset` markers, or historical implementation details as product requirements.

The default `npm run test:browser` run covers:

- static mobile first paint;
- the existing external-location attendance split;
- mobile Map → Locations → selected Venue → full Profile;
- mobile Profile → Locations navigation;
- direct mobile Profile routes;
- restoration of stored Fan Intent as visible attendance state;
- desktop Locations → full Venue Profile while the map remains visible;
- no internal Watch Party scrollbar in the full desktop Venue Profile;
- small-portrait and short-landscape Profile usability.

The runtime acceptance pages use one synthetic snapshot from `tests/fixtures/public-snapshot.synthetic.json` from first load onward. Fixture records are selected by semantic fields such as venue slug and opponent name rather than by hard-coded internal game IDs.

Use `CGB_BROWSER_HARNESS_ONLY=<scenario> npm run test:browser` to run a focused scenario. Supported scenario keys are `first-paint`, `external`, `mobile-flow`, `mobile-direct`, `restored-fan-intent`, `desktop-flow`, `small-profile`, and `landscape-profile`.

When product behavior changes intentionally, update the acceptance checks to the approved visible behavior. Do not preserve obsolete assertions solely because they existed in an older harness, and do not weaken a current user-facing assertion merely to make the suite green.
