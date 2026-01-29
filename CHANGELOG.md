# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

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
