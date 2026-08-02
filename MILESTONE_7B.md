# Milestone 7B — External Venue Watch Party CTA

**Status:** implementation and automated validation complete; awaiting product-owner acceptance.

After `joinExternalVenue` succeeds, the frontend detects the transition from an uncommitted external result to the returned canonical Venue. It then offers a one-time **Submit a Watch Party** action in the selected Venue card using the accepted existing-Venue Google Form prefill contract.

The CTA is never rendered before canonical creation, on failed writes, after a selected-Game change, or more than once for the same completed transition. The canonical Venue detail page remains the durable contribution path after refresh or later navigation.

No Watch Party processing, Form fields, Apps Script, workbook schema, public endpoint, dependency, production deployment, or protected branch changed.
