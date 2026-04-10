# Phase 01 — Publish and Wire Engine Package
Status: DONE

## Goal
Replace the 2,197-line regex-based NRQLToDQLTranslator with the AST-based engine from nrql-engine. Eliminate code duplication between library and app.

## Tasks

### Publish the engine
- [x] Merge nrql-engine PR #1 (feature/engine-port) to main
- [x] Tag nrql-engine as v0.1.0
- [x] Add npm publish config to nrql-engine/package.json (scope: @timstewart-dynatrace/nrql-engine or similar)
- [x] Publish to GitHub Packages (same registry nrql-translator already uses)

### Wire the standalone library (nrql-translator/)
- [x] `npm install @timstewart-dynatrace/nrql-engine` in nrql-translator/
- [x] Create thin adapter: `src/core/NRQLToDQLTranslator.ts` (~50 lines wrapping engine)
  - Import NRQLCompiler from engine
  - Map CompileResult → TranslationResult (confidence case, notes format)
  - Preserve TranslationContext interface for custom mappings
- [x] Keep `src/core/types.ts` as-is (it defines the public interface consumers expect)
- [x] Update `src/core/index.ts` exports
- [x] Run existing tests: `npm test` — compare output with before/after
- [x] Fix any assertion differences (the AST compiler may produce slightly different DQL formatting)

### Wire the Dynatrace app (nrql-translator-app/)
- [x] Delete `nrql-translator-app/nrql-translator/ui/app/utils/NRQLToDQLTranslator.ts` (76KB copy)
- [x] Delete `nrql-translator-app/nrql-translator/ui/app/utils/types.ts` (copy)
- [x] Import from the published engine package OR from the sibling library
  - Option A: `import { NRQLToDQLTranslator } from '@timstewart-dynatrace/nrql-translator'` (the library re-exports)
  - Option B: Direct engine import if dt-app bundler supports it
- [x] Update `Translator.tsx` to use the new import path
- [x] Test with `npm run start` (dt-app dev server)
- [x] Verify translate button works, confidence/notes display correctly

## Acceptance Criteria
- Zero duplicated translator code
- All existing nrql-translator tests pass
- Dynatrace app builds and runs
- 292 compiler patterns available (vs ~80 from regex translator)

## Decisions Made This Phase
(append as you go)
