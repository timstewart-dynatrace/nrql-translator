# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

## [1.0.34] - 2026-02-28

### Fixed
- **App translator out of sync**: Synced Dynatrace App copy of `NRQLToDQLTranslator.ts` and `types.ts` with canonical library version — app was missing all features from v1.0.27-1.0.33 (1,170+ lines of drift including `filter()`, `rate()`, `percentage()`, `CASES()`, depth-aware parsing, field mappings, and 18 additional event type mappings)
- **CLI version hardcoded as `1.0.0`**: Now reads version from `package.json` dynamically
- **ESLint lint failures**: Added `.eslintrc.json` to library project; fixed 2 unnecessary regex escape warnings in `parseAggregationFunction()`

### Changed
- **Extracted duplicated `aggFunctions` array** to `AGG_FUNCTIONS` static constant (was duplicated in `parseAggregationFunction` and `translateArithmeticExpressionParts`)
- **Consolidated `splitArgsRespectingParens`** to delegate to `splitSelectParts` (identical logic was duplicated)
- **Extracted `FIELD_MAP`** from inline object in `mapFieldNames()` to static class constant (70+ field mappings)
- **Extracted confidence thresholds** to named constants (`CONFIDENCE_HIGH_THRESHOLD`, `CONFIDENCE_MEDIUM_THRESHOLD`)
- **Updated README.md** with comprehensive feature documentation: all 21 event type mappings, complete function mapping table, FACET features, operator mapping, translation examples, confidence level explanation, CLI commands, and project structure notes

## [1.0.33] - 2026-02-28

### Added
- **Arithmetic `filter()` expressions**: Properly translates `filter(agg1) / filter(agg2) AS alias` and `(filter(count(*), WHERE cond) / count(*)) * 100 AS alias` — all combinations of division, subtraction, multiplication with filter() calls
- **Multi-arg inner functions in `filter()`**: `filter(percentile(duration, 95), WHERE cond)` now correctly preserves the percentile value → `percentile(if(cond, duration), 95)`
- **`IS TRUE` / `IS FALSE` operator conversion**: `error IS TRUE` → `error == true`, `error IS FALSE` → `error == false`
- 6 new tests (133 total)

### Fixed
- **FROM...SELECT with `filter()` WHERE truncation**: Replaced regex-based SELECT clause extraction with depth-aware parsing to prevent `WHERE` inside `filter()` args from truncating the SELECT content
- **`parseAggregationFunction` arithmetic continuation**: Expressions like `filter(a) / filter(b) AS alias` are now recognized as `_arithmetic_` expressions instead of returning null
- **`_arithmetic_` handler upgraded**: Replaced simple regex with depth-aware function scanning (`translateArithmeticExpressionParts`) to handle nested function calls like `filter()` within arithmetic expressions
- **COMPARE WITH alias prefix**: `current_` prefix regex no longer corrupts field comparisons inside aggregation expressions (e.g., `service.name == "checkout"` was becoming `service.current_name == "checkout"`)

## [1.0.32] - 2026-02-28

### Added
- **`filter()` aggregate function support**: `filter(count(*), WHERE cond)` decomposes to `countIf(translatedCond)`; `filter(average(field), WHERE cond)` decomposes to `avg(if(translatedCond, field))`
- **Time grouping functions in FACET**: `hourOf(timestamp)` → `getHour(timestamp)`, `dateOf()` → `formatTimestamp()`, `weekOf()` → `getWeekOfYear()`, `monthOf()`, `dayOf()`, `yearOf()`
- **`SLIDE BY` clause detection**: Parsed and produces a warning (DQL makeTimeseries does not support sliding windows)
- **`ago()` time function in WHERE**: `timestamp >= ago(7 days)` translates to `timestamp >= now() - 7d`
- 15 new tests (127 total)

### Fixed
- **CASES label parsing**: Trailing comma no longer captured as part of CASES label (e.g., `"guest,"` → `"guest"`)
- **COMPARE WITH + CASES**: Append sub-query now correctly processes FACET fields through `processFacetFields()` instead of using raw NRQL strings. CASES expressions are properly converted to `fieldsAdd` + `if()` in both primary and append blocks
- **COMPARE WITH + field mapping**: Append sub-query now applies field name mapping (e.g., `httpResponseCode` → `http.response.status_code`)
- **Context propagation**: `generateTimeseries()` and `generateSummarize()` now receive translation context for proper field mapping in FACET processing

### Changed
- `SLIDE BY` added to clause stop keywords so it doesn't interfere with FACET/WHERE/COMPARE WITH parsing
- `filter()` moved from unsupported to supported aggregation functions

## [1.0.31] - 2026-02-28

### Added
- **`rate()` function support**: `rate(count(*), 1 minute)` now decomposes to `count()` — with makeTimeseries, count per interval equals rate per interval period
- **`percentage()` function support**: `percentage(count(field), where condition)` decomposes to `100.0 * countIf(condition) / count()`
- **`cdfPercentage()` function support**: `cdfPercentage(field, t1, t2, t3, t4)` expands to multiple cumulative distribution `countIf(field <= threshold) / count()` expressions
- **`CASES()` in FACET**: `CASES(where cond AS label, ...)` converts to DQL `fieldsAdd` with nested `if()` expressions
- **`LIMIT MAX` support**: `LIMIT MAX` is now parsed and silently omitted (DQL has no explicit "no limit" syntax)
- **`AjaxRequest` event type mapping**: Maps to `fetch bizevents` (browser AJAX request data)
- **Depth-aware clause parsing**: WHERE and FACET parsers now use parenthesis-depth tracking to avoid matching keywords inside function calls like `CASES(where ...)`
- New field mappings: `requestUrl` → `http.request.url`, `jobName` → `k8s.job.name`
- 25 new tests (112 total)

### Changed
- `rate()` and `percentage()` moved from unsupported to fully supported functions
- `bytecountestimate()` added to unsupported functions with descriptive message
- FACET clause now uses paren-aware splitting (handles `CASES()`, `if()` in grouping fields)
- Translation confidence improved from 93.4% HIGH to 98.0% HIGH across 854 production queries

### Fixed
- WHERE clause parser no longer matches `where` keyword inside `CASES(where ...)` function arguments
- FACET clause parser no longer truncates content at `where` inside `CASES()` expressions

## [1.0.30] - 2026-02-28

### Fixed
- **NOT LIKE operator**: Fixed `NOT LIKE 'text%'` producing `startsWith(NOT, "text")` instead of `not(startsWith(field, "text"))`. NOT LIKE patterns now processed before LIKE patterns with proper function-style negation (`not(startsWith(...))`, `not(contains(...))`, `not(endsWith(...))`)
- **Backtick-quoted field names**: Backtick identifiers (e.g., `` `container_name` ``) now stripped early in parsing so field mapping and operator conversion work correctly. Previously produced `"container_name"` (string literal) instead of `container_name` (field reference)
- **NRQL line comments**: `--` comments now stripped during normalization. Previously, `SELECT count(*) -- comment` would include comment text in the DQL output
- **IN operator with backtick fields**: `` `level` IN ('info') `` now correctly converts to `in(loglevel, array("info"))` instead of passing through unconverted

## [1.0.29] - 2026-02-28

### Added
- **Help dialog**: Help button in top-right corner opens a modal with usage instructions, supported NRQL features, confidence level explanations, version number, and community disclaimer
- Uses Strato `Modal` component and `HelpIcon` for native Dynatrace look and feel

## [1.0.28] - 2026-02-28

### Added
- **"Open in Notebook" button**: Sends translated DQL directly to Dynatrace Notebooks via `sendIntent()` from `@dynatrace-sdk/navigation`
- **"Open with..." button**: Opens Dynatrace's standard app picker dialog, allowing users to send the DQL query to any compatible app
- Both buttons appear alongside the existing "Copy DQL" button after translation

## [1.0.27] - 2026-02-28

### Added
- **Validation CLI command** (`validate`): Compares TypeScript translator output against Python compiler test data
  - Reads `*_ast_test.json` files from TEMP directory (843 production queries across 11 dashboards)
  - Generates match/mismatch reports with confidence scoring
  - Supports `--verbose` for detailed mismatch output and `--output` for JSON report export
- **Notebook generator CLI command** (`notebook`): Generates Dynatrace Notebook JSON for import into tenants
  - Creates alternating markdown (NRQL) and runnable DQL query sections
  - Supports `--source python|typescript|both` to choose DQL translation source
  - Supports `--per-dashboard` for one notebook per dashboard file
  - Supports `--max-queries` to limit sections per notebook
  - Groups queries by dashboard page with section dividers
- **New event type mappings**: `BrowserInteraction`, `InfrastructureEvent`, `NrAiIncident`, `LogEvent`, `SyntheticRequest`, `K8sPodSample`, `K8sContainerSample`, `K8sNodeSample`
- **New field mappings**: `entity.name`, `http.response.status_code`, `http.request.url`, `cpuPercent`, `memoryUsedPercent`, `parent.id`, `trace.id`, K8s container metric fields

### Changed
- **`Transaction` now maps to `fetch spans`** instead of `fetch logs` (aligns with Python compiler and Dynatrace data model)
- **`PageView`/`PageAction` now map to `fetch bizevents`** instead of `fetch logs`
- **`SystemSample`/`ProcessSample`/`NetworkSample` now map to `fetch dt.metrics`** (infrastructure metrics use timeseries)
- `stddev` moved from unsupported to supported functions (DQL natively supports `stddev()`)
- `latest()` now maps to `takeLast()` (correct DQL function name)
- `earliest()` now maps to `takeFirst()` (correct DQL function name)
- `uniqueCount()` now maps to `countDistinctExact()` for exact cardinality
- `duration` field now preserves as `duration` instead of mapping to `response_time`
- `http.statusCode` now maps to `http.response.status_code` (full DT field name)
- `http.url` now maps to `http.request.url`
- IN operator now supports dotted field names (e.g., `entity.guid IN (...)`)
- Improved unsupported function messages with decomposition hints

### Fixed
- IN operator regex now handles dotted field names like `entity.guid`

## [1.0.26] - 2025-02-05

### Added
- **COMPARE WITH support**: Translator now generates DQL `append` pattern for NRQL `COMPARE WITH` clauses
- Automatically generates time-shifted queries with `current_` and `previous_` prefixed aggregations
- Calculates correct time offsets (e.g., `1 week ago` → `-192h, to:-168h` with `timestamp + 168h`)
- Falls back to warning for unparseable time expressions (e.g., "last tuesday")

### Changed
- Reduced confidence penalty for COMPARE WITH from -20 to -5 since it's now supported
- Added 3 new tests for COMPARE WITH functionality

## [1.0.25] - 2025-02-05

### Added
- Documented DQL time comparison pattern using `append` command (equivalent to NRQL `COMPARE WITH`)
- Pattern uses time-shifted queries overlaid on same chart for period comparison

### Changed
- Updated `COMPARE WITH` warning message to reference the `append` pattern in LESSONS_LEARNED.md
- Improved QUICK_START.md warning table with actionable guidance

## [1.0.24] - 2025-02-05

### Added
- Created `docs/LESSONS_LEARNED.md` documenting DQL syntax rules and common pitfalls
- Added Kubernetes field mapping table to README.md

### Fixed
- Updated README.md and QUICK_START.md: Metric queries use `timeseries` command, not `fetch dt.metrics`

## [1.0.23] - 2025-02-05

### Fixed
- Fixed arithmetic aggregation expressions without outer parentheses (e.g., `average(duration.ms)/1000`)
- Now correctly recognized as aggregation and translated to `summarize avg(duration.ms)/1000` instead of `fields average(...)`

## [1.0.22] - 2025-02-05

### Fixed
- Fixed LIKE operator with dotted field names (e.g., `http.target LIKE '/api/%'`)
- Field names containing dots now correctly produce `startsWith(http.target, ...)` instead of invalid `http.startsWith(target, ...)`

## [1.0.21] - 2025-02-05

### Added
- Added storage scopes for metrics, spans, and events to app.config.json
- App now has permissions to execute translated queries for all data sources

## [1.0.20] - 2025-02-05

### Fixed
- Fixed spacing in by:{} clause - now uses proper comma spacing (e.g., `by:{host, status}` instead of `by:{host,status}`)
- Consistent formatting in summarize and makeTimeseries commands

### Changed
- Updated npm dependencies to latest compatible versions

## [1.0.19] - 2025-01-29

### Fixed
- Fixed field name mismatch between by:{} clause and filter clause in timeseries
- FACET and WHERE fields now get mapped to Dynatrace names (e.g., k8s.containerName → k8s.container.name)
- Both by:{} clause and filter clause now use consistent mapped field names

## [1.0.18] - 2025-01-29

### Fixed
- Fixed DQL timeseries filter error - WHERE clause fields now automatically added to by:{} clause
- DQL timeseries can only filter on dimensions in the by:{} clause
- Added `extractFieldsFromWhere` helper to parse field names from WHERE conditions

## [1.0.17] - 2025-01-29

### Added
- Kubernetes field mappings for New Relic to Dynatrace field name translation
- Maps k8s.clusterName → k8s.cluster.name
- Maps k8s.containerName → k8s.container.name
- Maps k8s.podName → k8s.pod.name
- Maps k8s.namespaceName → k8s.namespace.name
- And other common k8s field variations

## [1.0.16] - 2025-01-29

### Fixed
- Fixed metric key quoting in DQL timeseries command - metric keys must NOT be quoted
- Strip quotes (backticks, single, double) from metric selectors and FACET fields in timeseries
- Filter clause still properly quotes string values

## [1.0.15] - 2025-01-29

### Fixed
- Fixed metric aggregation functions to use valid DQL timeseries aggregations
- `latest()` and `earliest()` now map to `avg()` with warnings (DQL timeseries does not support `last()` or `first()`)
- `uniqueCount()` now maps to `count()` with warning for metric queries
- Added proper warnings when semantic translation occurs

## [1.0.14] - 2025-01-29

### Changed
- Metric queries now use DQL `timeseries` command instead of invalid `fetch dt.metrics`
- Added `generateMetricDQL` method for proper metric query translation
- Metric queries generate: `timeseries alias = agg(metric.selector), by:{facets}`

## [1.0.13] - 2025-01-29

### Fixed
- Fixed WHERE and FACET clause regex to handle terminating keywords at end of query
- Keywords like TIMESERIES at end of query (without trailing space) now properly terminate clauses

## [1.0.12] - 2025-01-29

### Fixed
- Fixed FACET clause parsing to terminate at WHERE keyword
- NRQL allows flexible clause ordering (FACET can come before or after WHERE)

## [1.0.11] - 2025-01-29

### Added
- Support for `FROM ... SELECT` syntax (NRQL allows FROM clause before SELECT)
- Support for bare `TIMESERIES` clause without interval (defaults to 1 hour)

## [1.0.10] - 2025-01-29

### Removed
- Removed "Explore Data" page and navigation item
- Removed "About" page and navigation item
- App now only has the Translator page

## [1.0.9] - 2025-01-29

### Fixed
- Fixed parsing of arithmetic expressions containing aggregations (e.g., `(max(field)/1000) as alias`)
- Arithmetic expressions with aggregations now correctly generate `summarize` commands instead of `fields`

## [1.0.8] - 2025-01-29

### Fixed
- Fixed aggregation function parser to handle nested parentheses (e.g., `percentage(count(field), where condition)`)
- Fixed WHERE clause parser to only match WHERE after FROM clause, avoiding false matches inside function calls
- Added `splitArgsRespectingParens()` helper for proper argument parsing

## [1.0.7] - 2025-01-29

### Fixed
- Fixed `makeTimeseries` interval parameter to use duration literal instead of quoted string
  - Old: `interval:"1h"` (string - causes DQL syntax error)
  - New: `interval:1h` (duration literal - correct)

## [1.0.6] - 2025-01-29

### Fixed
- Fixed field mapping regex to use negative lookbehind, preventing `service.name` from becoming `service.service.name`
- Added preserve mappings for DQL fields (`service.name`, `span.kind`) to prevent incorrect transformations
- Enhanced quote normalization to handle backticks and curly/smart quotes (Unicode U+2018, U+2019, U+201C, U+201D)

## [1.0.5] - 2025-01-29

### Fixed
- Fixed IN operator to use correct DQL `array()` function syntax per official Dynatrace docs
  - Old: `in(field, {200, 201})`
  - New: `in(field, array(200, 201))`

## [1.0.4] - 2025-01-29

### Fixed
- Fixed `=` to `==` conversion corrupting quotes by using proper negative lookbehind/lookahead regex
- Added `normalizeQuotes()` helper method for consistent quote conversion at multiple stages
- Fixed IN operator to use correct DQL array syntax `{a, b}` instead of `array(a, b)`

### Added
- Expanded field mappings from reference project:
  - HTTP fields: httpResponseCode, request.uri, request.method, http.statusCode
  - Error fields: error.class, error.message, errorMessage, errorType
  - Log fields: message, level, severity
  - Duration fields: totalTime, webDuration, databaseDuration, externalDuration

## [1.0.3] - 2025-01-29

### Added
- Version number display on main Translator page

### Changed
- Feature branches now include version number (e.g., `feature/1.0.3-description`)

## [1.0.2] - 2025-01-29

### Fixed
- Fixed single quote to double quote conversion for DQL strings
- Replaced regex-based quote pair conversion with global replacement at end of DQL generation

## [1.0.1] - 2025-01-29

### Fixed
- Added single quote to double quote conversion for DQL string literals

## [1.0.0] - 2025-01-28

### Added
- Initial release of NRQL to DQL Translator
- Core translation engine with support for:
  - SELECT clause with aggregation functions
  - FROM clause with event type mapping
  - WHERE clause with condition translation
  - FACET clause for grouping
  - TIMESERIES clause for time-based aggregation
  - LIMIT and ORDER BY clauses
- Function mappings: count, average, sum, min, max, uniqueCount, percentile, latest, earliest, uniques, median
- Event type mappings: Transaction, Span, Log, Metric, PageView, PageAction, SyntheticCheck
- Dynatrace App with web-based UI
- CLI tool for batch processing Excel files
- Unit test suite with 52 passing tests
