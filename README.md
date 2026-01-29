# NRQL to DQL Translator

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

Translate New Relic Query Language (NRQL) queries to Dynatrace Query Language (DQL) for migration.

## Overview

This project provides two ways to translate NRQL queries to DQL:

1. **Dynatrace App** - A web-based UI that runs within your Dynatrace tenant
2. **CLI Library** - A command-line tool for batch processing Excel files containing NRQL queries

## Features

- Translates NRQL SELECT, WHERE, FACET, TIMESERIES, LIMIT, and ORDER BY clauses
- Maps NRQL aggregation functions to DQL equivalents (count, average, sum, min, max, etc.)
- Converts New Relic event types to appropriate Dynatrace data sources
- Provides confidence levels and warnings for translations
- Includes notes on data source mapping and key differences

## Supported Translations

### Clause Mapping

| NRQL | DQL |
|------|-----|
| `SELECT func(attr)` | `summarize alias = func(attr)` |
| `FROM EventType` | `fetch logs/spans/metrics` |
| `WHERE condition` | `filter condition` |
| `FACET attr` | `, by:{attr}` in summarize |
| `TIMESERIES interval` | `makeTimeseries interval:"interval"` |
| `LIMIT n` | `limit n` |
| `ORDER BY attr` | `sort attr asc/desc` |

### Function Mapping

| NRQL | DQL |
|------|-----|
| `count(*)` | `count()` |
| `average(attr)` | `avg(attr)` |
| `uniqueCount(attr)` | `countDistinct(attr)` |
| `latest(attr)` | `last(attr)` |
| `earliest(attr)` | `first(attr)` |
| `uniques(attr)` | `collectDistinct(attr)` |
| `median(attr)` | `percentile(attr, 50)` |

### Event Type Mapping

| NRQL Event | DQL Source |
|------------|------------|
| `Transaction` | `fetch logs` with APM filter |
| `Span` | `fetch spans` |
| `Log` | `fetch logs` |
| `Metric` | `fetch dt.metrics` |
| `PageView` | `fetch logs` with RUM filter |

## Quick Start

See [docs/QUICK_START.md](docs/QUICK_START.md) for detailed usage instructions.

### Dynatrace App

```bash
cd nrql-translator-app/nrql-translator
npm install
npm run start  # Development
npm run deploy # Deploy to tenant
```

### CLI

```bash
cd nrql-translator
npm install
npm run build:all
npm run cli -- excel input.xlsx -o output.xlsx
```

## Installation

See [INSTALLATION.md](INSTALLATION.md) for detailed build and installation instructions.

## Project Structure

```
nrql-translator/
├── nrql-translator/           # CLI library
│   ├── src/
│   │   ├── core/              # Translation engine
│   │   └── cli/               # Command-line interface
│   └── test/                  # Unit tests
├── nrql-translator-app/       # Dynatrace App
│   └── nrql-translator/
│       └── ui/app/            # React frontend
└── docs/                      # Documentation
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all changes include:
- Updated documentation
- Unit tests for new functionality
- Version increment following semver
