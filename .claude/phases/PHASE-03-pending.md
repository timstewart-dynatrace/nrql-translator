# Phase 03 — CLI and App Feature Parity
Status: PENDING

## Goal
Update the CLI and Dynatrace app to expose new engine capabilities (validators, better errors, translation notes).

## Tasks

### CLI enhancements (nrql-translator/)
- [ ] `query` command: show TranslationNotes categories (data source, key differences, testing recommendations)
- [ ] `query` command: show confidenceScore (0-100) alongside confidence level
- [ ] `query --validate` flag: run DQLSyntaxValidator on output, show errors/warnings
- [ ] `query --fix` flag: run DQLFixer on output, show applied fixes
- [ ] `excel` command: add columns for confidenceScore and fix count in output
- [ ] `validate` command: update to compare engine output vs Python compiler (if still needed)

### Dynatrace app enhancements (nrql-translator-app/)
- [ ] Show TranslationNotes in collapsible sections (data source, key differences, etc.)
- [ ] Show confidenceScore as a progress bar or badge alongside confidence level
- [ ] Show applied fixes (if any) in a "Auto-corrections" section
- [ ] Show DQL validation warnings from DQLSyntaxValidator
- [ ] Add "Validate DQL" button that runs the validator on the output
- [ ] Update app version in all 4 locations

### Remove dead code
- [ ] Delete any remaining references to the old regex translator
- [ ] Remove old UNSUPPORTED_FUNCTIONS handling (engine handles these now)
- [ ] Remove old special-case parsing code that the AST compiler handles natively

## Acceptance Criteria
- CLI shows notes, score, and validation results
- App UI displays all new metadata
- No dead code from old translator remains
- App deploys successfully to DT tenant

## Decisions Made This Phase
(append as you go)
