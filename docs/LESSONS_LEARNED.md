# Lessons Learned - NRQL to DQL Translation

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

This document captures key lessons learned during development of the NRQL to DQL translator.

## DQL Syntax Rules

### 1. Metric Queries Use `timeseries`, Not `fetch`

**Wrong:**
```dql
fetch dt.metrics
| filter ...
| summarize avg(cpu.usage)
```

**Correct:**
```dql
timeseries avg_cpu = avg(cpu.usage), by:{host}
| filter ...
```

DQL metric queries must use the `timeseries` command as the starting command. The `fetch` command is for logs, spans, events, and entities.

### 2. Timeseries Aggregations Are Limited

DQL `timeseries` only supports these aggregations:
- `avg`
- `sum`
- `min`
- `max`
- `count`
- `rate`

**Not supported in timeseries:**
- `last()` / `first()` - Use `avg()` as approximation
- `distinctCount()` - Not available for metrics

### 3. Metric Keys Must Not Be Quoted

**Wrong:**
```dql
timeseries avg("k8s.container.cpuUsedCores")
```

**Correct:**
```dql
timeseries avg(k8s.container.cpuUsedCores)
```

### 4. Timeseries Filter Requires Dimensions in `by:{}`

DQL timeseries can only filter on dimensions that are included in the `by:{}` clause.

**Wrong:**
```dql
timeseries avg(cpu), by:{host}
| filter cluster == "prod"  -- ERROR: cluster not in by:{}
```

**Correct:**
```dql
timeseries avg(cpu), by:{host, cluster}
| filter cluster == "prod"
```

### 5. Equality Uses `==`, Not `=`

DQL uses double equals for equality comparison.

**Wrong:**
```dql
| filter status = 200
```

**Correct:**
```dql
| filter status == 200
```

### 6. IN Operator Uses `in()` Function with `array()`

**Wrong (SQL style):**
```dql
| filter status IN (200, 201, 204)
```

**Correct:**
```dql
| filter in(status, array(200, 201, 204))
```

### 7. String Functions Need Full Field Names

When using string functions like `startsWith()`, `contains()`, `endsWith()`, the full field name (including dots) must be passed as the first argument.

**Wrong:**
```dql
| filter http.startsWith(target, "/api/")
```

**Correct:**
```dql
| filter startsWith(http.target, "/api/")
```

### 8. `by:{}` Clause Needs Proper Spacing

For readability and consistency with DQL examples:

**Preferred:**
```dql
| summarize count(), by:{host, status, region}
```

**Less readable:**
```dql
| summarize count(), by:{host,status,region}
```

### 9. Field Mapping Applies Everywhere

When translating field names (e.g., `k8s.containerName` → `k8s.container.name`), the mapping must be applied consistently in:
- `filter` clauses
- `by:{}` grouping
- `fieldsAdd` expressions
- Any other field references

Mismatches between `by:{}` field names and `filter` field names cause errors.

### 10. Arithmetic Aggregations Need Proper Parsing

Expressions like `average(duration)/1000` must be recognized as aggregations, not field selections.

**Wrong output:**
```dql
| fields average(duration)/1000
```

**Correct output:**
```dql
| summarize result = avg(duration)/1000
```

## Function Mapping Gotchas

| NRQL Function | DQL Equivalent | Notes |
|---------------|----------------|-------|
| `average()` | `avg()` | Name differs |
| `latest()` | `last()` (logs) or `avg()` (metrics) | Metrics don't support `last()` |
| `earliest()` | `first()` (logs) or `avg()` (metrics) | Metrics don't support `first()` |
| `uniqueCount()` | `countDistinct()` | Name differs |
| `median()` | `percentile(field, 50)` | Must convert |

## Regex Patterns for Field Names

When writing regex patterns to match field names, remember that NRQL field names can contain dots (e.g., `http.target`, `k8s.cluster.name`).

**Wrong pattern:**
```regex
/(\w+)\s+LIKE/  -- \w doesn't match dots
```

**Correct pattern:**
```regex
/([a-zA-Z_][a-zA-Z0-9_.]*)\s+LIKE/
```

## Testing Recommendations

1. Always test translations in actual Dynatrace environment
2. Verify field names exist in your data model
3. Check time ranges match when comparing results
4. Use `samplingRatio` for large datasets during testing

## Version History of Key Fixes

| Version | Fix |
|---------|-----|
| 1.0.14 | Metric queries use `timeseries` command |
| 1.0.15 | Map `latest()`/`earliest()` to `avg()` for metrics |
| 1.0.16 | Don't quote metric keys in timeseries |
| 1.0.17 | Add Kubernetes field mappings |
| 1.0.18 | Auto-add WHERE fields to `by:{}` clause |
| 1.0.19 | Apply field mapping to `by:{}` clause |
| 1.0.20 | Fix `by:{}` comma spacing |
| 1.0.21 | Add storage scopes for all data sources |
| 1.0.22 | Fix LIKE with dotted field names |
| 1.0.23 | Fix arithmetic aggregations without outer parens |
