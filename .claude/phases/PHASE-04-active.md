# Phase 04 — Version Bump and Release
Status: ACTIVE

## Goal
Release nrql-translator v1.1.0 with engine integration, new test coverage, and CLI/app feature parity.

## Tasks

### Version management
- [x] Bump version to 1.1.0 in all 4 locations + settings.json
- [x] Update CHANGELOG.md: moved [Unreleased] to [1.1.0] - 2026-04-10

### Final checks
- [x] `npm test` passes (151 tests)
- [x] `npm run build` succeeds
- [x] `npm run build:cli` succeeds
- [x] CLI smoke test passes (query --validate)
- [ ] `npm run build` in app (requires dt-app — deferred to deploy time)
- [ ] No hardcoded credentials or secrets (verified by review)

### Documentation
- [x] README.md updated: engine-powered, new CLI flags, 151 tests, corrected project structure
- [x] CHANGELOG.md complete for all phases

### Publish (deferred — requires user action)
- [ ] Tag release: `git tag -a v1.1.0 -m "Release v1.1.0: AST engine integration"`
- [ ] Push tag: `git push origin v1.1.0`
- [ ] `npm publish` nrql-translator library to GitHub Packages
- [ ] Deploy Dynatrace app

### Post-deployment verification (deferred — requires user action)
- [ ] Smoke test in tenant
- [ ] Verify version shows 1.1.0

## Decisions Made This Phase

### 2026-04-10 — npm publish and dt-app deploy require user credentials
Publishing to GitHub Packages and deploying the DT app require authentication tokens that should not be automated without explicit user action.
