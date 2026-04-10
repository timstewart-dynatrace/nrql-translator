# Architecture

## Project Structure

```
nrql-translator/
├── src/
│   ├── core/
│   │   ├── NRQLToDQLTranslator.ts   # Thin adapter (~100 lines) wrapping engine
│   │   ├── types.ts                  # Public TranslationResult interface
│   │   └── index.ts                  # Exports
│   └── cli/
│       └── index.ts                  # Commander.js CLI (query, excel commands)
├── test/
│   ├── unit/translator.test.ts       # 151 integration tests
│   └── fixtures/queries.json         # Test fixtures
├── dist/                             # Compiled library output
├── dist-cli/                         # Compiled CLI output
├── .claude/                          # AI assistant instructions
│   ├── CLAUDE.md                     # Main entry point
│   ├── DECISIONS.md                  # Decision log
│   ├── architecture.md               # This file
│   ├── settings.json                 # Project metadata
│   ├── phases/                       # Phase tracking
│   └── rules/                        # Domain-specific rules
├── package.json
├── CHANGELOG.md
├── README.md
└── CLAUDE.md                         # Root pointer → .claude/CLAUDE.md
```

## Related Repos

| Repo | Purpose |
|------|---------|
| [nrql-engine](https://github.com/timstewart-dynatrace/nrql-engine) | AST compiler (292 patterns, 677 tests) |
| [nrql-translator-app](https://github.com/timstewart-dynatrace/nrql-translator-app) | Dynatrace App UI (separate repo) |

## Key Components

```
@timstewart-dynatrace/nrql-engine    (external package)
  ├── NRQLCompiler                    ← AST parser + DQL emitter (292 patterns)
  ├── DQLSyntaxValidator              ← Validates generated DQL
  └── DQLFixer                        ← Auto-corrects common DQL issues
         ↓
Adapter Layer (src/core/)
  └── NRQLToDQLTranslator            ← Maps CompileResult → TranslationResult
         ↓
CLI (src/cli/)                        ← Batch Excel translation, single query
```

## Data Flow

### Translation Pipeline

```
User Input (NRQL string)
  → NRQLToDQLTranslator.translate(nrql)
    → NRQLCompiler.compile(nrql)           [engine]
      → AST parsing → pattern matching → DQL emission
    ← CompileResult { dql, confidence, confidenceScore, notes, warnings, fixes }
  → Adapter maps to TranslationResult { dql, confidence, confidenceScore, notes, warnings, fixes }
← Output to CLI stdout
```

### CLI Flow

```
Excel file (NRQL column)
  → Commander.js parses args
  → Read Excel rows
  → For each row: translate(nrql) → collect results
  → Write output Excel with DQL column + metadata
```

## Technology Decisions

See `DECISIONS.md` for architectural choices including:
- Why AST engine over regex translator
- Why thin adapter pattern
- Why app split into separate repo
