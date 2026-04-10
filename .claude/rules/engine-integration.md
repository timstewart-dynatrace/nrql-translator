# Engine Integration Rules

## Shared Engine

The NRQL-to-DQL translation engine lives in a separate repo: `/Users/Shared/GitHub/nrql-engine/`
(published as `@timstewart-dynatrace/nrql-engine`).

This project (nrql-translator) is a **consumer** of that engine. It provides:
- CLI for batch translation (Excel, single query)
- Adapter layer mapping engine output to the existing TranslationResult interface

The Dynatrace App UI is in a separate repo: [nrql-translator-app](https://github.com/timstewart-dynatrace/nrql-translator-app)

## Rules

### Do NOT duplicate engine logic
- Translation logic (parsing, mapping, DQL generation) belongs in the engine repo
- This repo contains only the adapter and CLI
- If a new NRQL pattern needs support, add it to nrql-engine, not here

### Adapter pattern
The adapter wraps `NRQLCompiler.compile()` → `TranslationResult`:
- `result.confidence` needs case conversion (engine: 'HIGH', adapter: 'high')
- `result.confidenceScore` passes through (0-100)
- `result.notes` maps directly (same TranslationNotes interface)
- `result.dql` passes through
- `result.warnings` passes through
- `result.fixes` passes through as auto-corrections

### Version coupling
When the engine publishes a new version:
1. Update the dependency in package.json
2. Run tests to catch any output changes
3. Bump nrql-translator version in both locations (package.json, .claude/CLAUDE.md)
4. Update CHANGELOG

### Testing strategy
- Engine has 677 unit tests for correctness
- nrql-translator has 151 integration tests for end-to-end behavior
- Both test suites must pass before release
- If an integration test fails after engine update, determine whether the old or new output is correct
