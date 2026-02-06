# Copilot Instructions (nrql-translator)

## Big picture
- This repo contains **two sibling projects**:
  - **Library/CLI** in [nrql-translator/](nrql-translator/): TypeScript library + CLI for batch translation (Excel in/out).
  - **Dynatrace App** in [nrql-translator-app/nrql-translator/](nrql-translator-app/nrql-translator/): React UI using Dynatrace App Toolkit and Strato components.
- The core translation engine is duplicated in both projects:
  - Library: [nrql-translator/src/core/NRQLToDQLTranslator.ts](nrql-translator/src/core/NRQLToDQLTranslator.ts)
  - App: [nrql-translator-app/nrql-translator/src/app/utils/NRQLToDQLTranslator.ts](nrql-translator-app/nrql-translator/src/app/utils/NRQLToDQLTranslator.ts)
  Keep logic changes in sync across both copies.

## Data flow & key modules
- **Translator engine**: `NRQLToDQLTranslator.translate()` parses NRQL, generates DQL, computes confidence, and emits warnings/notes. See types in [nrql-translator/src/core/types.ts](nrql-translator/src/core/types.ts) and [nrql-translator-app/nrql-translator/src/app/utils/types.ts](nrql-translator-app/nrql-translator/src/app/utils/types.ts).
- **CLI batch translation**: [nrql-translator/src/cli/commands/translate.ts](nrql-translator/src/cli/commands/translate.ts) loads Excel via `ExcelProcessor`, runs `TranslationRunner`, writes results/status colors, and saves output.
- **UI**: The Dynatrace app page [nrql-translator-app/nrql-translator/src/app/pages/TranslatorPage.tsx](nrql-translator-app/nrql-translator/src/app/pages/TranslatorPage.tsx) invokes the translator directly (no backend calls) and renders notes/warnings.

## Workflows
- **Library/CLI** (from [nrql-translator/](nrql-translator/)):
  - Build: `npm run build` (TS compile)
  - CLI: `npm run cli` (builds CLI then runs)
  - Tests: `npm test` (Jest; fixtures in [nrql-translator/test/fixtures/queries.json](nrql-translator/test/fixtures/queries.json))
- **Dynatrace App** (from [nrql-translator-app/nrql-translator/](nrql-translator-app/nrql-translator/)):
  - Dev server: `npm start` (dt-app dev)
  - Build: `npm run build` (dt-app build)
  - Deploy: `npm run deploy` (dt-app deploy)
  - App config/scopes in [nrql-translator-app/nrql-translator/app.config.json](nrql-translator-app/nrql-translator/app.config.json)

## Project-specific conventions
- **Strato imports**: Follow the rule in [nrql-translator-app/nrql-translator/AGENTS.md](nrql-translator-app/nrql-translator/AGENTS.md): import Strato components from category subpaths, not package roots (e.g., `@dynatrace/strato-components/layouts`).
- **Translator behavior**: Function mappings and unsupported feature warnings live in `NRQLToDQLTranslator` (`FUNCTION_MAP`, `UNSUPPORTED_FUNCTIONS`, `EVENT_TYPE_MAP`). Prefer updating those tables before adding new parser logic.
- **Excel CLI outputs**: Status values and color mapping are centralized in [nrql-translator/src/cli/constants.ts](nrql-translator/src/cli/constants.ts); reuse them rather than hardcoding.

## External integrations
- Dynatrace App Toolkit (`dt-app`) drives build/dev/deploy in the app.
- Strato Design System and Dynatrace SDKs are the primary UI dependencies (see app `package.json`).
- CLI uses `exceljs` for workbook IO and `commander` for CLI parsing (see library `package.json`).

## Git workflow
- **Prefer GitKraken MCP tools** for all git tasks (branching, committing, pushing, status checks, worktrees, etc.). These tools provide better integration and error handling compared to terminal git commands.