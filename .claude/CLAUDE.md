# NRQL Translator

**ALWAYS** ask clarifying questions and **ALWAYS** provide a plan **BEFORE** making changes to ensure the end result matches intent.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **DISCLAIMER**: This is an independent, community-driven project and **not supported by Dynatrace**. Refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for authoritative DQL information.

## Project Summary

Translates New Relic NRQL queries to Dynatrace DQL. Provides a TypeScript library for programmatic use, a Commander.js CLI for batch Excel translation, and a Dynatrace App UI for interactive translation. Powered by the AST-based `@timstewart-dynatrace/nrql-engine` (292 compiled patterns, 677 engine tests).

- **Version:** 1.0.36 (1.1.0 pending — see Phase 04)

**Last Updated:** 2026-04-10

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 18+ | TypeScript support, modern JavaScript |
| Language | TypeScript (strict) | Type safety, shared types between library and app |
| Translation Engine | `@timstewart-dynatrace/nrql-engine` | AST-based compiler, 292 patterns, shared package |
| CLI | Commander.js | Standard Node.js CLI framework |
| App UI | React 18 + Strato Design System | Dynatrace native components |
| Testing | Jest + ts-jest | Unit and integration tests |
| Linting | ESLint | Code quality |
| App Build | dt-app (Vite-based) | Dynatrace app bundler |

## Architecture

See [architecture.md](architecture.md) for detailed project structure, components, and data flow.

### Engine Integration

The translation engine lives in a separate repo: `/Users/Shared/GitHub/nrql-engine/` (published as `@timstewart-dynatrace/nrql-engine`).

| Component | Details |
|-----------|---------|
| Translator | AST-based `NRQLCompiler` from engine (292 patterns) |
| Adapter | Thin adapter (~60-100 lines) mapping `CompileResult` → `TranslationResult` |
| Code location | Single engine package; thin adapters in library and app |
| Test coverage | 677 engine tests + 151 integration tests |

### Translation Flow

```
NRQLToDQLTranslator.translate(nrql)
  → NRQLCompiler.compile(nrql)
  → CompileResult { dql, confidence, confidenceScore, notes, warnings, fixes }
  → Adapter maps to TranslationResult { dql, confidence, notes, warnings }
```

## Essential Commands

```bash
# Library/CLI (run from nrql-translator/)
cd nrql-translator
npm install            # Setup
npm run build          # Compile TS → dist/
npm run build:cli      # Compile CLI → dist-cli/
npm run build:all      # Both
npm test               # Jest (151 tests)
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run typecheck      # tsc --noEmit
npm run cli            # Build + run CLI

# Single test
npx jest --testNamePattern="filter.*arithmetic"
npx jest --verbose

# Dynatrace App (run from nrql-translator-app/nrql-translator/)
cd nrql-translator-app/nrql-translator
npm install            # Setup
npm run start          # dt-app dev (hot reload)
npm run build          # dt-app build
npm run deploy         # dt-app deploy to tenant
```

## Current Phase

Before starting work, check `.claude/phases/` for the active phase.
- **Phase 01:** Done — Published engine, wired library + app, eliminated duplication
- **Phase 02:** Pending — Align tests, close coverage gaps, calibrate confidence
- **Phase 03:** Pending — CLI and app feature parity (notes, validator, fixer)
- **Phase 04:** Pending — Version bump, release, deploy

See @.claude/rules/core.md for phase management details.

## Rules

### Always active
@.claude/rules/core.md
@.claude/rules/development.md
@.claude/rules/testing.md
@.claude/rules/deployment.md

### Debugging & Troubleshooting
@.claude/rules/debugging.md
@.claude/rules/existing-code.md

### Language & Framework
@.claude/rules/typescript.md
@.claude/rules/frontend.md
@.claude/rules/dynatrace-sdk.md

### Domain-specific (project rules)
@.claude/rules/engine-integration.md
@.claude/rules/dynatrace-dql.md
@.claude/rules/dql-functions-reference.md
@.claude/rules/dql-common-patterns.md
@.claude/rules/dql-examples.md

## Quick Reference — Version Management

**CRITICAL:** Update version in **4 places** before deployment:

1. `nrql-translator/package.json` → `"version"`
2. `nrql-translator-app/nrql-translator/app.config.json` → `"version"`
3. `nrql-translator-app/nrql-translator/ui/app/pages/Translator.tsx` → `APP_VERSION` constant
4. `.claude/CLAUDE.md` → Version above

All **MUST** match exactly. Also update `CHANGELOG.md` with changes.

## Key DQL Syntax Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Arrays | `{"a", "b"}` | `('a', 'b')` |
| Equality | `field == "value"` | `field = 'value'` |
| IN operator | `in(field, array("a", "b"))` | `field IN ('a', 'b')` |
| Named params | `round(val, decimals: 2)` | `round(val, 2)` |

## Common Tasks

### Add New Function Mapping

Add to `nrql-engine/src/compiler/emitter.ts` FUNC_MAP, port tests, publish new engine version. Then update the dependency here.

### Add New Event Type Mapping

Add to `nrql-engine/src/compiler/emitter.ts` QUERY_CLASS_MAP. Publish and update dependency.

### Dynatrace App: Strato Imports

Always import from category subpaths, never package root:
```typescript
// Correct
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading } from "@dynatrace/strato-components/typography";

// Wrong — will cause bundle issues
import { Flex, Heading } from "@dynatrace/strato-components";
```

## Decision Log

See `.claude/DECISIONS.md` to track architectural and technical decisions.
