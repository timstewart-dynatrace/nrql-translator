# Debugging & Troubleshooting

## Debug Strategies

### 1. Reproduce the Issue
- Get the exact NRQL query that fails
- Run it through the translator: `npx jest --testNamePattern="pattern"`
- Check if issue is in the engine or the adapter

### 2. Gather Evidence
```bash
# Run tests with verbose output
npx jest --verbose

# Check engine output directly
node -e "const { NRQLCompiler } = require('@timstewart-dynatrace/nrql-engine'); console.log(new NRQLCompiler().compile('YOUR NRQL HERE'))"

# Check adapter output
node -e "const { NRQLToDQLTranslator } = require('./dist'); console.log(new NRQLToDQLTranslator().translate('YOUR NRQL HERE'))"
```

### 3. Narrow Down Scope
- Is the bug in the engine (wrong DQL)? → Fix in nrql-engine repo
- Is the bug in the adapter (wrong mapping)? → Fix in src/core/NRQLToDQLTranslator.ts
- Is the bug in the UI (wrong display)? → Fix in Translator.tsx

### 4. Two-Attempt Rule
If the same problem isn't resolved after 2 attempts, stop and:
1. Read the full error output
2. State the problem precisely
3. State your assumptions
4. Re-read the relevant code
5. Form a hypothesis before attempt 3

## Common Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Engine not found | `npm ls @timstewart-dynatrace/nrql-engine` | `npm install` in the right directory |
| Different output after engine update | Compare old vs new DQL | Decide which is correct; update test or file engine bug |
| App import fails | dt-app bundler can't resolve | Import from library re-export instead of direct engine import |
| `dist/` out of date | Runtime uses compiled JS | `npm run build` before `node -e` testing |
| Confidence mismatch | Engine uses 'HIGH', app uses 'low' | Check adapter case conversion logic |
