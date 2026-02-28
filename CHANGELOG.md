# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

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
