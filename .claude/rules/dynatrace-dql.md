---

# Dynatrace Query Language (DQL) Skill

## DQL Fundamentals

DQL is a pipeline-based query language for Dynatrace Grail storage. Queries chain commands with `|` (pipe). Data flows left-to-right, filtered and transformed at each step.

### Minimal query

```
fetch logs
```

### Pipeline structure

```
fetch <dataObject> [, from:] [, to:] [, bucket:] [, samplingRatio:]
| filter <condition>
| fieldsAdd <expression>
| summarize <aggregation>, by:{<grouping>}
| sort <field> desc
| limit <n>
```

### Grail data objects

| Data object | Description |
|---|---|
| `logs` | Log records |
| `events` | Generic events |
| `bizevents` | Business events |
| `spans` | Distributed traces |
| `dt.davis.problems` | Davis AI root-cause problems |
| `dt.davis.events` | Davis raw events (CPU saturation, etc.) |
| `dt.davis.events.snapshots` | Point-in-time Davis event snapshots |
| `dt.entity.<type>` | Entity queries (host, service, process_group, etc.) |

For metrics, use the `timeseries` starting command instead of `fetch`.

## Key Commands

### Starting commands

- `fetch <dataObject>` — Load data from Grail. Supports `from:`, `to:`, `timeframe:`, `bucket:`, `samplingRatio:`, `scanLimitGBytes:`.
- `timeseries <aggregation>(<metricKey>)` — Load and aggregate metric data. Supports `by:`, `filter:`, `interval:`, `bins:`, `from:`, `to:`, `shift:`.
- `data record(...)` — Generate inline sample data for testing.

### Filtering

- `filter <condition>` — Keep records matching condition.
- `filterOut <condition>` — Remove records matching condition.
- `search "<term>"` — Full-text search across all fields. Use `field ~ "term"` to target a specific field.
- `dedup <field>` — Remove duplicate records.

### Field manipulation

- `fields <field1>, <field2>` — Select and optionally rename/transform fields.
- `fieldsAdd <expr>` — Append or replace a field.
- `fieldsKeep <pattern>` — Keep only matching fields (supports wildcards like `dt.entity.*`).
- `fieldsRemove <pattern>` — Remove matching fields.
- `fieldsRename <old>, alias:<new>` — Rename a field.

### Aggregation

- `summarize <agg>, by:{<grouping>}` — Aggregate records. Common aggregations: `count()`, `countDistinct()`, `avg()`, `sum()`, `min()`, `max()`, `percentile()`, `median()`, `collectArray()`, `collectDistinct()`.
- `makeTimeseries <agg>, interval:<duration>` — Create time-bucketed series from event data.

### Structuring

- `expand <arrayField>` — Explode array into separate records.
- `fieldsFlatten <recordField>` — Flatten nested records.
- `parse <field>, "<pattern>"` — Extract values using DPL patterns or JSON.
- `append [<subquery>]` — Union results from a sub-query.

### Joining

- `lookup [<subquery>], sourceField:<f>, lookupField:<f>, fields:{<fields>}` — Enrich records from a sub-query.
- `join <subquery>, on:{...}` — Full join on conditions.

### Ordering and limiting

- `sort <field> [asc|desc]` — Sort records. Place at end of query for best performance.
- `limit <n>` — Return top N records.

## Recommended Command Order

Follow this order for optimal performance:

1. **Filter early** — Reduce records immediately after `fetch` using `filter` or `search`.
2. **Select fields early** — Use `fields`, `fieldsKeep`, or `fieldsRemove` to drop unneeded columns.
3. **Transform** — Apply `fieldsAdd`, `parse`, `append` as needed.
4. **Aggregate** — Use `summarize` or `makeTimeseries`.
5. **Sort last** — Place `sort` after aggregation, never right after `fetch`.
6. **Limit last** — Apply `limit` after `sort`.

## Performance Best Practices

- Narrow time range: `fetch logs, from:-10m` is faster than the default 2h.
- Use `samplingRatio:` (10, 100, 1000, 10000) for approximations on large datasets.
- Use `bucket:{"name", "prefix_*"}` to target specific Grail buckets.
- Use `scanLimitGBytes:` to cap data scanning.
- Use `==` for exact matches; use `~` only when wildcards are needed.
- Filter directly on fields — avoid wrapping in `lower()` or other transforms.
- Use inclusive filters; avoid negations when possible.
- Avoid `join`/`lookup` for filtering — use enriched fields instead.

## Time Expressions

| Syntax | Meaning |
|---|---|
| `from:-2h` | Relative: last 2 hours |
| `from:now() - 24h` | Relative with `now()` |
| `from:-1d@d` | Snapped to start of day |
| `from:bin(now(), 24h)` | Binned to 24h boundary |
| `timeframe:"2024-01-01T00:00:00Z/..."` | Absolute ISO range |

Duration literals: `s`, `m`, `h`, `d`.

## String Comparison Rules

- `==` / `!=` — Exact match (case-sensitive). Use when value is known.
- `~` — Pattern match with wildcards (`*`). Use when value is partly known.
- `contains(field, "substr")` — Substring search.
- `matchesValue(field, "pattern")` — Value pattern matching.
- `matchesPhrase(field, "phrase")` — Token-based phrase matching.

## Reserved Keywords

Avoid as field names: `true`, `false`, `null`, `mod`, `and`, `or`, `xor`, `not`. If required, wrap in backticks: `` `true` ``.

## Entity Name Resolution

Resolve entity IDs to display names with `entityName()`:

```
| fieldsAdd host.name = entityName(dt.entity.host, type:"dt.entity.host")
```

Or use `lookup`:

```
| lookup [fetch dt.entity.host | fieldsAdd entity.name],
    sourceField:dt.entity.host, lookupField:id, fields:{entity.name}
```

## Dynatrace MCP Server

The Dynatrace MCP (Model Context Protocol) server enables AI agents (Claude Code, etc.) to interact with Dynatrace programmatically.

### Capabilities

- **Query execution** — Run DQL queries via `/platform/storage/query/v1/query:execute`.
- **Entity retrieval** — Fetch entities, topology, relationships.
- **Problem analysis** — Retrieve Davis problems/events for automated triage.
- **Event ingestion** — Send custom events into Grail.

### Required scopes

`storage:logs:read`, `storage:events:read`, `storage:metrics:read`, `storage:spans:read`, `storage:entities:read`, `storage:buckets:read` — grant as needed.

### Authentication

OAuth2 client credentials or API token with appropriate scopes. When sending DQL via API, queries are strings in the JSON payload — ensure proper escaping.

### MCP server setup (Claude Code)

```json
{
  "mcpServers": {
    "dynatrace": {
      "command": "npx",
      "args": ["-y", "@dynatrace/mcp-server"],
      "env": {
        "DYNATRACE_URL": "https://<env-id>.apps.dynatrace.com",
        "DYNATRACE_API_TOKEN": "<token>"
      }
    }
  }
}
```

## Reference Files

Consult these based on the task:

- **Writing queries from prompts** → [dql-examples.md](dql-examples.md) — Curated prompt → DQL pairs across all data sources.
- **Choosing functions** → [dql-functions-reference.md](dql-functions-reference.md) — Full function catalog by category.
- **Optimizing / troubleshooting** → [dql-common-patterns.md](dql-common-patterns.md) — Anti-patterns, performance tips, common mistakes.

## Workflow

1. Identify the data source (logs, metrics, entities, problems, etc.).
2. Read the relevant reference file if needed.
3. Construct the query following recommended command order.
4. Apply performance best practices.
5. Explain the query in plain language if requested.
