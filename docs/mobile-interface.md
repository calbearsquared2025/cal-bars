# Milestone 2 — Mobile Interface

This milestone connects the normalized v2 public read model to a mobile-first interface without enabling write actions or changing production hosting.

## Included

- Default-next-game selection and compact schedule dialog
- Localized confirmed kickoff time and **Time TBD** handling
- Watch Party and location summary counts
- City, ZIP, and mapped-venue search
- User-initiated geolocation
- MapLibre markers for Watch Parties, Cal Bars, and Community Locations
- Current Bear count badges
- Mobile lower tray with peek, selected-card, and full-list states
- Distance-aware ordering after search or geolocation
- Selected venue decision card
- Read-only venue detail route using `?venue={slug}&game={game_id}`
- Directions and native-share/copy-link fallback
- Responsive desktop map-and-list layout
- Live endpoint, last-known-good, and static fallback loading sequence

## Explicit exclusions

- Fan Intent writes, move, or undo
- External place results and Community Location creation
- Watch Party form processing
- Nomination and correction forms
- Photo submission or display
- Production deployment changes

The **I’ll be here** control is visible but disabled in this read-only preview. It becomes functional in Milestone 3.

## Local preview

Run from the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` rather than using `file://`.

## Optional private endpoint testing

The endpoint URL is intentionally not committed. In the browser console for a non-production preview:

```js
CGBPreview.setDataEndpoint('YOUR_APPS_SCRIPT_WEB_APP_URL')
```

Return to fallback data with:

```js
CGBPreview.clearDataEndpoint()
```

## Acceptance checks

- Default game is the next upcoming game.
- Selecting a different game changes Watch Parties, counts, markers, and links.
- Watch Party markers take priority over venue-type markers for the selected game.
- Search and Near me can rank the list by distance.
- Selecting a marker or list item opens the selected venue card.
- Directions and sharing preserve the selected venue and game.
- Direct refresh of a query-based venue URL works on static hosting.
- The interface remains usable when MapLibre or the live endpoint is unavailable.
- No private fields or write requests are sent by the frontend.
