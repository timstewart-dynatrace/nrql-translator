# Development Setup

## Prerequisites

- Node.js 18+ (verify with `node --version`)
- npm (included with Node.js)

## Initial Setup

```bash
npm install
```

## Development Workflow

### Common Tasks

| Task | Command |
|------|---------|
| Build library | `npm run build` |
| Build CLI | `npm run build:cli` |
| Run tests | `npm test` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |

### Running a Single Test

```bash
npx jest --testNamePattern="filter.*arithmetic"
npx jest --verbose
```

### Build Before Runtime Testing

TypeScript source is in `src/`, but `node -e` requires `dist/`. Always `npm run build` before running ad-hoc node scripts. Tests use `jest` with ts-jest and don't need a build.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@timstewart-dynatrace/nrql-engine` | AST-based NRQL→DQL compiler |
| `commander` | CLI framework |
| `exceljs` | Excel file I/O |
| `jest` / `ts-jest` | Testing |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module not found` after engine update | `npm install` to pull latest; check version in package.json |
| Tests pass but `node -e` fails | Run `npm run build` first — tests use ts-jest, runtime needs dist/ |
