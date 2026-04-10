# Phase 04 — Version Bump and Release
Status: PENDING

## Goal
Release nrql-translator v1.1.0 with engine integration, new test coverage, and CLI/app feature parity. Publish to GitHub Packages and deploy Dynatrace app.

## Tasks

### Version management
- [ ] Bump version to 1.1.0 in all 4 locations:
  1. `nrql-translator/package.json` → `"version": "1.1.0"`
  2. `nrql-translator-app/nrql-translator/app.config.json` → `"version": "1.1.0"`
  3. `nrql-translator-app/nrql-translator/ui/app/pages/Translator.tsx` → `APP_VERSION = "1.1.0"`
  4. `.claude/CLAUDE.md` → Version line
- [ ] Also update `.claude/settings.json` version
- [ ] Update CHANGELOG.md: move [Unreleased] content to [1.1.0] section with date

### Final checks
- [ ] `npm test` passes in nrql-translator/ (133+ tests)
- [ ] `npm run build` succeeds in nrql-translator/
- [ ] `npm run build:cli` succeeds in nrql-translator/
- [ ] `npm run build` succeeds in nrql-translator-app/nrql-translator/
- [ ] `npm run lint` clean in nrql-translator/
- [ ] `npm run typecheck` clean in nrql-translator/
- [ ] No hardcoded credentials or secrets

### Documentation
- [ ] Update README.md to reflect engine-powered translation
  - Note "Powered by nrql-engine with 292 AST-compiled patterns"
  - Remove any documentation about regex-based limitations
  - Update feature list with new CLI flags (--validate, --fix)
  - Update test count if it changed in Phase 02
- [ ] Verify CHANGELOG.md is complete for all phases

### Publish
- [ ] Tag release: `git tag -a v1.1.0 -m "Release v1.1.0: AST engine integration"`
- [ ] Push tag: `git push origin v1.1.0`
- [ ] `npm publish` nrql-translator library to GitHub Packages
- [ ] Deploy Dynatrace app: `cd nrql-translator-app/nrql-translator && npm run build && npm run deploy`

### Post-deployment verification
- [ ] Smoke test: translate 5-10 real production NRQL queries via CLI
- [ ] Verify app loads in Dynatrace tenant
- [ ] Check translate button works, confidence/notes display correctly
- [ ] Verify version shows 1.1.0 in app UI
- [ ] Check for console errors in browser DevTools

## Acceptance Criteria
- v1.1.0 published to GitHub Packages
- Dynatrace app deployed and verified
- README reflects new architecture and capabilities
- CHANGELOG complete with all Phase 01-04 changes
- Git tag v1.1.0 exists
- All phase files renamed to done

## Decisions Made This Phase
(append as you go)
