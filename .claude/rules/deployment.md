# Deployment & Release Checklist

## Pre-Deployment

- [ ] All tests passing (`cd nrql-translator && npm test`)
- [ ] Build succeeds (`npm run build` and `npm run build:cli`)
- [ ] App builds (`cd nrql-translator-app/nrql-translator && npm run build`)
- [ ] Documentation complete (README, CHANGELOG)
- [ ] Version incremented in all 4 locations
- [ ] No uncommitted changes
- [ ] No hardcoded credentials or secrets

## Deployment Steps

### Library (npm publish)

1. **Tag Release**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: description"
   git push origin vX.Y.Z
   ```

2. **Build & Publish**
   ```bash
   cd nrql-translator
   npm run build
   npm publish
   ```

### Dynatrace App

1. **Build & Deploy**
   ```bash
   cd nrql-translator-app/nrql-translator
   npm run build
   npm run deploy
   ```

2. **Verify**
   - [ ] App loads in Dynatrace tenant
   - [ ] Translate button works
   - [ ] Confidence/notes display correctly
   - [ ] Version shown matches expected

## Post-Deployment

- [ ] Smoke test: translate 5-10 real NRQL queries
- [ ] Check for console errors in browser DevTools
- [ ] Verify version displays correctly in app UI
- [ ] Create follow-up issues if needed

## Rollback

### Library
```bash
npm unpublish @bhdynatrace/nrql-translator@X.Y.Z  # if within 72h
# Or publish a patched version
```

### Dynatrace App
Deploy the previous version from git:
```bash
git checkout vPREVIOUS
cd nrql-translator-app/nrql-translator
npm run build && npm run deploy
```
