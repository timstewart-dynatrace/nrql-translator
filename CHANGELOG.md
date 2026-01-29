# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

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
