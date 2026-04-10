# TypeScript Development Standards

**Extends:** Frontend standards

## TypeScript Configuration

- **Target:** ES2020 or higher
- **Strict Mode:** ENABLED (`strict: true`) — mandatory
- **Module:** ESNext

## Strictness & Type Safety [MUST]

- `strict: true` in `tsconfig.json` — non-negotiable
- **Never use `any`** — use `unknown` and narrow it
- **No non-null assertions (`!`)** when avoidable
- **Type assertions (`as`)** require inline comment explaining why

```typescript
// Explains why assertion needed
// Engine returns correct shape but adapter types don't match directly
const result = data as TranslationResult
```

## Naming Conventions

```typescript
// Components: PascalCase
function TranslatorPage(): JSX.Element {}

// Functions & variables: camelCase
const translationResult = translator.translate(nrql)

// Constants: UPPER_SNAKE_CASE
const APP_VERSION = "1.1.0"
const CONFIDENCE_HIGH_THRESHOLD = 80

// Types & Interfaces: PascalCase
interface TranslationResult {
  dql: string
  confidence: string
  notes: TranslationNotes
}
```

## Import Order

```typescript
// 1. React
import React from "react";

// 2. Type imports
import type { TranslationResult } from "../core/types";

// 3. Library imports
import { NRQLCompiler } from "@timstewart-dynatrace/nrql-engine";

// 4. Local imports
import { translateQuery } from "./utils";

// 5. Styles
import styles from "./Translator.module.css";
```

## Testing

Test **behavior**, not implementation:

```typescript
// Correct — tests translation output
expect(result.dql).toContain("summarize count()");

// Forbidden — tests internal implementation
expect(compiler.parseAST).toHaveBeenCalled();
```
