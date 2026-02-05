# Common Patterns, Optimization & Troubleshooting

## Table of Contents

1. [Performance Anti-Patterns](#performance-anti-patterns)
2. [Optimization Techniques](#optimization-techniques)
3. [Common Mistakes & Fixes](#common-mistakes--fixes)
4. [Query Explanation Patterns](#query-explanation-patterns)
5. [Useful Snippets](#useful-snippets)

---

## Performance Anti-Patterns

### ❌ Sorting immediately after fetch

```
fetch logs
| sort timestamp desc    // ← BAD: sorts all data before filtering
| filter content ~ "error"
```

**Fix:** Filter first, sort last.

```
fetch logs
| filter content ~ "error"
| sort timestamp desc
```

### ❌ Transforming fields before filtering

```
fetch logs
| filter matchesValue(lower(k8s.namespace.name), "astro*")  // ← BAD: transforms every record
```

**Fix:** Filter directly on the field with pattern matching.

```
fetch logs
| filter k8s.namespace.name ~ "astro*"
```

### ❌ Using negation filters

```
fetch logs
| filter not k8s.namespace.name ~ "astro*"   // ← SLOWER: negations scan more data
```

**Fix:** Use inclusive filters when possible. If you must negate, use `filterOut`.

```
fetch logs
| filterOut k8s.namespace.name ~ "astro*"
```

### ❌ Not narrowing time range

```
fetch logs    // ← BAD: defaults to 2h; might be scanning far more than needed
| filter loglevel == "ERROR"
```

**Fix:** Always specify the narrowest relevant time window.

```
fetch logs, from:-10m
| filter loglevel == "ERROR"
```

### ❌ Using limit before summarize

```
fetch logs
| limit 1000       // ← BAD: aggregating over a subset gives wrong results
| summarize count()
```

**Fix:** Summarize first, then limit.

```
fetch logs
| summarize c = count()
```

### ❌ Using join/lookup for filtering

```
fetch logs
| join [fetch dt.entity.host | filter entity.name == "myhost"], on:{...}  // ← SLOW
```

**Fix:** Filter on enriched fields directly, or use `entityName()`.

```
fetch logs
| fieldsAdd host.name = entityName(dt.entity.host, type:"dt.entity.host")
| filter host.name == "myhost"
```

### ❌ Scanning all buckets

```
fetch logs    // ← Scans every log bucket
```

**Fix:** Target specific buckets.

```
fetch logs, bucket:{"default_logs", "app_logs_*"}
```

---

## Optimization Techniques

### Sampling for approximations

For exploratory queries on large datasets, use `samplingRatio` and multiply back:

```
fetch spans, samplingRatio:100
| summarize c = count(), by:{span.kind, code.namespace, code.function}
| fieldsAdd c = c * 100
```

Valid ratios: `1` (no sampling), `10`, `100`, `1000`, `10000`.

### Scan limits

Cap data scanning to control query cost:

```
fetch logs, scanLimitGBytes:100
```

### Bucket targeting

Always limit to relevant buckets:

```
fetch logs, bucket:{"astroshop_log_*"}
```

### Combining time, bucket, and sampling

```
fetch logs, bucket:{"prod_logs_*"}, from:-1d@d, samplingRatio:10
| filter loglevel == "ERROR"
| summarize c = count(), by:pod.name
| sort c desc
| limit 10
```

### Use makeTimeseries default parameter

Avoid gaps in timeseries by using `default:0`:

```
| makeTimeseries count = count(default: 0)
```

### Use nonempty for metrics

When combining metrics and one might return empty, use `nonempty:true`:

```
timeseries http_503 = sum(http_requests, default:0), filter:{code == 503}, nonempty:true
```

---

## Common Mistakes & Fixes

### Reserved keyword as field name

**Error:** Unexpected behavior when using `true`, `false`, `null`, `mod`, `and`, `or`, `xor`, `not` as field names.

**Fix:** Wrap in backticks:

```
| fields x = `true`       // access field named "true"
| sort `not` desc          // sort by field named "not"
```

Without backticks:
```
| fields x = true          // creates boolean true
| sort not desc            // boolean negation of "desc"
```

### Comparing string fields with wrong operator

**Problem:** Using `~` when exact value is known wastes performance.

```
| filter k8s.container.name ~ "coredns"    // ← unnecessary pattern match
```

**Fix:** Use `==` for exact values:

```
| filter k8s.container.name == "coredns"
```

### Forgetting to expand arrays before counting

**Problem:** Counting affected entities without expanding the array.

```
fetch dt.davis.problems
| summarize by:{affected_entity_ids}, count = count()   // ← wrong: counts per-array
```

**Fix:** Expand first:

```
fetch dt.davis.problems
| expand affected_entity_ids
| summarize by:{affected_entity_ids}, count = count()
```

### Timeseries with no data returning empty

**Problem:** A `timeseries` query returning no records causes downstream calculations to fail.

**Fix:** Use `nonempty:true` and `default:` parameters:

```
timeseries val = sum(my.metric, default:0), nonempty:true
```

### Wrong duration unit in MTTR calculation

**Problem:** `resolved_problem_duration` is in nanoseconds (not ms or s).

**Fix:** Convert to hours: divide by 3,600,000,000,000.

```
| fieldsAdd duration_hours = toLong(resolved_problem_duration) / 3600000000000.0
```

### Missing isNotNull check for optional fields

**Problem:** Aggregating on fields that may be null produces unexpected results.

```
fetch spans
| summarize avg(duration), by:{db.system}    // ← includes records where db.system is null
```

**Fix:** Filter for not-null first:

```
fetch spans
| filter isNotNull(db.system)
| summarize avg(duration), by:{db.system}
```

---

## Query Explanation Patterns

When explaining a DQL query to a user, follow this structure:

1. **Purpose** — One sentence: what does this query answer?
2. **Data source** — Which Grail table/data object is queried and over what time range.
3. **Pipeline walkthrough** — Step through each pipe stage explaining what it does.
4. **Output** — Describe the expected result shape (columns, rows, chart type).

### Example explanation

Query:
```
fetch dt.davis.problems, from:now()-7d
| filter event.status == "CLOSED"
| filter dt.davis.is_frequent_event == false and dt.davis.is_duplicate == false
| makeTimeseries `AVG duration` = avg(toLong(resolved_problem_duration)/3600000000000.0), time:event.end
```

Explanation:
> This query calculates the average time to resolve Davis problems over the past 7 days.
> It fetches all Davis problems from the last week, keeps only closed problems that are
> not frequent or duplicate, then creates a timeseries of the average resolution duration
> (converted from nanoseconds to hours) bucketed by when each problem was resolved.
> The output is a time chart showing MTTR trends.

---

## Useful Snippets

### Get entity display name from ID

```
| fieldsAdd name = entityName(dt.entity.host, type:"dt.entity.host")
```

### Business hours filter (Mon-Fri 9-17)

```
| fieldsAdd dow = getDayOfWeek(timestamp), hour = formatTimestamp(timestamp, format:"HH")
| filter dow >= 1 AND dow <= 5 AND hour >= 9 AND hour <= 17
```

### Day-over-day comparison

```
fetch logs, from:bin(now(), 24h)
| filter loglevel == "ERROR"
| summarize todayCount = count()
| append [
    fetch logs, from:bin(now(), 24h) - 24h, to:bin(now(), 24h)
    | filter loglevel == "ERROR"
    | summarize yesterdayCount = count()
  ]
```

### Week number grouping

```
| fieldsAdd week = getWeekOfYear(timestamp)
| summarize by:{week}, count = count()
```

### Parse JSON from string field

```
| parse Response, "JSON:json"
| fieldsFlatten json, prefix:"parsed."
```

### Convert nanosecond duration to human-readable

```
| fieldsAdd dur_sec = toLong(duration) / 1000000000.0
| fieldsAdd dur_min = dur_sec / 60.0
| fieldsAdd dur_hours = dur_min / 60.0
```

### Safe percentage calculation

```
timeseries errors = sum(http_errors, default:0), total = sum(http_requests, default:1), nonempty:true
| fieldsAdd error_pct = arrayAvg(errors) / arrayAvg(total) * 100
```
