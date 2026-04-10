# Architecture

## Project Structure

```
nrql-translator/
├── nrql-translator/                  # TypeScript library + CLI
│   ├── src/
│   │   ├── core/
│   │   │   ├── NRQLToDQLTranslator.ts   # Thin adapter (~100 lines) wrapping engine
│   │   │   ├── types.ts                  # Public TranslationResult interface
│   │   │   └── index.ts                  # Exports
│   │   └── cli/
│   │       └── index.ts                  # Commander.js CLI (query, excel commands)
│   ├── test/
│   │   ├── unit/translator.test.ts       # 133+ integration tests
│   │   └── fixtures/queries.json         # Test fixtures
│   ├── dist/                             # Compiled library output
│   ├── dist-cli/                         # Compiled CLI output
│   └── package.json
│
├── nrql-translator-app/              # Dynatrace App (React UI)
│   └── nrql-translator/
│       ├── ui/app/
│       │   ├── pages/Translator.tsx      # Main page component
│       │   └── utils/
│       │       └── NRQLToDQLTranslator.ts  # Thin adapter (imports engine)
│       ├── app.config.json               # DT app config (version here)
│       └── package.json
│
├── .claude/                          # AI assistant instructions
│   ├── CLAUDE.md                     # Main entry point
│   ├── DECISIONS.md                  # Decision log
│   ├── architecture.md               # This file
│   ├── settings.json                 # Project metadata
│   ├── phases/                       # Phase tracking
│   └── rules/                        # Domain-specific rules
│
├── CHANGELOG.md
├── README.md
└── CLAUDE.md                         # Root pointer → .claude/CLAUDE.md
```

## Key Components

```
@timstewart-dynatrace/nrql-engine    (external package)
  ├── NRQLCompiler                    ← AST parser + DQL emitter (292 patterns)
  ├── DQLSyntaxValidator              ← Validates generated DQL
  └── DQLFixer                        ← Auto-corrects common DQL issues
         ↓
Adapter Layer (nrql-translator/src/core/)
  └── NRQLToDQLTranslator            ← Maps CompileResult → TranslationResult
         ↓
Consumers
  ├── CLI (nrql-translator/src/cli/) ← Batch Excel translation, single query
  └── App (nrql-translator-app/)     ← React UI with Strato Design System
```

## Data Flow

### Translation Pipeline

```
User Input (NRQL string)
  → NRQLToDQLTranslator.translate(nrql)
    → NRQLCompiler.compile(nrql)           [engine]
      → AST parsing → pattern matching → DQL emission
    ← CompileResult { dql, confidence, confidenceScore, notes, warnings, fixes }
  → Adapter maps to TranslationResult { dql, confidence, notes, warnings }
← Output to CLI stdout / App UI
```

### CLI Flow

```
Excel file (NRQL column)
  → Commander.js parses args
  → Read Excel rows
  → For each row: translate(nrql) → collect results
  → Write output Excel with DQL column + metadata
```

### App Flow

```
User types NRQL in textarea
  → Click "Translate"
  → NRQLToDQLTranslator.translate(nrql)
  → Display: DQL output, confidence badge, translation notes
  → Optional: "Open in Notebook" generates DT notebook JSON
```

## Technology Decisions

See `DECISIONS.md` for architectural choices including:
- Why AST engine over regex translator
- Why thin adapter pattern
