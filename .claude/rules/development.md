# Development Setup

## Prerequisites

- Node.js 18+ (verify with `node --version`)
- npm (included with Node.js)

## Initial Setup

```bash
# Library/CLI
cd nrql-translator
npm install

# Dynatrace App
cd nrql-translator-app/nrql-translator
npm install
```

## Development Workflow

### Common Tasks

| Task | Command | Location |
|------|---------|----------|
| Build library | `npm run build` | `nrql-translator/` |
| Build CLI | `npm run build:cli` | `nrql-translator/` |
| Run tests | `npm test` | `nrql-translator/` |
| Lint | `npm run lint` | `nrql-translator/` |
| Type check | `npm run typecheck` | `nrql-translator/` |
| Dev server (app) | `npm run start` | `nrql-translator-app/nrql-translator/` |
| Deploy app | `npm run deploy` | `nrql-translator-app/nrql-translator/` |

### Running a Single Test

```bash
cd nrql-translator
npx jest --testNamePattern="filter.*arithmetic"
npx jest --verbose
```

### Build Before Runtime Testing

TypeScript source is in `src/`, but `node -e` requires `dist/`. Always `npm run build` before running ad-hoc node scripts. Tests use `jest` with ts-jest and don't need a build.

## Dependencies

### Library (`nrql-translator/`)
| Package | Purpose |
|---------|---------|
| `@timstewart-dynatrace/nrql-engine` | AST-based NRQL→DQL compiler |
| `commander` | CLI framework |
| `exceljs` | Excel file I/O |
| `jest` / `ts-jest` | Testing |

### App (`nrql-translator-app/nrql-translator/`)
| Package | Purpose |
|---------|---------|
| `@dynatrace/strato-components*` | Strato Design System UI |
| `@dynatrace-sdk/*` | Dynatrace platform SDKs |
| `react` / `react-dom` | UI framework |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module not found` after engine update | `npm install` to pull latest; check version in package.json |
| Tests pass but `node -e` fails | Run `npm run build` first — tests use ts-jest, runtime needs dist/ |
| dt-app bundler fails on engine import | Re-export from the library package instead of direct engine import |
| App has only `ui/app/` | `src/app/` was a legacy duplicate deleted in v1.0.35. dt-app uses `ui/` |
