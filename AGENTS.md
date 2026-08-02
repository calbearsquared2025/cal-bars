# California Golden Bars development instructions

## Source of truth

Before changing product behavior, read the relevant documents in the private planning repository in this order:

1. `CGB_v2_MVP_Product_Specification.md`
2. `CGB_v2_Data_Dictionary.md`
3. `CGB_v2_MVP_Implementation_Plan.md`
4. `CGB_v2_Decision_Log.md`
5. `CGB_Working_Lists.md`
6. `CGB_v2_Project_Summary_Report.md`
7. `CGB_v2_ChatGPT_Development_Workflow.md`
8. `CGB_v2_Repository_Audit.md`, when available

## Constraints

- Preserve GitHub Pages static hosting.
- Preserve MapLibre and MapTiler unless explicitly approved otherwise.
- Use the private Google Spreadsheet only through Apps Script.
- Never commit credentials, workbook identifiers, raw submissions, contact information, browser IDs, or private exports.
- Treat physical-iPhone usability as the primary design target while retaining responsive desktop behavior.
- Do not add dependencies or change architecture without material justification and approval.
- Do not implement deferred or unapproved work.
- Do not rewrite unrelated working code.
- Keep `main` deployable.
- Do not modify `Live-1003` or `v1-production-2026-07-26` through ordinary development work.

## Workflow

- Inspect existing code and documentation before making changes.
- Use a narrow feature branch and draft pull request.
- Keep changes limited to the approved task.
- Run the relevant automated checks and browser tests.
- Provide physical-device previews or checks for visual and interaction changes.
- Review the complete diff for privacy, security, and unrelated changes.
- Record any required Google, MapTiler, DNS, or GitHub owner actions.
- Stop at the requested acceptance boundary.
