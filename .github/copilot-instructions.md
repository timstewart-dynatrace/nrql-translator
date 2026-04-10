# Copilot Instructions (nrql-translator)

## Big picture
- TypeScript library + CLI for translating NRQL queries to DQL
- Powered by `@timstewart-dynatrace/nrql-engine` (AST compiler, 292 patterns)
- This repo is a thin adapter (~100 lines) + CLI — translation logic lives in the engine

## Related repos
- **Engine**: [nrql-engine](https://github.com/timstewart-dynatrace/nrql-engine) — AST compiler
- **App**: [nrql-translator-app](https://github.com/timstewart-dynatrace/nrql-translator-app) — Dynatrace App UI (separate repo)

## Key modules
- **Adapter**: `src/core/NRQLToDQLTranslator.ts` — wraps `NRQLCompiler.compile()` → `TranslationResult`
- **Types**: `src/core/types.ts` — `TranslationResult`, `TranslationNotes`, etc.
- **CLI**: `src/cli/index.ts` — Commander.js commands: `query`, `excel`, `validate`, `notebook`
- **Tests**: `test/unit/translator.test.ts` (151 tests), `test/fixtures/queries.json`

## Workflows
- Build: `npm run build` (library) / `npm run build:cli` (CLI)
- Test: `npm test`
- CLI: `npm run cli -- query "SELECT count(*) FROM Transaction"`
- Validate DQL: `npm run cli -- query --validate "..."`
- Auto-fix DQL: `npm run cli -- query --fix "..."`

## Conventions
- Don't duplicate engine logic — if a new NRQL pattern needs support, add it to nrql-engine
- Excel CLI status values and colors are in `src/cli/constants.ts`
- Version managed in 2 places: `package.json` and `.claude/CLAUDE.md`
