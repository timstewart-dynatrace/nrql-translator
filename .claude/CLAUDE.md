# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **DISCLAIMER**: This is an independent, community-driven project and **not supported by Dynatrace**. Refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for authoritative DQL information.

## Architecture

This repo contains **two sibling projects** sharing a duplicated translation engine:

- **Library/CLI** (`nrql-translator/`) — TypeScript library + Commander.js CLI for batch Excel translation
- **Dynatrace App** (`nrql-translator-app/nrql-translator/`) — React UI using Strato Design System, deployed via `dt-app`

**Critical**: The core translator is duplicated. Logic changes must be synced to both:
- `nrql-translator/src/core/NRQLToDQLTranslator.ts` (canonical)
- `nrql-translator-app/nrql-translator/src/app/utils/NRQLToDQLTranslator.ts` (copy)
- Same applies to `types.ts` in both locations.

### Translation Flow

`NRQLToDQLTranslator.translate(nrql)` → `TranslationResult { dql, notes, confidence, warnings }`

1. Normalize query (strip comments, backticks, whitespace)
2. Parse NRQL into components (SELECT, FROM, WHERE, FACET, TIMESERIES, ORDER BY, LIMIT, COMPARE WITH, SLIDE BY)
3. Map event types via `EVENT_TYPE_MAP` → DQL `fetch` command
4. Map functions via `FUNCTION_MAP` → DQL aggregations
5. Convert operators and field names via `mapFieldNames()` and `convertOperators()`
6. Generate DQL with confidence scoring (high/medium/low)

### Key Internal Patterns

- **Depth-aware parsing**: All clause keyword detection (WHERE, FACET, SELECT, etc.) uses `findClauseKeyword()` / `extractUntilClauseKeyword()` which track parenthesis depth. Never use regex to match clause keywords — it fails when keywords appear inside function args like `filter(count(*), WHERE ...)`.
- **Static mapping tables**: `FUNCTION_MAP`, `UNSUPPORTED_FUNCTIONS`, `EVENT_TYPE_MAP` — prefer updating these before adding new parser logic.
- **Arithmetic expressions**: `parseAggregationFunction()` has three detection paths: Pattern 1 (outer parens), Pattern 2 (func OP number), arithmetic continuation (func OP func). All produce `_arithmetic_` type handled by `translateArithmeticExpressionParts()`.
- **COMPARE WITH**: Generates `append [subquery]` with time-shifted timestamps. The `current_` prefix regex must use `(?<![=!<>])=(?!=)` to avoid corrupting `==`/`>=`/`<=`/`!=` inside expressions.

## Build & Test Commands

```bash
# Library/CLI (run from nrql-translator/)
cd nrql-translator
npm run build          # Compile TS → dist/
npm run build:cli      # Compile CLI → dist-cli/
npm run build:all      # Both
npm test               # Jest (133+ tests)
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run typecheck      # tsc --noEmit
npm run cli            # Build + run CLI

# Dynatrace App (run from nrql-translator-app/nrql-translator/)
cd nrql-translator-app/nrql-translator
npm run start          # dt-app dev (hot reload)
npm run build          # dt-app build
npm run deploy         # dt-app deploy to tenant
```

### Running a Single Test

```bash
cd nrql-translator
npx jest --testNamePattern="filter.*arithmetic"   # by test name pattern
npx jest --verbose                                 # see all test names
```

### Test Structure

- Tests: `nrql-translator/test/unit/translator.test.ts`
- Fixtures: `nrql-translator/test/fixtures/queries.json` (arrays of `{name, nrql, expectedDqlContains}`)
- Tests use pattern-based assertions (`expect(result.dql).toContain(...)`) rather than exact string matching

## Version Management

**MANDATORY** — increment on EVERY change, in all 4 locations:

1. `nrql-translator/package.json` → `"version"`
2. `nrql-translator-app/nrql-translator/app.config.json` → `"version"`
3. `nrql-translator-app/nrql-translator/ui/app/pages/Translator.tsx` → `APP_VERSION` constant
4. `.claude/CLAUDE.md` → version below
5. `CHANGELOG.md` → new entry (Keep a Changelog format)

Current version: **1.0.34**

## Workflow

1. Create feature branch: `feature/X.Y.Z-description`
2. Make changes (sync translator to both projects if modified)
3. Run tests: `cd nrql-translator && npm test`
4. Update version in all 4 locations + CHANGELOG.md
5. Commit with descriptive message
6. Merge to main with `--no-ff`

## Common Tasks

### Add New Function Mapping

Edit `NRQLToDQLTranslator.ts` — add to `FUNCTION_MAP`:
```typescript
'newfunction': { dql: 'dqlequivalent', notes: 'optional notes' },
```

### Add New Event Type Mapping

Edit `NRQLToDQLTranslator.ts` — add to `EVENT_TYPE_MAP`:
```typescript
'neweventtype': {
  eventType: 'NewEventType',
  dqlFetch: 'fetch logs',
  filter: 'optional filter',
  notes: 'description',
},
```

### Dynatrace App: Strato Imports

Always import from category subpaths, never package root:
```typescript
// Correct
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading } from "@dynatrace/strato-components/typography";

// Wrong — will cause bundle issues
import { Flex, Heading } from "@dynatrace/strato-components";
```

## Key DQL Syntax Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Arrays | `{"a", "b"}` | `('a', 'b')` |
| Equality | `field == "value"` | `field = 'value'` |
| IN operator | `in(field, array("a", "b"))` | `field IN ('a', 'b')` |
| Named params | `round(val, decimals: 2)` | `round(val, 2)` |
