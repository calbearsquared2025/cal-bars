# Cal Golden Bars Development Instructions

## Source of truth

Before implementing a feature, read the relevant documents in the private planning repository:

1. `CGB_v2_MVP_Product_Specification.md`
2. `CGB_v2_Data_Dictionary.md`
3. `CGB_v2_MVP_Implementation_Plan.md`
4. `CGB_v2_Decision_Log.md`
5. `CGB_Working_Lists.md`
6. `CGB_v2_Project_Summary_Report.md`
7. `CGB_v2_ChatGPT_Development_Workflow.md`
8. `CGB_v2_Repository_Audit.md`

## Project constraints

- Preserve GitHub Pages static hosting.
- Preserve MapLibre and MapTiler unless explicitly approved otherwise.
- Use the private Google Spreadsheet only through Apps Script.
- Never commit credentials, workbook identifiers, raw submissions, contact information, browser IDs, or private exports.
- Mobile iPhone usability is the primary design target.
- Do not add dependencies unless they provide material value.
- Do not implement deferred features.
- Do not rewrite unrelated working code.
- Keep `main` deployable.
- Keep `Live-1003` and `v1-production-2026-07-26` unchanged.

## Required workflow

- Inspect existing code before changing architecture.
- Work on a feature branch.
- Keep changes limited to the assigned milestone.
- Run available tests and basic browser checks.
- Update relevant documentation when behavior changes.
- Review the complete diff before finishing.
- Summarize changed files, tests, risks, and manual setup steps.
