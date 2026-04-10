# Engine Integration Rules

## Shared Engine

The NRQL-to-DQL translation engine lives in a separate repo: `/Users/Shared/GitHub/nrql-engine/`
(published as `@timstewart-dynatrace/nrql-engine`).

This project (nrql-translator) is a **front-end consumer** of that engine. It provides:
- CLI for batch translation (Excel, single query)
- Dynatrace App UI for interactive translation
- Adapter layer mapping engine output to the existing TranslationResult interface

## Rules

### Do NOT duplicate engine logic
- Translation logic (parsing, mapping, DQL generation) belongs in the engine repo
- This repo contains only the adapter, CLI, and UI
- If a new NRQL pattern needs support, add it to nrql-engine, not here

### Adapter pattern
The adapter wraps `NRQLCompiler.compile()` → `TranslationResult`:
- `result.confidence` needs case conversion (engine: 'HIGH', app: 'high')
- `result.notes` maps directly (same TranslationNotes interface)
- `result.dql` passes through
- `result.warnings` passes through
- `result.confidenceScore` is new — expose in UI and CLI
- `result.fixes` is new — expose as "auto-corrections"

### Version coupling
When the engine publishes a new version:
1. Update the dependency in package.json
2. Run tests to catch any output changes
3. Bump nrql-translator version in all 4 locations
4. Update CHANGELOG

### Testing strategy
- Engine has 677 unit tests for correctness
- nrql-translator has 133+ integration tests for end-to-end behavior
- Both test suites must pass before release
- If an integration test fails after engine update, determine whether the old or new output is correct

### Dynatrace App bundling
- The dt-app bundler may not resolve npm packages the same way as Node.js
- If direct engine import fails in the app, re-export from the library package instead
- The app imports from `@timstewart-dynatrace/nrql-translator` (the library), which re-exports the engine
