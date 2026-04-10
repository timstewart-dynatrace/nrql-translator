# NRQL to DQL Translator - Dynatrace App

A Dynatrace App for translating New Relic Query Language (NRQL) queries to Dynatrace Query Language (DQL).

## Prerequisites

1. **Dynatrace App Toolkit** - Install globally:
   ```bash
   npm install -g @dynatrace/dt-app
   ```

2. **Dynatrace Tenant** - You need access to a Dynatrace environment with app deployment permissions.

3. **OAuth Client** - Create an OAuth client in your Dynatrace tenant:
   - Go to **Account Management** > **Identity & access management** > **OAuth clients**
   - Create a new client with the required scopes for app deployment

## Setup

1. **Install dependencies:**
   ```bash
   cd nrql-translator-app
   npm install
   ```

2. **Configure environment:**

   Update `app.config.json` with your Dynatrace environment URL:
   ```json
   {
     "environmentUrl": "https://YOUR_TENANT.apps.dynatrace.com"
   }
   ```

3. **Login to Dynatrace:**
   ```bash
   dt-app login
   ```
   Follow the prompts to authenticate with your Dynatrace tenant.

## Development

Run the app locally for development:
```bash
npm start
# or
dt-app dev
```

This starts a local development server with hot reload.

## Build

Build the app for production:
```bash
npm run build
# or
dt-app build
```

## Deploy to Tenant

Deploy the app to your Dynatrace tenant:
```bash
npm run deploy
# or
dt-app deploy
```

After deployment, the app will be available in your Dynatrace environment under **Apps**.

## Features

- **NRQL Query Input** - Enter any NRQL query
- **DQL Translation** - Automatic conversion to Dynatrace DQL
- **Confidence Score** - Shows translation confidence (High/Medium/Low)
- **Warnings** - Displays any translation warnings or limitations
- **Notes** - Provides data source mapping and key differences

## Supported NRQL Features

### Clauses
- SELECT (with aggregations and field selections)
- FROM (event types)
- WHERE (filtering conditions)
- FACET (grouping)
- TIMESERIES (time-based aggregation)
- LIMIT
- ORDER BY

### Translation Engine

This app uses the shared `@timstewart-dynatrace/nrql-engine` package (AST-based compiler with 292 patterns). The app is a thin adapter that maps engine results to the UI.

### Aggregation Functions
| NRQL | DQL |
|------|-----|
| count(*) | count() |
| average(field) | avg(field) |
| sum(field) | sum(field) |
| min(field) | min(field) |
| max(field) | max(field) |
| uniqueCount(field) | countDistinctExact(field) |
| percentile(field, n) | percentile(field, n) |
| latest(field) | takeLast(field) |
| earliest(field) | takeFirst(field) |
| uniques(field) | collectDistinct(field) |
| median(field) | percentile(field, 50) |
| filter(count(*), WHERE c) | countIf(c) |
| filter(avg(f), WHERE c) | avg(if(c, f)) |
| rate(count(*), 1 min) | count() |
| percentage(count(*), WHERE c) | 100.0 * countIf(c) / count() |

### Event Type Mapping
| New Relic | Dynatrace |
|-----------|-----------|
| Transaction | fetch spans |
| Log / LogEvent | fetch logs |
| Span | fetch spans |
| PageView / PageAction | fetch bizevents |
| Metric | timeseries command |
| SyntheticCheck | fetch bizevents |
| SystemSample / ProcessSample | fetch dt.metrics |
| K8sPodSample / K8sContainerSample | fetch dt.metrics |

## Troubleshooting

### "dt-app: command not found"
Install the Dynatrace App Toolkit:
```bash
npm install -g @dynatrace/dt-app
```

### "Not authorized" during deploy
1. Run `dt-app login` and re-authenticate
2. Verify your OAuth client has the required scopes
3. Check that app deployment is enabled for your tenant

### Build errors
1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript errors: `npm run typecheck`
3. Clear build cache: `rm -rf dist && npm run build`
