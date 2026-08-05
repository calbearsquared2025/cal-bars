# Server-side MapTiler confirmation

New external Community Locations remain immediate-publication records, but browser-supplied place details are not trusted for creation.

## Runtime behavior

- Existing canonical Venues matched by MapTiler place ID or normalized address are reused without another provider request.
- A genuinely new external Venue triggers one MapTiler geocoding request by feature ID.
- The server publishes only the name, address hierarchy, country, and coordinates returned by MapTiler.
- Missing configuration, provider errors, a mismatched feature ID, unsupported place type, malformed address hierarchy, or invalid coordinates fail closed.
- No draft or moderation state is introduced.

## Private Apps Script configuration

Do not commit the verification key.

1. Create a dedicated MapTiler API key for the Apps Script verification request.
2. In the bound Apps Script project, open **Project Settings → Script Properties**.
3. Add:

   ```text
   CGB_MAPTILER_API_KEY = <private server-side key>
   ```

4. Upload the current `apps-script/ExternalVenue.gs` and `apps-script/appsscript.json`.
5. Run `authorizeMapTilerVerification()` once in the Apps Script editor and approve the added external-request permission.
6. Create a new web-app deployment version only during the separately approved deployment step.
7. Exercise one controlled new external Venue and confirm that the canonical Sheet row matches MapTiler rather than altered browser fields.

The key value must never be placed in GitHub, a public document, browser storage, logs, screenshots, or test output.
