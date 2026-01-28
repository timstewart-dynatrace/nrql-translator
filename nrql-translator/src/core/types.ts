/**
 * Core Type Definitions for NRQL to DQL Translation
 *
 * This file contains all the core types used across the translation library.
 * Types are designed to be self-contained with no external dependencies.
 */

// =============================================================================
// Translation Result Types
// =============================================================================

/**
 * Result of translating NRQL to DQL
 */
export interface TranslationResult {
  /** The translated DQL query */
  dql: string;

  /** Notes and recommendations from translation */
  notes: TranslationNotes;

  /** Confidence level of the translation */
  confidence: 'high' | 'medium' | 'low';

  /** Warnings about potential issues */
  warnings: string[];
}

/**
 * Detailed notes from the translation process
 */
export interface TranslationNotes {
  /** Data source mapping recommendations */
  dataSourceMapping: string[];

  /** Field extraction requirements */
  fieldExtraction: string[];

  /** Key differences between NRQL and DQL */
  keyDifferences: string[];

  /** Performance considerations for the DQL */
  performanceConsiderations: string[];

  /** Data model requirements for Dynatrace */
  dataModelRequirements: string[];

  /** Testing recommendations */
  testingRecommendations: string[];
}

// =============================================================================
// NRQL Parsing Types
// =============================================================================

/**
 * NRQL clause types
 */
export type NRQLClauseType =
  | 'SELECT'
  | 'FROM'
  | 'WHERE'
  | 'FACET'
  | 'TIMESERIES'
  | 'SINCE'
  | 'UNTIL'
  | 'LIMIT'
  | 'ORDER BY'
  | 'COMPARE WITH'
  | 'WITH TIMEZONE';

/**
 * Parsed NRQL query structure
 */
export interface ParsedNRQL {
  /** Original NRQL query */
  original: string;

  /** SELECT clause content */
  select: SelectClause;

  /** FROM clause - event type(s) */
  from: string[];

  /** WHERE clause conditions */
  where: string | null;

  /** FACET grouping fields */
  facet: string[];

  /** TIMESERIES interval */
  timeseries: TimeseriesClause | null;

  /** SINCE time specification */
  since: string | null;

  /** UNTIL time specification */
  until: string | null;

  /** LIMIT value */
  limit: number | null;

  /** ORDER BY specification */
  orderBy: OrderByClause | null;

  /** COMPARE WITH time for comparison */
  compareWith: string | null;

  /** WITH TIMEZONE specification */
  timezone: string | null;
}

/**
 * SELECT clause parsed content
 */
export interface SelectClause {
  /** Raw SELECT content */
  raw: string;

  /** Parsed aggregation functions */
  aggregations: AggregationFunction[];

  /** Simple field selections (non-aggregated) */
  fields: string[];

  /** Whether this is a SELECT * */
  isSelectAll: boolean;
}

/**
 * Aggregation function parsed from SELECT
 */
export interface AggregationFunction {
  /** Function name (e.g., count, average, sum) */
  name: string;

  /** Function arguments */
  args: string[];

  /** Alias for the result */
  alias: string | null;

  /** Original function text */
  original: string;
}

/**
 * TIMESERIES clause parsed content
 */
export interface TimeseriesClause {
  /** Interval value (e.g., "5", "1") */
  value: number;

  /** Interval unit (e.g., "minute", "hour", "day") */
  unit: string;

  /** Original text */
  original: string;
}

/**
 * ORDER BY clause parsed content
 */
export interface OrderByClause {
  /** Field to order by */
  field: string;

  /** Sort direction */
  direction: 'ASC' | 'DESC';

  /** Original text */
  original: string;
}

// =============================================================================
// Function Mapping Types
// =============================================================================

/**
 * NRQL aggregation function names
 */
export type NRQLAggregationFunction =
  | 'count'
  | 'average'
  | 'sum'
  | 'max'
  | 'min'
  | 'uniqueCount'
  | 'percentile'
  | 'latest'
  | 'earliest'
  | 'uniques'
  | 'median'
  | 'stddev'
  | 'rate'
  | 'histogram'
  | 'filter'
  | 'funnel'
  | 'percentage'
  | 'apdex';

/**
 * DQL aggregation function names
 */
export type DQLAggregationFunction =
  | 'count'
  | 'avg'
  | 'sum'
  | 'max'
  | 'min'
  | 'countDistinct'
  | 'percentile'
  | 'last'
  | 'first'
  | 'collectDistinct'
  | 'takeFirst'
  | 'takeLast'
  | 'takeAny';

/**
 * Function mapping entry
 */
export interface FunctionMapping {
  /** NRQL function name */
  nrql: string;

  /** DQL function name */
  dql: string;

  /** Whether transformation is needed beyond simple rename */
  requiresTransformation: boolean;

  /** Notes about the mapping */
  notes?: string;
}

// =============================================================================
// Event Type Mapping Types
// =============================================================================

/**
 * New Relic event type
 */
export type NewRelicEventType =
  | 'Transaction'
  | 'TransactionError'
  | 'Log'
  | 'Metric'
  | 'PageView'
  | 'PageAction'
  | 'BrowserInteraction'
  | 'SyntheticCheck'
  | 'SyntheticRequest'
  | 'SystemSample'
  | 'ProcessSample'
  | 'NetworkSample'
  | 'StorageSample'
  | 'InfrastructureEvent'
  | 'Span'
  | 'DistributedTracingSpan'
  | 'MobileSession'
  | 'MobileCrash'
  | 'Custom';

/**
 * Event type to DQL data source mapping
 */
export interface EventTypeMapping {
  /** New Relic event type */
  eventType: string;

  /** DQL fetch command (logs, bizevents, events, etc.) */
  dqlFetch: string;

  /** Additional filter to apply */
  filter?: string;

  /** Notes about the mapping */
  notes?: string;
}

// =============================================================================
// Field Mapping Types
// =============================================================================

/**
 * New Relic to Dynatrace field mapping
 */
export interface FieldMapping {
  /** New Relic field name */
  nrField: string;

  /** Dynatrace field name */
  dtField: string;

  /** Whether this is a standard New Relic field */
  isStandardField: boolean;
}

// =============================================================================
// Translation Context Types
// =============================================================================

/**
 * Context for translation (optional customizations)
 */
export interface TranslationContext {
  /** Custom event type mappings */
  eventTypeMappings?: Record<string, EventTypeMapping>;

  /** Custom field mappings */
  fieldMappings?: Record<string, string>;

  /** Whether to strip time ranges (for dashboard use) */
  stripTimeRanges?: boolean;

  /** Default data source if event type is unknown */
  defaultDataSource?: string;
}

// =============================================================================
// Comparison Operators
// =============================================================================

/**
 * NRQL comparison operators
 */
export type NRQLOperator =
  | '='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'AND'
  | 'OR'
  | 'NOT';
