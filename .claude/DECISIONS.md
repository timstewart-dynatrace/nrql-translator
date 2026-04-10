# Decisions

This file tracks all non-trivial technical decisions made during this project.

Log decisions **at the time** they're made, not retroactively. Decisions are append-only.

---

## 2026-04-10 — Replace regex translator with AST engine

**Chosen:** Replace the 2,197-line regex-based `NRQLToDQLTranslator` with the AST-based `NRQLCompiler` from `@timstewart-dynatrace/nrql-engine`
**Alternatives:** Continue extending the regex translator; rewrite in-place without a shared package
**Why:** The regex translator had ~80 patterns and was hitting diminishing returns — depth-aware parsing was fragile, and every new pattern risked regressions. The AST engine has 292 compiled patterns, 677 tests, and a proper parser. Extracting it as a shared package eliminates the code duplication between the library and Dynatrace app.
**Trade-offs:** Adds an external dependency. Engine changes require a publish cycle before this project can consume them. The dt-app bundler may not resolve npm packages the same way as Node.js.
**Revisit if:** The engine package becomes unmaintained, or the dt-app bundler cannot resolve the package (fallback: re-export from library).

## 2026-04-10 — Split Dynatrace App into separate repo

**Chosen:** Move `nrql-translator-app/` to its own repo (`timstewart-dynatrace/nrql-translator-app`)
**Alternatives:** Keep monorepo; have app depend on published library package
**Why:** App and library were already functionally independent — app imports engine directly, not via library. No shared configs, no symlinks. Separate repos make ownership, versioning, and deployment clearer.
**Trade-offs:** types.ts is duplicated in both repos. Changes to TranslationResult must be made in both places.
**Revisit if:** Types diverge significantly — consider publishing a shared types package from the engine.

## 2026-04-10 — Thin adapter pattern for engine integration

**Chosen:** ~60-line adapter wrapping `NRQLCompiler.compile()` → `TranslationResult`, preserving the existing public API
**Alternatives:** Expose engine types directly; rewrite consumers to use engine types
**Why:** Preserving the `TranslationResult` interface means existing tests and consumers (CLI, app) don't need changes. The adapter handles case conversion (engine: 'HIGH', app: 'high'), notes mapping, and new fields (confidenceScore, fixes).
**Trade-offs:** Slight indirection. If engine types diverge significantly, the adapter becomes a maintenance burden.
**Revisit if:** The engine's `CompileResult` becomes the de facto public API and the adapter adds no value.
