# Quick Start Guide

> **DISCLAIMER**: This is an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Dynatrace App

The interactive web UI is in a separate repo: [nrql-translator-app](https://github.com/timstewart-dynatrace/nrql-translator-app)

## Using the CLI

### 1. Build the CLI

```bash
npm install
npm run build:all
```

### 2. Translate a Single Query

```bash
npm run cli -- query "SELECT count(*) FROM Transaction WHERE appName = 'MyApp'"
```

With validation and verbose notes:
```bash
npm run cli -- query --validate --verbose "SELECT count(*) FROM Transaction"
```

### 3. Batch Translate from Excel

Create an Excel file with NRQL queries in one column:

```bash
npm run cli -- excel input.xlsx -o output.xlsx
```

### CLI Options

```bash
npm run cli -- query --help
npm run cli -- excel --help
```

## Translation Notes

### Confidence Levels

- **High** (80-100): Direct mapping exists, translation is reliable
- **Medium** (50-79): Some assumptions made, review recommended
- **Low** (0-49): Significant differences, manual adjustment needed

### Data Source Mapping

| NRQL Event Type | DQL Source |
|-----------------|-----------|
| Transaction / Span | `fetch spans` |
| Log / LogEvent | `fetch logs` |
| Metric | `timeseries` command |
| PageView / PageAction | `fetch bizevents` |

### Common Field Translations

| NRQL Field | DQL Field |
|------------|-----------|
| `appName` | `service.name` |
| `host` | `host.name` |
| `k8s.clusterName` | `k8s.cluster.name` |

## Troubleshooting

### "Parse error" in Dynatrace

1. Use `--validate` flag to check DQL syntax before pasting
2. Verify field names match your actual data
3. Test with a simple query first

### Missing Data

1. Verify the time range in Dynatrace UI
2. Check that equivalent data is being ingested
3. Review the data source mapping notes in `--verbose` output

## Next Steps

1. Review [INSTALLATION.md](../INSTALLATION.md) for detailed setup
2. Check [CHANGELOG.md](../CHANGELOG.md) for recent updates
3. Report issues on [GitHub](https://github.com/timstewart-dynatrace/nrql-translator/issues)
