# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

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
