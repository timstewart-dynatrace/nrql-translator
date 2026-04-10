# Phase 03 — CLI and App Feature Parity
Status: PENDING

## Goal
Update the CLI and Dynatrace app to expose new engine capabilities (validator, fixer, missing note sections). Remove dead code.

## Tasks

### CLI enhancements (nrql-translator/src/cli/index.ts)
- [ ] `query` command: show confidenceScore (0-100) alongside confidence level (engine exposes this but adapter doesn't pass it through yet)
- [ ] `query --validate` flag: run `DQLSyntaxValidator` on output, show errors/warnings
- [ ] `query --fix` flag: run `DQLFixer` on output, show applied fixes
- [ ] `excel` command: add columns for confidenceScore and fix count in output Excel
- [ ] `validate` command: decide if comparison with Python compiler is still needed; remove or update

### Adapter updates (nrql-translator/src/core/)
- [ ] Expose `confidenceScore` (number 0-100) in `TranslationResult` interface — engine provides it but adapter currently drops it
- [ ] Expose `fixes` (string[]) in `TranslationResult` — engine provides auto-corrections but adapter drops them
- [ ] Update `types.ts` with new fields
- [ ] Update adapter in `NRQLToDQLTranslator.ts` to pass through new fields

### Dynatrace app enhancements (nrql-translator-app/nrql-translator/ui/app/pages/Translator.tsx)
Currently renders 3 of 6 note sections. Missing: performanceConsiderations, fieldExtraction, dataModelRequirements.
- [ ] Add missing note sections: performanceConsiderations, fieldExtraction, dataModelRequirements
- [ ] Show confidenceScore as progress bar or numeric badge alongside confidence level
- [ ] Show applied fixes (if any) in an "Auto-corrections" section
- [ ] Add "Validate DQL" button that runs `DQLSyntaxValidator` on output
- [ ] Show DQL validation warnings inline

### Remove dead code
- [ ] Audit library and app for any remaining references to old regex translator patterns
- [ ] Remove old UNSUPPORTED_FUNCTIONS handling if engine handles these now
- [ ] Clean up any commented-out regex-era code

## Acceptance Criteria
- CLI `query` shows confidence score, validation, and fix results with appropriate flags
- CLI `excel` output includes confidenceScore and fix count columns
- App UI displays all 6 note sections, confidence score, auto-corrections, and validation
- No dead code from old regex translator remains
- All 133+ tests still pass
- App builds and runs with `npm run start`

## Decisions Made This Phase
(append as you go)
