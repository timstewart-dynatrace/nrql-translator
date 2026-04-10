# Phase 03 — CLI and App Feature Parity
Status: ACTIVE

## Goal
Update the CLI and Dynatrace app to expose new engine capabilities (validator, fixer, missing note sections). Remove dead code.

## Tasks

### Adapter updates (nrql-translator/src/core/)
- [x] Expose `confidenceScore` (number 0-100) in `TranslationResult` interface
- [x] Expose `fixes` (string[]) in `TranslationResult`
- [x] Update `types.ts` with new fields
- [x] Update adapter in `NRQLToDQLTranslator.ts` to pass through new fields
- [x] Update app adapter and app types.ts to match

### CLI enhancements (nrql-translator/src/cli/index.ts)
- [x] `query` command: show confidenceScore (0-100) alongside confidence level
- [x] `query` command: show auto-corrections when present
- [x] `query --validate` flag: run `DQLSyntaxValidator` on output
- [x] `query --fix` flag: run `DQLFixer` on output, show applied fixes
- [x] `query --verbose`: added fieldExtraction note section (was missing)
- [ ] `excel` command: add columns for confidenceScore and fix count — deferred (separate PR)
- [ ] `validate` command: decide if Python compiler comparison is still needed — deferred

### Dynatrace app enhancements (Translator.tsx)
- [x] Add missing note sections: fieldExtraction, performanceConsiderations, dataModelRequirements (now 6/6)
- [x] Show confidenceScore as numeric badge alongside confidence level
- [x] Show applied fixes in "Auto-corrections" section
- [ ] Add "Validate DQL" button — deferred (requires engine import in app bundle, needs testing)

### Remove dead code
- [ ] Audit for remaining regex translator references — deferred to separate cleanup PR

## Acceptance Criteria
- [x] CLI `query` shows confidence score, validation (--validate), and fixes (--fix)
- [x] App UI displays all 6 note sections, confidence score, auto-corrections
- [x] All 151 tests pass
- [x] Library builds clean (`npm run build`)

## Decisions Made This Phase

### 2026-04-10 — Defer excel column additions and validate command cleanup
Excel command enhancements and validate command decision are low-priority quality-of-life improvements. Ship the core adapter/CLI/app changes first; add excel columns in a follow-up.

### 2026-04-10 — Defer app-side DQL validation button
Importing DQLSyntaxValidator directly in the app requires confirming the dt-app bundler can resolve it. Ship note sections and confidence score now; add validation button after testing with `npm run start`.
