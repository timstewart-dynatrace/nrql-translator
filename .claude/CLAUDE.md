# NRQL Translator - Claude Instructions

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Project Overview

NRQL to DQL Translator - Converts New Relic Query Language queries to Dynatrace Query Language for migration purposes.

## Architecture

### Components

1. **Core Translation Engine** (`nrql-translator/src/core/`)
   - `NRQLToDQLTranslator.ts` - Main translator class
   - `types.ts` - TypeScript type definitions

2. **CLI** (`nrql-translator/src/cli/`)
   - Excel file processing for batch translations
   - Command-line interface using Commander.js

3. **Dynatrace App** (`nrql-translator-app/nrql-translator/`)
   - React-based web UI
   - Uses Dynatrace Strato components
   - Deployed to Dynatrace tenant

### Translation Flow

1. Parse NRQL query into components (SELECT, FROM, WHERE, FACET, etc.)
2. Map NRQL functions to DQL equivalents
3. Map event types to DQL data sources
4. Convert operators and field names
5. Generate DQL output with notes and warnings

## Development

### Build Commands

```bash
# CLI Library
cd nrql-translator
npm run build        # Build library
npm run build:cli    # Build CLI
npm run build:all    # Build both
npm test            # Run tests

# Dynatrace App
cd nrql-translator-app/nrql-translator
npm run start       # Development server
npm run deploy      # Deploy to tenant
```

### Version Management

**MANDATORY**: Increment version on EVERY change:

1. Update `nrql-translator/package.json`
2. Update `nrql-translator-app/nrql-translator/app.config.json`
3. Update `APP_VERSION` constant in `Translator.tsx`
4. Update `CHANGELOG.md`

Current version: **1.0.30**

### Testing

- Run `npm test` before committing
- All tests must pass
- Add tests for new functionality

## Code Style

- TypeScript with strict mode
- ESLint for linting
- Prettier for formatting
- Use functional patterns where appropriate

## Key Files

| File | Purpose |
|------|---------|
| `nrql-translator/src/core/NRQLToDQLTranslator.ts` | Main translation logic |
| `nrql-translator/src/core/types.ts` | Type definitions |
| `nrql-translator-app/.../Translator.tsx` | UI component (contains APP_VERSION) |
| `nrql-translator/package.json` | CLI library version |
| `app.config.json` | Dynatrace app version |

## Common Tasks

### Add New Function Mapping

Edit `NRQLToDQLTranslator.ts`:
```typescript
private static readonly FUNCTION_MAP: Record<string, { dql: string; notes?: string }> = {
  // Add new mapping here
  'newfunction': { dql: 'dqlequivalent', notes: 'optional notes' },
};
```

### Add New Event Type Mapping

Edit `NRQLToDQLTranslator.ts`:
```typescript
private static readonly EVENT_TYPE_MAP: Record<string, EventTypeMapping> = {
  // Add new mapping here
  'neweventtype': {
    eventType: 'NewEventType',
    dqlFetch: 'fetch logs',
    filter: 'optional filter',
    notes: 'description',
  },
};
```

## Key DQL Syntax Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Arrays | `{"a", "b"}` | `('a', 'b')` |
| Equality | `field == "value"` | `field = 'value'` |
| IN operator | `in(field, array("a", "b"))` | `field IN ('a', 'b')` |
| Named params | `round(val, decimals: 2)` | `round(val, 2)` |

## Workflow

1. Create feature branch with version: `feature/X.Y.Z-description`
2. Make changes
3. Run tests: `npm test`
4. Update version in all three locations (package.json, app.config.json, Translator.tsx)
5. Update CHANGELOG.md
6. Commit with descriptive message
7. Merge to main with `--no-ff`
