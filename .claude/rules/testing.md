# Testing Standards

## Test Structure

- **Tests:** `test/unit/translator.test.ts`
- **Fixtures:** `test/fixtures/queries.json` (arrays of `{name, nrql, expectedDqlContains}`)
- Tests use pattern-based assertions (`expect(result.dql).toContain(...)`) rather than exact string matching

## Test Categories

### Integration Tests (151)
- Test end-to-end translation: NRQL input → DQL output
- Run through the adapter layer (engine + adapter)
- Located in `test/unit/translator.test.ts`

### Engine Tests (677, in nrql-engine repo)
- Test AST parsing and DQL emission at the compiler level
- Run in the engine repo: `cd /Users/Shared/GitHub/nrql-engine && npm test`

## Running Tests

```bash
cd nrql-translator

# Run all tests
npm test

# Run specific test by name
npx jest --testNamePattern="filter.*arithmetic"

# Run with verbose output
npx jest --verbose

# Run with coverage
npx jest --coverage
```

## Test Requirements

### Before Merging
- [ ] All 151 integration tests pass
- [ ] No test warnings or errors
- [ ] New features have test coverage
- [ ] Bug fixes include a test that reproduces the bug

### Test Naming
Use descriptive names: `should translate FACET to summarize by`

### Fixture Format
```json
{
  "name": "descriptive test name",
  "nrql": "SELECT count(*) FROM Transaction",
  "expectedDqlContains": ["fetch logs", "summarize count()"]
}
```

## Testing Strategy After Engine Updates

1. Update engine dependency version
2. Run `npm test` — compare output
3. If assertion fails, determine whether old or new output is correct
4. Update fixture if engine output is better; file engine bug if not
