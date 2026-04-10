# Phase 02 — Align Tests and Close Coverage Gaps
Status: PENDING

## Goal
Ensure the engine produces equivalent or better output for all existing nrql-translator test cases. Add tests for patterns the regex translator couldn't handle.

## Tasks

### Regression testing
- [ ] Run nrql-translator's 133+ tests against the engine adapter
- [ ] Catalog any assertion failures (different DQL formatting, field names, etc.)
- [ ] Fix adapter layer for cosmetic differences (e.g., spacing, comment format)
- [ ] For genuine behavioral differences, decide: keep old behavior or adopt engine's (usually better)

### Test fixture migration
- [ ] Review `test/fixtures/queries.json` — are all patterns covered by engine's 292 tests?
- [ ] Add any nrql-translator-specific patterns that are missing from the engine
- [ ] Port new patterns upstream to nrql-engine if generally useful

### New pattern coverage
- [ ] Test all patterns the regex translator marked as UNSUPPORTED that the engine now handles:
  - histogram → count() + bin()
  - funnel → countIf() decomposition
  - apdex → multi-step decomposition
  - subquery → lookup conversion
  - CASES → nested if()
  - JOIN → lookup
  - SLIDE BY → rolling()
- [ ] Add fixtures for these in nrql-translator's test suite

### Confidence scoring calibration
- [ ] Compare engine's confidenceScore with nrql-translator's existing scoring
- [ ] Adjust scoring weights in engine if needed (or in the adapter)
- [ ] Ensure high/medium/low thresholds align with what users expect

## Acceptance Criteria
- All 133+ existing tests pass
- New patterns tested (histogram, funnel, apdex, subquery, CASES, JOIN, SLIDE BY)
- No regressions in confidence scoring
- Test fixtures updated

## Decisions Made This Phase
(append as you go)
