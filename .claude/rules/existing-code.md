# Understanding Existing Code

## Before Making Changes

1. **Read the tests first**
   - `test/unit/translator.test.ts` shows all expected translation behaviors
   - `test/fixtures/queries.json` documents input→output pairs
   - Tests reveal edge cases and supported NRQL patterns

2. **Trace the translation flow**
   - User input → `NRQLToDQLTranslator.translate(nrql)`
   - Adapter calls `NRQLCompiler.compile(nrql)` from engine
   - Engine returns `CompileResult` → adapter maps to `TranslationResult`
   - Output to CLI or App UI

3. **Understand the boundary**
   - Translation logic belongs in `nrql-engine`, not here
   - This repo is adapters, CLI, and UI only
   - If a new NRQL pattern needs support, add it to nrql-engine

## Making Changes Safely

1. **Write a test first** that captures expected behavior
2. **Make the smallest change** that achieves the goal
3. **Run all tests** (`npm test`) to ensure nothing broke
4. **Document** in CHANGELOG and code comments

## Refactoring Rules

- Refactoring and feature work are **separate commits, separate branches**
- Never mix "cleanup" with feature changes
- If you see something that needs refactoring while working on a feature: note it, finish the feature, propose refactoring separately

## When Code is Confusing

- Check `git blame` for context on why code exists
- Check `.claude/DECISIONS.md` for architectural decisions
- Don't delete "mysterious" code without understanding why it exists
- Code that looks unused may be called dynamically or be a workaround
