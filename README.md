# NRQL to DQL Translator

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

Translate New Relic Query Language (NRQL) queries to Dynatrace Query Language (DQL) for migration.

## Overview

This project provides a TypeScript library and CLI for translating NRQL queries to DQL.

For the **Dynatrace App** (interactive web UI), see [nrql-translator-app](https://github.com/timstewart-dynatrace/nrql-translator-app).

## Features

- Translates NRQL SELECT, WHERE, FACET, TIMESERIES, LIMIT, ORDER BY, and COMPARE WITH clauses
- Maps NRQL aggregation functions to DQL equivalents (count, average, sum, min, max, etc.)
- Converts New Relic event types to appropriate Dynatrace data sources
- Supports complex functions: `filter()`, `rate()`, `percentage()`, `cdfPercentage()`, `CASES()`
- Handles arithmetic expressions between aggregation functions
- Provides confidence levels (high/medium/low) with numeric scores (0-100) and warnings
- Includes notes on data source mapping, key differences, performance, and testing
- CLI flags for DQL validation (`--validate`) and auto-fix (`--fix`)
- Supports both `SELECT ... FROM` and `FROM ... SELECT` syntax
- Powered by `@timstewart-dynatrace/nrql-engine` — 292 AST-compiled patterns, 677 engine tests

## Supported Translations

### Clause Mapping

| NRQL | DQL |
|------|-----|
| `SELECT func(attr)` | `summarize alias = func(attr)` |
| `FROM EventType` | `fetch logs/spans/metrics` |
| `WHERE condition` | `filter condition` |
| `FACET attr` | `, by:{attr}` in summarize |
| `TIMESERIES interval` | `makeTimeseries interval:Xm` |
| `LIMIT n` | `limit n` |
| `LIMIT MAX` | *(omitted - DQL has no explicit "no limit")* |
| `ORDER BY attr` | `sort attr asc/desc` |
| `COMPARE WITH N ago` | `append [subquery]` with time-shifted timestamps |
| `SLIDE BY interval` | `makeTimeseries + rolling()` |

### Function Mapping

| NRQL | DQL | Notes |
|------|-----|-------|
| `count(*)` | `count()` | |
| `average(attr)` | `avg(attr)` | |
| `sum(attr)` | `sum(attr)` | |
| `min(attr)` / `max(attr)` | `min(attr)` / `max(attr)` | |
| `uniqueCount(attr)` | `countDistinctExact(attr)` | Exact cardinality |
| `percentile(attr, N)` | `percentile(attr, N)` | |
| `latest(attr)` | `takeLast(attr)` | By ingest order |
| `earliest(attr)` | `takeFirst(attr)` | By ingest order |
| `uniques(attr)` | `collectDistinct(attr)` | |
| `median(attr)` | `percentile(attr, 50)` | |
| `stddev(attr)` | `stddev(attr)` | Natively supported |
| `rate(count(*), 1 min)` | `count()` | Decomposed; rate = count per interval |
| `percentage(count(*), WHERE c)` | `100.0 * countIf(c) / count()` | Decomposed |
| `cdfPercentage(f, t1, t2)` | Multiple `countIf(f <= tN) / count()` | Expanded per threshold |
| `filter(count(*), WHERE c)` | `countIf(c)` | Decomposed |
| `filter(avg(f), WHERE c)` | `avg(if(c, f))` | Conditional aggregation |

### FACET Features

| NRQL | DQL | Notes |
|------|-----|-------|
| `FACET attr` | `by:{attr}` | Standard grouping |
| `FACET CASES(WHERE c AS l)` | `fieldsAdd + if()` | Converted to nested if() |
| `FACET hourOf(timestamp)` | `fieldsAdd hour = getHour(timestamp)` | Time grouping |
| `FACET dateOf(timestamp)` | `fieldsAdd date = formatTimestamp(...)` | Date grouping |
| `FACET weekOf(timestamp)` | `fieldsAdd week = getWeekOfYear(...)` | Week grouping |

### Event Type Mapping

| NRQL Event | DQL Source | Notes |
|------------|------------|-------|
| `Transaction` | `fetch spans` | APM transaction data |
| `TransactionError` | `fetch spans` | Spans with error filter |
| `Span` | `fetch spans` | Distributed tracing |
| `Log` / `LogEvent` | `fetch logs` | Log data |
| `Metric` | `timeseries` command | Uses timeseries, not fetch |
| `PageView` / `PageAction` | `fetch bizevents` | Browser/RUM data |
| `BrowserInteraction` | `fetch spans` | Browser spans |
| `SyntheticCheck` / `SyntheticRequest` | `fetch bizevents` | Synthetic monitoring |
| `SystemSample` / `ProcessSample` | `fetch dt.metrics` | Infrastructure metrics |
| `NetworkSample` | `fetch dt.metrics` | Infrastructure metrics |
| `K8sPodSample` / `K8sContainerSample` | `fetch dt.metrics` | Kubernetes metrics |
| `InfrastructureEvent` | `fetch events` | Infrastructure events |
| `AjaxRequest` | `fetch bizevents` | Browser AJAX requests |
| `NrAiIncident` | `fetch bizevents` | Alert/incident data |

### Kubernetes Field Mapping

| NRQL Field | DQL Field |
|------------|-----------|
| `k8s.clusterName` | `k8s.cluster.name` |
| `k8s.containerName` | `k8s.container.name` |
| `k8s.podName` | `k8s.pod.name` |
| `k8s.namespaceName` | `k8s.namespace.name` |
| `k8s.nodeName` | `k8s.node.name` |
| `k8s.deploymentName` | `k8s.deployment.name` |

### Operator Mapping

| NRQL | DQL |
|------|-----|
| `=` | `==` |
| `LIKE '%text%'` | `matchesPhrase(field, "text")` |
| `LIKE 'text%'` | `startsWith(field, "text")` |
| `NOT LIKE '%text%'` | `not(matchesPhrase(field, "text"))` |
| `IN ('a', 'b')` | `in(field, array("a", "b"))` |
| `IS NULL` | `isNull(field)` |
| `IS NOT NULL` | `isNotNull(field)` |
| `IS TRUE` | `field == true` |
| `ago(7 days)` | `now() - 7d` |

## Translation Examples

**Simple aggregation:**
```
NRQL: SELECT count(*), average(duration) FROM Transaction WHERE appName = 'MyApp' FACET host
DQL:  fetch spans
      | filter service.name == "MyApp"
      | summarize count = count(), average_duration = avg(duration), by:{host.name}
```

**COMPARE WITH (time comparison):**
```
NRQL: SELECT count(*) FROM Transaction COMPARE WITH 1 week ago SINCE 1 day ago
DQL:  fetch spans, from:-1d
      | summarize current_count = count()
      | append [
        fetch spans, from:-192h, to:-168h
        | fieldsAdd timestamp = timestamp + 168h
        | summarize previous_count = count()
      ]
```

**filter() decomposition:**
```
NRQL: SELECT filter(count(*), WHERE error IS TRUE) AS errors FROM Transaction
DQL:  fetch spans
      | summarize errors = countIf(error == true)
```

## Confidence Levels

| Level | Score | Meaning |
|-------|-------|---------|
| **High** | >= 80 | Translation is reliable; minimal manual review needed |
| **Medium** | 50-79 | Translation needs review; some features may require adjustment |
| **Low** | < 50 | Translation requires significant manual work |

## Quick Start

See [docs/QUICK_START.md](docs/QUICK_START.md) for detailed usage instructions.

### CLI

```bash
npm install
npm run build:all

# Translate a single query
npm run cli -- query "SELECT count(*) FROM Transaction WHERE appName = 'MyApp'"

# Translate with verbose notes
npm run cli -- query --verbose "SELECT count(*) FROM Transaction"

# Validate generated DQL syntax
npm run cli -- query --validate "SELECT count(*) FROM Transaction"

# Auto-fix DQL issues
npm run cli -- query --fix "SELECT count(*) FROM Transaction"

# Batch translate from Excel
npm run cli -- excel input.xlsx -o output.xlsx

# Generate Dynatrace notebooks
npm run cli -- notebook path/to/test_data/ -o notebook.json
```

## Installation

See [INSTALLATION.md](INSTALLATION.md) for detailed build and installation instructions.

## Project Structure

```
nrql-translator/
├── src/
│   ├── core/              # Adapter wrapping @timstewart-dynatrace/nrql-engine
│   │   ├── NRQLToDQLTranslator.ts  # ~100 line adapter
│   │   └── types.ts
│   └── cli/               # Command-line interface
│       ├── commands/      # excel, query, validate, notebook
│       └── index.ts
├── test/                  # Integration tests (151 tests)
│   ├── unit/
│   └── fixtures/
└── docs/                  # Documentation
```

> **Note**: Both the CLI library and the Dynatrace app are thin adapters (~60 lines each) around the shared `@timstewart-dynatrace/nrql-engine` package. Translation logic changes go into the engine only — no syncing required.

## License

MIT

## Contributing

Contributions are welcome! Please ensure all changes include:
- Updated documentation
- Unit tests for new functionality
- Version increment following semver
- Changes to translation logic go in `nrql-engine`, not here
