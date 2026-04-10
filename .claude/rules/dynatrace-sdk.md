# Dynatrace SDK Integration Guide

## Dynatrace App Resources

| Resource | URL |
|----------|-----|
| SDK Overview | https://developer.dynatrace.com/develop/sdks/ |
| React SDK | https://developer.dynatrace.com/develop/sdks/client-react/ |
| Document API | https://developer.dynatrace.com/develop/sdks/client-document/ |

## App Configuration

The Dynatrace app is configured in `nrql-translator-app/nrql-translator/app.config.json`. Version must match the `APP_VERSION` constant in `Translator.tsx`.

## SDK Patterns Used

### Document API (Notebooks)

The "Open in Notebook" feature creates a DT notebook with the translated DQL:

```typescript
import { documentsClient } from "@dynatrace-sdk/client-document";

// Create notebook with translated query
const notebook = await documentsClient.createDocument({
  name: "NRQL Translation",
  content: notebookJson,
  documentType: "notebook",
});
```

## Authentication

Dynatrace SDKs automatically use the environment's authentication context. No manual token management needed inside the app.

## dt-app Bundler Notes

- The dt-app bundler (Vite-based) may not resolve npm packages the same way as Node.js
- If direct engine import fails in the app, re-export from the library package instead
- The app imports from `@bhdynatrace/nrql-translator` (the library), which re-exports the engine
- Always test with `npm run start` (dt-app dev server) after changing imports

## Required Scopes

The app requires these scopes (defined in `app.config.json`):
- `storage:logs:read` — for DQL query execution
- `document:documents:write` — for notebook creation
- `document:documents:read` — for notebook listing

## Common Issues

| Issue | Solution |
|-------|----------|
| Strato component not rendering | Check import path (use subpath, not root) |
| SDK method not found | Verify SDK version in package.json; check docs for API changes |
| CORS error in dev | Use `npm run start` (dt-app proxy), not raw Vite |
