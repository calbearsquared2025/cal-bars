# California Golden Bars development instructions

## Source of truth

Canonical planning and audit documentation is maintained only in the private `calbearsquared2025/cal-golden-bars-planning` repository. Do not copy those documents into this public repository.

Before changing product behavior, read the relevant private planning documents in this order:

1. `CGB_v2_MVP_Product_Specification.md`
2. `CGB_v2_Data_and_Privacy_Specification.md`
3. `CGB_v2_Implementation_and_Delivery_Plan.md`
4. `CGB_v2_Project_Control_Log.md`

The former seven-document set is deprecated. `CGB_v2_Repository_Audit.md` and the reports under `audits/` are supporting point-in-time evidence in the private planning repository, not current product authority.

## Constraints

- Preserve GitHub Pages static hosting.
- Preserve MapLibre and MapTiler unless explicitly approved otherwise.
- Use the private Google Spreadsheet only through Apps Script.
- Never commit credentials, workbook identifiers, raw submissions, contact information, browser IDs, private exports, internal planning documents, or private audit reports.
- Treat physical-iPhone usability as the primary design target while retaining responsive desktop behavior.
- Do not add dependencies or change architecture without material justification and approval.
- Do not implement deferred or unapproved work.
- Do not rewrite unrelated working code.
- Keep `main` deployable.
- Do not modify `Live-1003` or `v1-production-2026-07-26` through ordinary development work.

## Workflow

- Inspect existing code and the private canonical documentation before making changes.
- Use a narrow feature branch and draft pull request.
- Keep changes limited to the approved task.
- Run the relevant automated checks and browser tests.
- Provide physical-device previews or checks for visual and interaction changes.
- When implementation work produces commits, include a copy-pasteable local preview command in the completion response so the branch can be reviewed immediately. Default to `py -m http.server 8765` from the repository root and include `http://localhost:8765/`; if that port is unavailable, provide the same command with another free high port.
- Review the complete diff for privacy, security, and unrelated changes.
- Record any required Google, MapTiler, DNS, or GitHub owner actions.
- Stop at the requested acceptance boundary.
