# Quick Start Guide

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Using the Dynatrace App

### 1. Deploy the App

```bash
cd nrql-translator-app/nrql-translator
npm install
npm run deploy
```

### 2. Access the App

1. Log into your Dynatrace tenant
2. Navigate to **Apps** in the left menu
3. Find "NRQL to DQL Translator"
4. Click to open

### 3. Translate a Query

1. Paste your NRQL query in the input field
2. Click "Translate to DQL"
3. Review the translated DQL and any warnings
4. Click "Copy DQL" to copy to clipboard

### Example Translation

**Input NRQL:**
```sql
SELECT count(*), average(duration)
FROM Transaction
WHERE appName = 'MyApp'
FACET host
TIMESERIES 5 minutes
```

**Output DQL:**
```dql
fetch logs
| filter log.source == "apm" and service.name == "MyApp"
| makeTimeseries count = count(), avg_duration = avg(duration), interval:"5m", by:{host.name}
```

## Using the CLI

### 1. Build the CLI

```bash
cd nrql-translator
npm install
npm run build:all
```

### 2. Prepare Your Excel File

Create an Excel file with NRQL queries in one column. The CLI will:
- Read the input file
- Translate each query
- Write results to an output file

### 3. Run Translation

```bash
npm run cli -- excel input.xlsx -o output.xlsx
```

### CLI Options

```bash
npm run cli -- excel --help

Options:
  -o, --output <file>  Output file path (default: input_translated.xlsx)
  -c, --column <name>  Column name containing NRQL queries (default: "NRQL")
  -h, --help           Display help
```

## Translation Notes

### Confidence Levels

- **High**: Direct mapping exists, translation is reliable
- **Medium**: Some assumptions made, review recommended
- **Low**: Significant differences, manual adjustment likely needed

### Common Warnings

| Warning | Meaning |
|---------|---------|
| "Unknown function" | Function has no direct DQL equivalent |
| "Unknown event type" | Event type not in standard mapping |
| "COMPARE WITH not supported" | DQL lacks this feature |

### Data Source Mapping

The translator maps NRQL event types to DQL data sources:

| If your NRQL uses... | Translator produces... |
|----------------------|----------------------|
| Transaction | `fetch logs` with APM filter |
| Span | `fetch spans` |
| Log | `fetch logs` |
| Metric | `timeseries` command (DQL uses timeseries for metrics, not fetch) |
| PageView/PageAction | `fetch logs` with RUM filter |

### Field Name Mapping

Common field translations:

| NRQL Field | DQL Field |
|------------|-----------|
| `appName` | `service.name` |
| `host` | `host.name` |
| `appId` | `service.id` |
| `entityGuid` | `dt.entity.id` |

## Troubleshooting

### "Parse error" in Dynatrace

The translated DQL may need adjustment for your specific data model:

1. Check that the data source exists in your tenant
2. Verify field names match your actual data
3. Test with a simple query first

### Missing Data

If queries return no data:

1. Verify the time range in Dynatrace UI
2. Check that equivalent data is being ingested
3. Review the data source mapping notes

### Function Not Supported

Some NRQL functions have no DQL equivalent:

- `rate()` - Implement manually with time-based calculations
- `stddev()` - Not available in DQL
- `funnel()` - Use Session Replay or manual implementation

## Next Steps

1. Review [INSTALLATION.md](../INSTALLATION.md) for detailed setup
2. Check [CHANGELOG.md](../CHANGELOG.md) for recent updates
3. Report issues on [GitHub](https://github.com/timstewart-dynatrace/nrql-translator/issues)
