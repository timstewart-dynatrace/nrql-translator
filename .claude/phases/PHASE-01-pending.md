# Phase 01 — Publish and Wire Engine Package
Status: PENDING

## Goal
Replace the 2,197-line regex-based NRQLToDQLTranslator with the AST-based engine from DMA_NewRelic. Eliminate code duplication between library and app.

## Tasks

### Publish the engine
- [ ] Merge DMA_NewRelic PR #1 (feature/engine-port) to main
- [ ] Tag DMA_NewRelic as v0.1.0
- [ ] Add npm publish config to DMA_NewRelic/package.json (scope: @timstewart-dynatrace/nrql-engine or similar)
- [ ] Publish to GitHub Packages (same registry nrql-translator already uses)

### Wire the standalone library (nrql-translator/)
- [ ] `npm install @timstewart-dynatrace/nrql-engine` in nrql-translator/
- [ ] Create thin adapter: `src/core/NRQLToDQLTranslator.ts` (~50 lines wrapping engine)
  - Import NRQLCompiler from engine
  - Map CompileResult → TranslationResult (confidence case, notes format)
  - Preserve TranslationContext interface for custom mappings
- [ ] Keep `src/core/types.ts` as-is (it defines the public interface consumers expect)
- [ ] Update `src/core/index.ts` exports
- [ ] Run existing tests: `npm test` — compare output with before/after
- [ ] Fix any assertion differences (the AST compiler may produce slightly different DQL formatting)

### Wire the Dynatrace app (nrql-translator-app/)
- [ ] Delete `nrql-translator-app/nrql-translator/ui/app/utils/NRQLToDQLTranslator.ts` (76KB copy)
- [ ] Delete `nrql-translator-app/nrql-translator/ui/app/utils/types.ts` (copy)
- [ ] Import from the published engine package OR from the sibling library
  - Option A: `import { NRQLToDQLTranslator } from '@bhdynatrace/nrql-translator'` (the library re-exports)
  - Option B: Direct engine import if dt-app bundler supports it
- [ ] Update `Translator.tsx` to use the new import path
- [ ] Test with `npm run start` (dt-app dev server)
- [ ] Verify translate button works, confidence/notes display correctly

## Acceptance Criteria
- Zero duplicated translator code
- All existing nrql-translator tests pass
- Dynatrace app builds and runs
- 292 compiler patterns available (vs ~80 from regex translator)

## Decisions Made This Phase
(append as you go)
