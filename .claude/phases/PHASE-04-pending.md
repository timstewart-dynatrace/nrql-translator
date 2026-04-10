# Phase 04 — Version Bump and Release
Status: PENDING

## Goal
Release the updated nrql-translator with engine integration. Publish to GitHub Packages.

## Tasks

### Version management
- [ ] Decide version: this is a MINOR bump (new engine, same public API) → 1.1.0
- [ ] Update version in all 4 locations:
  1. `nrql-translator/package.json`
  2. `nrql-translator-app/nrql-translator/app.config.json`
  3. `nrql-translator-app/nrql-translator/ui/app/pages/Translator.tsx` (APP_VERSION)
  4. `.claude/CLAUDE.md` (Current version)
- [ ] Update CHANGELOG.md with all changes

### Final checks
- [ ] `npm test` passes in nrql-translator/
- [ ] `npm run build` succeeds in nrql-translator/
- [ ] `npm run build` succeeds in nrql-translator-app/nrql-translator/
- [ ] `dt-app deploy` succeeds (or dry-run)
- [ ] Manual smoke test: translate 5-10 real production NRQL queries

### Publish
- [ ] `npm publish` nrql-translator library to GitHub Packages
- [ ] Deploy Dynatrace app to tenant
- [ ] Tag release in git

### Documentation
- [ ] Update README.md to reflect engine-powered translation
- [ ] Note: "Powered by nrql-engine with 292 AST-compiled patterns"
- [ ] Remove any documentation about regex-based limitations

## Acceptance Criteria
- Published to GitHub Packages
- Dynatrace app deployed
- README reflects new architecture
- CHANGELOG complete

## Decisions Made This Phase
(append as you go)
