# Deployment & Release Checklist

## Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds (`npm run build` and `npm run build:cli`)
- [ ] Documentation complete (README, CHANGELOG)
- [ ] Version incremented in package.json and .claude/CLAUDE.md
- [ ] No uncommitted changes
- [ ] No hardcoded credentials or secrets

## Deployment Steps

1. **Tag Release**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: description"
   git push origin vX.Y.Z
   ```

2. **Build & Publish**
   ```bash
   npm run build
   npm publish
   ```

## Post-Deployment

- [ ] Smoke test: translate 5-10 real NRQL queries via CLI
- [ ] Create follow-up issues if needed

## Rollback

```bash
npm unpublish @bhdynatrace/nrql-translator@X.Y.Z  # if within 72h
# Or publish a patched version
```
