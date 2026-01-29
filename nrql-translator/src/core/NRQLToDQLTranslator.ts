/**
 * NRQL to DQL Translator
 *
 * Translates New Relic Query Language (NRQL) queries to Dynatrace Query Language (DQL).
 * Supports aggregation functions, filtering, grouping, time series, and more.
 */

import {
  TranslationResult,
  TranslationNotes,
  ParsedNRQL,
  SelectClause,
  AggregationFunction,
  TimeseriesClause,
  OrderByClause,
  TranslationContext,
  EventTypeMapping,
} from './types';

/**
 * Main translator class for converting NRQL to DQL
 */
export class NRQLToDQLTranslator {
  // ==========================================================================
  // Static Function Mappings
  // ==========================================================================

  /**
   * NRQL aggregation function to DQL function mapping
   */
  private static readonly FUNCTION_MAP: Record<string, { dql: string; notes?: string }> = {
    'count': { dql: 'count' },
    'average': { dql: 'avg' },
    'sum': { dql: 'sum' },
    'max': { dql: 'max' },
    'min': { dql: 'min' },
    'uniquecount': { dql: 'countDistinct' },
    'percentile': { dql: 'percentile' },
    'latest': { dql: 'last' },
    'earliest': { dql: 'first' },
    'uniques': { dql: 'collectDistinct' },
    'median': { dql: 'percentile', notes: 'median converted to percentile(field, 50)' },
  };

  /**
   * Unsupported functions that require manual handling
   */
  private static readonly UNSUPPORTED_FUNCTIONS: Record<string, string> = {
    'stddev': 'Standard deviation is not directly supported in DQL',
    'rate': 'Rate calculation requires manual implementation in DQL',
    'histogram': 'Histogram is not directly supported in DQL',
    'funnel': 'Funnel analysis requires Dynatrace Session Replay or manual implementation',
    'apdex': 'Apdex calculation requires manual threshold configuration in DQL',
    'percentage': 'Percentage calculation requires manual implementation',
  };

  /**
   * Event type to DQL data source mapping
   */
  private static readonly EVENT_TYPE_MAP: Record<string, EventTypeMapping> = {
    'transaction': {
      eventType: 'Transaction',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "apm"',
      notes: 'APM transaction data',
    },
    'transactionerror': {
      eventType: 'TransactionError',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "apm" and isError == true',
      notes: 'APM error data',
    },
    'log': {
      eventType: 'Log',
      dqlFetch: 'fetch logs',
      notes: 'Log data',
    },
    'metric': {
      eventType: 'Metric',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Metric data - may require metric selector syntax',
    },
    'pageview': {
      eventType: 'PageView',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "rum"',
      notes: 'Browser/RUM page view data',
    },
    'pageaction': {
      eventType: 'PageAction',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "rum"',
      notes: 'Browser/RUM user action data',
    },
    'syntheticcheck': {
      eventType: 'SyntheticCheck',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "synthetic"',
      notes: 'Synthetic monitoring data',
    },
    'systemsample': {
      eventType: 'SystemSample',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "infrastructure"',
      notes: 'Infrastructure host metrics',
    },
    'processsample': {
      eventType: 'ProcessSample',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "infrastructure"',
      notes: 'Infrastructure process metrics',
    },
    'networksample': {
      eventType: 'NetworkSample',
      dqlFetch: 'fetch logs',
      filter: 'log.source == "infrastructure"',
      notes: 'Infrastructure network metrics',
    },
    'span': {
      eventType: 'Span',
      dqlFetch: 'fetch spans',
      notes: 'Distributed tracing spans',
    },
    'distributedtracingspan': {
      eventType: 'DistributedTracingSpan',
      dqlFetch: 'fetch spans',
      notes: 'Distributed tracing spans',
    },
  };

  /**
   * Time unit conversion map (NRQL to DQL)
   */
  private static readonly TIME_UNIT_MAP: Record<string, string> = {
    'second': 's',
    'seconds': 's',
    'minute': 'm',
    'minutes': 'm',
    'hour': 'h',
    'hours': 'h',
    'day': 'd',
    'days': 'd',
    'week': 'w',
    'weeks': 'w',
  };

  // ==========================================================================
  // Main Translation Method
  // ==========================================================================

  /**
   * Translate an NRQL query to DQL
   */
  public translate(nrql: string, context?: TranslationContext): TranslationResult {
    const warnings: string[] = [];
    const notes: TranslationNotes = {
      dataSourceMapping: [],
      fieldExtraction: [],
      keyDifferences: [],
      performanceConsiderations: [],
      dataModelRequirements: [],
      testingRecommendations: [],
    };

    try {
      // Step 1: Parse NRQL
      const parsed = this.parseNRQL(nrql);

      // Step 2: Generate DQL
      const dql = this.generateDQL(parsed, context, warnings, notes);

      // Step 3: Calculate confidence
      const confidence = this.calculateConfidence(parsed, warnings);

      // Step 4: Generate additional notes
      this.generateNotes(parsed, notes, warnings);

      return {
        dql,
        notes,
        confidence,
        warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`Translation error: ${errorMessage}`);

      return {
        dql: `/* Translation failed: ${errorMessage} */\n/* Original NRQL: ${nrql} */`,
        notes,
        confidence: 'low',
        warnings,
      };
    }
  }

  // ==========================================================================
  // NRQL Parsing Methods
  // ==========================================================================

  /**
   * Parse an NRQL query into its component clauses
   */
  private parseNRQL(nrql: string): ParsedNRQL {
    const normalized = this.normalizeQuery(nrql);

    return {
      original: nrql,
      select: this.parseSelectClause(normalized),
      from: this.parseFromClause(normalized),
      where: this.parseWhereClause(normalized),
      facet: this.parseFacetClause(normalized),
      timeseries: this.parseTimeseriesClause(normalized),
      since: this.parseSinceClause(normalized),
      until: this.parseUntilClause(normalized),
      limit: this.parseLimitClause(normalized),
      orderBy: this.parseOrderByClause(normalized),
      compareWith: this.parseCompareWithClause(normalized),
      timezone: this.parseTimezoneClause(normalized),
    };
  }

  /**
   * Normalize query for parsing (handle case, whitespace)
   */
  private normalizeQuery(nrql: string): string {
    return nrql.trim().replace(/\s+/g, ' ');
  }

  /**
   * Parse SELECT clause
   * Handles both "SELECT ... FROM" and "FROM ... SELECT" orderings
   */
  private parseSelectClause(nrql: string): SelectClause {
    let selectContent: string;

    // Check if query starts with FROM (FROM ... SELECT pattern)
    if (/^\s*FROM\s+/i.test(nrql)) {
      // Pattern: FROM EventType SELECT ... [WHERE|FACET|TIMESERIES|SINCE|UNTIL|LIMIT|ORDER BY|COMPARE WITH|WITH TIMEZONE]
      const fromSelectMatch = nrql.match(
        /FROM\s+\w+(?:\s*,\s*\w+)*\s+SELECT\s+(.*?)(?=\s+(?:WHERE|FACET|TIMESERIES|SINCE|UNTIL|LIMIT|ORDER\s+BY|COMPARE\s+WITH|WITH\s+TIMEZONE)\s|$)/i
      );
      if (!fromSelectMatch) {
        throw new Error('Invalid NRQL: Missing SELECT clause after FROM');
      }
      selectContent = fromSelectMatch[1].trim();
    } else {
      // Traditional pattern: SELECT ... FROM
      const selectMatch = nrql.match(/SELECT\s+(.*?)\s+FROM\s/i);
      if (!selectMatch) {
        throw new Error('Invalid NRQL: Missing SELECT clause');
      }
      selectContent = selectMatch[1].trim();
    }

    // Check for SELECT *
    if (selectContent === '*') {
      return {
        raw: selectContent,
        aggregations: [],
        fields: [],
        isSelectAll: true,
      };
    }

    // Parse individual selections
    const parts = this.splitSelectParts(selectContent);
    const aggregations: AggregationFunction[] = [];
    const fields: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      const agg = this.parseAggregationFunction(trimmed);
      if (agg) {
        aggregations.push(agg);
      } else {
        // It's a simple field selection or aliased field
        const aliasMatch = trimmed.match(/^(.+?)\s+AS\s+['"]?(.+?)['"]?$/i);
        if (aliasMatch) {
          fields.push(aliasMatch[1].trim());
        } else {
          fields.push(trimmed);
        }
      }
    }

    return {
      raw: selectContent,
      aggregations,
      fields,
      isSelectAll: false,
    };
  }

  /**
   * Split SELECT parts by comma, respecting parentheses
   */
  private splitSelectParts(content: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of content) {
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Parse an aggregation function from a SELECT part
   * Handles nested parentheses (e.g., percentage(count(field), where condition))
   * Handles arithmetic expressions (e.g., (max(field)/1000) as alias)
   */
  private parseAggregationFunction(part: string): AggregationFunction | null {
    // List of known aggregation functions
    const aggFunctions = ['count', 'sum', 'avg', 'average', 'min', 'max', 'uniquecount',
                          'percentile', 'latest', 'earliest', 'uniques', 'median',
                          'stddev', 'rate', 'percentage', 'histogram', 'funnel', 'apdex'];

    // Check if this is an arithmetic expression containing an aggregation
    // Pattern: (aggFunc(field) operator value) AS alias
    const arithmeticMatch = part.match(/^\((.+)\)\s*(?:AS\s+['"]?(.+?)['"]?)?$/i);
    if (arithmeticMatch) {
      const innerExpr = arithmeticMatch[1];
      const alias = arithmeticMatch[2]?.replace(/['"]/g, '') ?? null;

      // Check if innerExpr contains any aggregation function
      const hasAggregation = aggFunctions.some(fn =>
        new RegExp(`\\b${fn}\\s*\\(`, 'i').test(innerExpr)
      );

      if (hasAggregation) {
        // This is an arithmetic expression with aggregation
        // Store the whole expression and let translateAggregation handle it
        return {
          name: '_arithmetic_',
          args: [innerExpr],
          alias,
          original: part,
        };
      }
    }

    // First, try to match the function name
    const nameMatch = part.match(/^(\w+)\s*\(/);
    if (!nameMatch) {
      return null;
    }

    const name = nameMatch[1];
    const startIdx = nameMatch[0].length;

    // Find the matching closing parenthesis by counting depth
    let depth = 1;
    let endIdx = startIdx;
    for (let i = startIdx; i < part.length && depth > 0; i++) {
      if (part[i] === '(') depth++;
      else if (part[i] === ')') depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }

    if (depth !== 0) {
      return null; // Unbalanced parentheses
    }

    const argsStr = part.substring(startIdx, endIdx);
    const afterFunc = part.substring(endIdx + 1).trim();

    // Check for AS alias
    let alias: string | null = null;
    const aliasMatch = afterFunc.match(/^AS\s+['"]?(.+?)['"]?$/i);
    if (aliasMatch) {
      alias = aliasMatch[1].replace(/['"]/g, '');
    } else if (afterFunc.length > 0 && !afterFunc.startsWith('AS')) {
      // There's content after the function that isn't an alias
      return null;
    }

    // For simple functions, split args by comma at depth 0
    const args = this.splitArgsRespectingParens(argsStr);

    return {
      name: name.toLowerCase(),
      args,
      alias,
      original: part,
    };
  }

  /**
   * Split function arguments by comma, respecting nested parentheses
   */
  private splitArgsRespectingParens(argsStr: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of argsStr) {
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        if (current.trim()) {
          args.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Parse FROM clause
   */
  private parseFromClause(nrql: string): string[] {
    const fromMatch = nrql.match(/FROM\s+(\w+(?:\s*,\s*\w+)*)/i);
    if (!fromMatch) {
      throw new Error('Invalid NRQL: Missing FROM clause');
    }

    return fromMatch[1].split(',').map(e => e.trim());
  }

  /**
   * Parse WHERE clause
   * Only matches WHERE after the FROM clause to avoid matching 'where' inside function calls
   */
  private parseWhereClause(nrql: string): string | null {
    // First find the FROM clause position to search for WHERE only after it
    const fromMatch = nrql.match(/\bFROM\s+\w+/i);
    if (!fromMatch) {
      return null;
    }

    const afterFrom = nrql.substring(fromMatch.index! + fromMatch[0].length);

    // Match WHERE ... until next keyword or end
    // Note: (?:\s|$) allows keywords at end of query without trailing space
    const whereMatch = afterFrom.match(
      /\bWHERE\s+(.*?)(?=\s+(?:FACET|TIMESERIES|SINCE|UNTIL|LIMIT|ORDER\s+BY|COMPARE\s+WITH|WITH\s+TIMEZONE)(?:\s|$)|$)/i
    );
    return whereMatch ? whereMatch[1].trim() : null;
  }

  /**
   * Parse FACET clause
   * Note: NRQL allows flexible clause ordering (FACET can come before or after WHERE)
   */
  private parseFacetClause(nrql: string): string[] {
    // Note: (?:\s|$) allows keywords at end of query without trailing space
    const facetMatch = nrql.match(
      /FACET\s+(.*?)(?=\s+(?:WHERE|TIMESERIES|SINCE|UNTIL|LIMIT|ORDER\s+BY|COMPARE\s+WITH|WITH\s+TIMEZONE)(?:\s|$)|$)/i
    );
    if (!facetMatch) {
      return [];
    }

    return facetMatch[1].split(',').map(f => f.trim());
  }

  /**
   * Parse TIMESERIES clause
   * Handles: TIMESERIES, TIMESERIES AUTO, TIMESERIES value unit
   */
  private parseTimeseriesClause(nrql: string): TimeseriesClause | null {
    // First check if TIMESERIES exists at all
    if (!/\bTIMESERIES\b/i.test(nrql)) {
      return null;
    }

    // Match TIMESERIES with explicit interval: TIMESERIES value unit
    const explicitMatch = nrql.match(/TIMESERIES\s+(\d+)\s+(\w+)/i);
    if (explicitMatch) {
      return {
        value: parseInt(explicitMatch[1], 10),
        unit: explicitMatch[2].toLowerCase(),
        original: explicitMatch[0],
      };
    }

    // Match TIMESERIES AUTO
    const autoMatch = nrql.match(/TIMESERIES\s+AUTO/i);
    if (autoMatch) {
      return {
        value: 1,
        unit: 'hour',
        original: 'TIMESERIES AUTO',
      };
    }

    // Bare TIMESERIES (no interval specified) - default to 1 hour
    return {
      value: 1,
      unit: 'hour',
      original: 'TIMESERIES',
    };
  }

  /**
   * Parse SINCE clause
   */
  private parseSinceClause(nrql: string): string | null {
    const sinceMatch = nrql.match(
      /SINCE\s+(.*?)(?=\s+(?:UNTIL|LIMIT|ORDER\s+BY|COMPARE\s+WITH|WITH\s+TIMEZONE)\s|$)/i
    );
    return sinceMatch ? sinceMatch[1].trim() : null;
  }

  /**
   * Parse UNTIL clause
   */
  private parseUntilClause(nrql: string): string | null {
    const untilMatch = nrql.match(
      /UNTIL\s+(.*?)(?=\s+(?:LIMIT|ORDER\s+BY|COMPARE\s+WITH|WITH\s+TIMEZONE)\s|$)/i
    );
    return untilMatch ? untilMatch[1].trim() : null;
  }

  /**
   * Parse LIMIT clause
   */
  private parseLimitClause(nrql: string): number | null {
    const limitMatch = nrql.match(/LIMIT\s+(\d+)/i);
    return limitMatch ? parseInt(limitMatch[1], 10) : null;
  }

  /**
   * Parse ORDER BY clause
   */
  private parseOrderByClause(nrql: string): OrderByClause | null {
    const orderMatch = nrql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (!orderMatch) {
      return null;
    }

    return {
      field: orderMatch[1],
      direction: (orderMatch[2]?.toUpperCase() as 'ASC' | 'DESC') ?? 'ASC',
      original: orderMatch[0],
    };
  }

  /**
   * Parse COMPARE WITH clause
   */
  private parseCompareWithClause(nrql: string): string | null {
    const compareMatch = nrql.match(/COMPARE\s+WITH\s+(.*?)(?=\s+WITH\s+TIMEZONE|$)/i);
    return compareMatch ? compareMatch[1].trim() : null;
  }

  /**
   * Parse WITH TIMEZONE clause
   */
  private parseTimezoneClause(nrql: string): string | null {
    const tzMatch = nrql.match(/WITH\s+TIMEZONE\s+['"]?(.+?)['"]?$/i);
    return tzMatch ? tzMatch[1].trim() : null;
  }

  // ==========================================================================
  // DQL Generation Methods
  // ==========================================================================

  /**
   * Generate DQL from parsed NRQL
   */
  private generateDQL(
    parsed: ParsedNRQL,
    context: TranslationContext | undefined,
    warnings: string[],
    notes: TranslationNotes
  ): string {
    const dqlParts: string[] = [];
    const primaryType = parsed.from[0].toLowerCase();

    // Check if this is a Metric query - requires special handling with timeseries command
    if (primaryType === 'metric') {
      return this.generateMetricDQL(parsed, context, warnings, notes);
    }

    // Step 1: Generate fetch command
    const fetchCmd = this.generateFetch(parsed.from, context, notes);
    dqlParts.push(fetchCmd);

    // Step 2: Generate filter from event type + WHERE
    const filterCmd = this.generateFilter(parsed.from, parsed.where, context, warnings, notes);
    if (filterCmd) {
      dqlParts.push(filterCmd);
    }

    // Step 3: Generate aggregation or field selection
    if (parsed.timeseries) {
      // Time series query
      const timeseriesCmd = this.generateTimeseries(
        parsed.select,
        parsed.facet,
        parsed.timeseries,
        warnings,
        notes
      );
      dqlParts.push(timeseriesCmd);
    } else if (parsed.select.aggregations.length > 0) {
      // Aggregation query
      const summarizeCmd = this.generateSummarize(
        parsed.select,
        parsed.facet,
        warnings,
        notes
      );
      dqlParts.push(summarizeCmd);
    } else if (parsed.select.fields.length > 0 || parsed.select.isSelectAll) {
      // Field selection query
      if (!parsed.select.isSelectAll) {
        dqlParts.push(`| fields ${parsed.select.fields.join(', ')}`);
      }
    }

    // Step 4: Generate sort
    if (parsed.orderBy) {
      const sortCmd = this.generateSort(parsed.orderBy);
      dqlParts.push(sortCmd);
    }

    // Step 5: Generate limit
    if (parsed.limit) {
      dqlParts.push(`| limit ${parsed.limit}`);
    }

    // Step 6: Handle unsupported clauses
    if (parsed.compareWith) {
      warnings.push(
        `COMPARE WITH clause is not directly supported in DQL. Original: COMPARE WITH ${parsed.compareWith}`
      );
      notes.keyDifferences.push(
        'DQL does not have a direct COMPARE WITH equivalent. Use separate queries or dashboard comparison features.'
      );
    }

    if (parsed.timezone) {
      notes.keyDifferences.push(
        `DQL uses UTC by default. Original timezone: ${parsed.timezone}. Consider timezone conversion in post-processing.`
      );
    }

    // Handle SINCE/UNTIL - typically stripped for dashboard use
    if (parsed.since || parsed.until) {
      if (!context?.stripTimeRanges) {
        notes.keyDifferences.push(
          `Time range (SINCE ${parsed.since ?? 'N/A'}, UNTIL ${parsed.until ?? 'NOW'}) should be configured at dashboard/query level in Dynatrace.`
        );
      }
    }

    // Final pass: ensure all string literals use double quotes (DQL requirement)
    let result = dqlParts.join('\n');
    result = this.normalizeQuotes(result);
    return result;
  }

  /**
   * Generate DQL for Metric event type using timeseries command
   * Metric queries in DQL use a different pattern than fetch | filter | summarize
   */
  private generateMetricDQL(
    parsed: ParsedNRQL,
    context: TranslationContext | undefined,
    warnings: string[],
    notes: TranslationNotes
  ): string {
    const dqlParts: string[] = [];

    notes.dataSourceMapping.push(
      'Metric -> timeseries command (DQL uses timeseries for metric data instead of fetch)'
    );
    notes.keyDifferences.push(
      'New Relic Metric queries translate to DQL timeseries command. Metric selectors may need adjustment to match Dynatrace metric keys.'
    );

    // Build aggregations for timeseries
    const aggregations: string[] = [];
    for (const agg of parsed.select.aggregations) {
      const dqlAgg = this.translateMetricAggregation(agg, warnings, notes);
      if (dqlAgg) {
        aggregations.push(dqlAgg);
      }
    }

    if (aggregations.length === 0) {
      warnings.push('No valid aggregations found for Metric query');
      aggregations.push('value = avg(metric.value)');
    }

    // Build timeseries command
    let timeseriesCmd = `timeseries ${aggregations.join(', ')}`;

    // Add grouping from FACET
    if (parsed.facet.length > 0) {
      const mappedFacets = parsed.facet.map(f => this.normalizeQuotes(f));
      timeseriesCmd += `, by:{${mappedFacets.join(', ')}}`;
    }

    dqlParts.push(timeseriesCmd);

    // Add filter for WHERE clause (comes after timeseries in DQL)
    if (parsed.where) {
      const translatedWhere = this.translateWhereConditions(
        parsed.where,
        context,
        warnings,
        notes
      );
      dqlParts.push(`| filter ${translatedWhere}`);
    }

    // Add limit if specified
    if (parsed.limit) {
      dqlParts.push(`| limit ${parsed.limit}`);
    }

    let result = dqlParts.join('\n');
    result = this.normalizeQuotes(result);
    return result;
  }

  /**
   * Translate aggregation function for Metric queries
   * Note: DQL timeseries only supports: avg, sum, min, max, count, rate
   */
  private translateMetricAggregation(
    agg: AggregationFunction,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    const funcName = agg.name.toLowerCase();

    // Map NRQL functions to valid DQL timeseries aggregations
    // Valid DQL timeseries aggregations: avg, sum, min, max, count, rate
    const metricFunctionMap: Record<string, { dql: string; warning?: string }> = {
      'latest': {
        dql: 'avg',
        warning: 'latest() converted to avg() - DQL timeseries does not support last(). Consider if avg() provides acceptable results for your use case.',
      },
      'earliest': {
        dql: 'avg',
        warning: 'earliest() converted to avg() - DQL timeseries does not support first(). Consider if avg() provides acceptable results for your use case.',
      },
      'average': { dql: 'avg' },
      'avg': { dql: 'avg' },
      'count': { dql: 'count' },
      'sum': { dql: 'sum' },
      'min': { dql: 'min' },
      'max': { dql: 'max' },
      'rate': { dql: 'rate' },
      'uniquecount': {
        dql: 'count',
        warning: 'uniqueCount() converted to count() - DQL timeseries does not support distinctcount. Consider using a different query approach.',
      },
    };

    const mapping = metricFunctionMap[funcName];
    const dqlFunc = mapping?.dql ?? 'avg';
    const metricSelector = agg.args[0] ?? 'metric.value';
    const alias = agg.alias ?? `${funcName}_value`;

    // Add warning if semantic translation occurred
    if (mapping?.warning) {
      warnings.push(mapping.warning);
    } else if (!mapping) {
      warnings.push(
        `Unknown metric function "${funcName}" - using avg(). Valid DQL timeseries aggregations: avg, sum, min, max, count, rate.`
      );
    }

    // For metrics, the argument is typically a metric selector
    notes.dataModelRequirements.push(
      `Verify metric selector "${metricSelector}" matches Dynatrace metric key format`
    );

    return `${alias} = ${dqlFunc}(${metricSelector})`;
  }

  /**
   * Generate fetch command
   */
  private generateFetch(
    eventTypes: string[],
    context: TranslationContext | undefined,
    notes: TranslationNotes
  ): string {
    // Use first event type for primary fetch
    const primaryType = eventTypes[0].toLowerCase();

    // Check custom mappings first
    if (context?.eventTypeMappings?.[primaryType]) {
      const mapping = context.eventTypeMappings[primaryType];
      notes.dataSourceMapping.push(
        `Custom mapping: ${eventTypes[0]} -> ${mapping.dqlFetch}`
      );
      return mapping.dqlFetch;
    }

    // Use built-in mapping
    const mapping = NRQLToDQLTranslator.EVENT_TYPE_MAP[primaryType];
    if (mapping) {
      notes.dataSourceMapping.push(
        `${eventTypes[0]} -> ${mapping.dqlFetch} (${mapping.notes ?? 'standard mapping'})`
      );
      return mapping.dqlFetch;
    }

    // Default to logs with event type as filter
    const defaultSource = context?.defaultDataSource ?? 'fetch logs';
    notes.dataSourceMapping.push(
      `Unknown event type "${eventTypes[0]}" - using ${defaultSource}. May need manual adjustment.`
    );
    notes.dataModelRequirements.push(
      `Ensure data from New Relic event type "${eventTypes[0]}" is available in Dynatrace.`
    );

    return defaultSource;
  }

  /**
   * Generate filter command
   */
  private generateFilter(
    eventTypes: string[],
    whereClause: string | null,
    context: TranslationContext | undefined,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    const filters: string[] = [];

    // Add event type filter if needed
    const primaryType = eventTypes[0].toLowerCase();
    const mapping =
      context?.eventTypeMappings?.[primaryType] ??
      NRQLToDQLTranslator.EVENT_TYPE_MAP[primaryType];

    if (mapping?.filter) {
      filters.push(mapping.filter);
    } else if (!mapping) {
      // Unknown event type - add as filter attribute
      filters.push(`eventType == "${eventTypes[0]}"`);
    }

    // Add WHERE clause conditions
    if (whereClause) {
      const translatedWhere = this.translateWhereConditions(
        whereClause,
        context,
        warnings,
        notes
      );
      filters.push(translatedWhere);
    }

    if (filters.length === 0) {
      return null;
    }

    return `| filter ${filters.join(' and ')}`;
  }

  /**
   * Normalize quotes to double quotes for DQL
   * Handles single quotes, backticks, and curly/smart quotes
   */
  private normalizeQuotes(str: string): string {
    return str
      .replace(/'/g, '"')     // single quotes
      .replace(/`/g, '"')     // backticks
      .replace(/[\u2018\u2019]/g, '"')  // curly single quotes ' '
      .replace(/[\u201C\u201D]/g, '"'); // curly double quotes " "
  }

  /**
   * Translate WHERE clause conditions to DQL filter syntax
   */
  private translateWhereConditions(
    where: string,
    context: TranslationContext | undefined,
    warnings: string[],
    notes: TranslationNotes
  ): string {
    let result = where;

    // Map field names
    result = this.mapFieldNames(result, context);

    // Convert operators
    result = this.convertOperators(result, warnings, notes);

    // Normalize quotes to double quotes (DQL requirement)
    result = this.normalizeQuotes(result);

    return result;
  }

  /**
   * Map field names from NRQL to DQL
   */
  private mapFieldNames(expr: string, context: TranslationContext | undefined): string {
    let result = expr;

    // Apply custom field mappings
    if (context?.fieldMappings) {
      for (const [nrField, dtField] of Object.entries(context.fieldMappings)) {
        // Use negative lookbehind for dot to avoid matching partial field paths
        const regex = new RegExp(`(?<!\\.)\\b${this.escapeRegex(nrField)}\\b`, 'g');
        result = result.replace(regex, dtField);
      }
    }

    // Standard field mappings (expanded from reference project)
    // Note: Order matters - more specific mappings (with dots) should come first
    const standardMappings: Record<string, string> = {
      // Dotted fields first (more specific)
      'service.name': 'service.name',  // preserve as-is
      'span.kind': 'span.kind',        // preserve as-is
      'http.method': 'http.request.method',
      'http.url': 'http.url',
      'http.statusCode': 'http.status_code',
      'error.class': 'error.type',
      'error.message': 'error.message',
      'log.message': 'content',
      'log.level': 'loglevel',
      'request.uri': 'http.route',
      'request.method': 'http.request.method',
      'response.status': 'http.status_code',
      // Simple fields (less specific) - use negative lookbehind for dot
      'timestamp': 'timestamp',
      'duration': 'response_time',
      'totalTime': 'response_time',
      'webDuration': 'response_time',
      'databaseDuration': 'db.response_time',
      'externalDuration': 'external.response_time',
      'transactionName': 'span.name',
      'host': 'host.name',
      'hostname': 'host.name',
      'appName': 'service.name',
      'appId': 'dt.entity.service',
      'entityGuid': 'dt.entity.service',
      'errorMessage': 'error.message',
      'errorType': 'error.type',
      'httpResponseCode': 'http.status_code',
      'message': 'content',
      'level': 'loglevel',
      'severity': 'loglevel',
    };

    for (const [nrField, dtField] of Object.entries(standardMappings)) {
      // Use negative lookbehind for dot to avoid matching "name" in "service.name"
      const regex = new RegExp(`(?<!\\.)\\b${this.escapeRegex(nrField)}\\b`, 'g');
      result = result.replace(regex, dtField);
    }

    return result;
  }

  /**
   * Convert NRQL operators to DQL syntax
   */
  private convertOperators(
    expr: string,
    _warnings: string[],
    notes: TranslationNotes
  ): string {
    let result = expr;

    // LIKE -> matchesValue or contains
    if (/\bLIKE\b/i.test(result)) {
      result = this.convertLikeOperator(result, notes);
    }

    // IN -> in() with DQL array() function
    result = result.replace(
      /(\w+)\s+IN\s*\(([^)]+)\)/gi,
      (_, field, values) => {
        const valueList = values
          .split(',')
          .map((v: string) => v.trim())
          .join(', ');
        return `in(${field}, array(${valueList}))`;
      }
    );

    // NOT IN -> NOT in() with DQL array() function
    result = result.replace(
      /(\w+)\s+NOT\s+IN\s*\(([^)]+)\)/gi,
      (_, field, values) => {
        const valueList = values
          .split(',')
          .map((v: string) => v.trim())
          .join(', ');
        return `NOT in(${field}, array(${valueList}))`;
      }
    );

    // IS NULL -> isNull()
    result = result.replace(/(\w+)\s+IS\s+NULL/gi, 'isNull($1)');

    // IS NOT NULL -> isNotNull()
    result = result.replace(/(\w+)\s+IS\s+NOT\s+NULL/gi, 'isNotNull($1)');

    // DQL uses == instead of = for equality
    // Use negative lookbehind/lookahead to avoid modifying !=, ==, <=, >=
    result = result.replace(/(?<![!=<>])=(?!=)/g, '==');

    // AND/OR stay the same but lowercase
    result = result.replace(/\bAND\b/gi, 'and');
    result = result.replace(/\bOR\b/gi, 'or');
    result = result.replace(/\bNOT\b/gi, 'NOT');

    return result;
  }

  /**
   * Convert LIKE operator to DQL equivalent
   */
  private convertLikeOperator(expr: string, notes: TranslationNotes): string {
    let result = expr;

    // Simple patterns with % wildcards
    result = result.replace(
      /(\w+)\s+LIKE\s+['"]%([^%'"]+)%['"]/gi,
      'contains($1, "$2")'
    );

    // Starts with pattern
    result = result.replace(
      /(\w+)\s+LIKE\s+['"]([^%'"]+)%['"]/gi,
      'startsWith($1, "$2")'
    );

    // Ends with pattern
    result = result.replace(
      /(\w+)\s+LIKE\s+['"]%([^%'"]+)['"]/gi,
      'endsWith($1, "$2")'
    );

    // Complex patterns - use matchesValue
    result = result.replace(
      /(\w+)\s+LIKE\s+['"](.+?)['"]/gi,
      (_match, field, pattern) => {
        // Convert SQL LIKE pattern to regex
        const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
        notes.keyDifferences.push(
          `LIKE pattern converted to regex: "${pattern}" -> "${regexPattern}"`
        );
        return `matchesValue(${field}, "${regexPattern}")`;
      }
    );

    // NOT LIKE
    result = result.replace(
      /(\w+)\s+NOT\s+LIKE\s+['"](.+?)['"]/gi,
      (_match, field, pattern) => {
        const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
        return `NOT matchesValue(${field}, "${regexPattern}")`;
      }
    );

    return result;
  }

  /**
   * Generate summarize command for aggregations
   */
  private generateSummarize(
    select: SelectClause,
    facet: string[],
    warnings: string[],
    notes: TranslationNotes
  ): string {
    const aggregations: string[] = [];

    for (const agg of select.aggregations) {
      const dqlAgg = this.translateAggregation(agg, warnings, notes);
      if (dqlAgg) {
        aggregations.push(dqlAgg);
      }
    }

    if (aggregations.length === 0) {
      warnings.push('No valid aggregations found');
      return '| summarize count()';
    }

    let cmd = `| summarize ${aggregations.join(', ')}`;

    // Add FACET as by:{}
    if (facet.length > 0) {
      const mappedFacets = facet.map(f => this.mapFieldNames(f, undefined));
      cmd += `, by:{${mappedFacets.join(',')}}`;
      notes.keyDifferences.push(
        'NRQL FACET clause maps to DQL by:{} syntax in summarize command'
      );
    }

    return cmd;
  }

  /**
   * Translate a single aggregation function
   */
  private translateAggregation(
    agg: AggregationFunction,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    const funcName = agg.name.toLowerCase();

    // Handle arithmetic expressions containing aggregations
    if (funcName === '_arithmetic_') {
      const expr = agg.args[0];
      const alias = agg.alias ?? 'result';

      // Extract the aggregation function from the arithmetic expression
      // e.g., "max(memoryUsedBytes)/1000000" -> extract max(memoryUsedBytes)
      const aggMatch = expr.match(/\b(count|sum|avg|average|min|max|uniquecount|percentile|latest|earliest|uniques|median)\s*\([^)]+\)/i);

      if (aggMatch) {
        // aggMatch[0] is the full match, aggMatch[1] is the function name
        const aggFunc = aggMatch[1].toLowerCase();
        const dqlFunc = NRQLToDQLTranslator.FUNCTION_MAP[aggFunc]?.dql ?? aggFunc;

        // Replace the NRQL function with DQL function in the expression
        let dqlExpr = expr.replace(new RegExp(`\\b${aggMatch[1]}\\b`, 'i'), dqlFunc);

        // Generate with alias
        notes.keyDifferences.push(
          `Arithmetic expression "${agg.original}" translated inline. For complex expressions, consider using fieldsAdd for clarity.`
        );

        return `${alias} = ${dqlExpr}`;
      }

      // Fallback: pass through as-is with warning
      warnings.push(`Could not parse arithmetic expression: ${expr}`);
      return `${alias} = ${expr}`;
    }

    // Check for unsupported functions
    if (NRQLToDQLTranslator.UNSUPPORTED_FUNCTIONS[funcName]) {
      warnings.push(
        `Unsupported function "${agg.name}": ${NRQLToDQLTranslator.UNSUPPORTED_FUNCTIONS[funcName]}`
      );
      return null;
    }

    // Get mapping
    const mapping = NRQLToDQLTranslator.FUNCTION_MAP[funcName];
    if (!mapping) {
      warnings.push(`Unknown function "${agg.name}" - passing through as-is`);
      const args = agg.args.length > 0 ? `(${agg.args.join(', ')})` : '()';
      return agg.alias
        ? `${agg.alias} = ${agg.name}${args}`
        : `${agg.name}${args}`;
    }

    if (mapping.notes) {
      notes.keyDifferences.push(mapping.notes);
    }

    // Build DQL function call
    let dqlFunc: string;

    // Special handling for specific functions
    if (funcName === 'count' && (agg.args.length === 0 || agg.args[0] === '*')) {
      dqlFunc = 'count()';
    } else if (funcName === 'median') {
      // median -> percentile(field, 50)
      const field = agg.args[0] ?? '*';
      dqlFunc = `percentile(${field}, 50)`;
    } else if (funcName === 'percentile') {
      // percentile(field, n) stays the same
      dqlFunc = `percentile(${agg.args.join(', ')})`;
    } else {
      // Standard mapping
      const args = agg.args.length > 0 ? `(${agg.args.join(', ')})` : '()';
      dqlFunc = `${mapping.dql}${args}`;
    }

    // Add alias
    if (agg.alias) {
      return `${agg.alias} = ${dqlFunc}`;
    }

    // Generate default alias from function name
    const defaultAlias =
      funcName === 'count' ? 'count' : `${funcName}_${agg.args[0] ?? 'value'}`;
    return `${defaultAlias} = ${dqlFunc}`;
  }

  /**
   * Generate makeTimeseries command for time series queries
   */
  private generateTimeseries(
    select: SelectClause,
    facet: string[],
    timeseries: TimeseriesClause,
    warnings: string[],
    notes: TranslationNotes
  ): string {
    // Convert interval
    const dqlUnit = NRQLToDQLTranslator.TIME_UNIT_MAP[timeseries.unit] ?? 'm';
    const interval = `${timeseries.value}${dqlUnit}`;

    // Build aggregations
    const aggregations: string[] = [];
    for (const agg of select.aggregations) {
      const dqlAgg = this.translateAggregation(agg, warnings, notes);
      if (dqlAgg) {
        aggregations.push(dqlAgg);
      }
    }

    if (aggregations.length === 0) {
      aggregations.push('count = count()');
    }

    let cmd = `| makeTimeseries ${aggregations.join(', ')}, interval:${interval}`;

    // Add grouping
    if (facet.length > 0) {
      const mappedFacets = facet.map(f => this.mapFieldNames(f, undefined));
      cmd += `, by:{${mappedFacets.join(',')}}`;
    }

    notes.keyDifferences.push(
      `NRQL TIMESERIES ${timeseries.original} maps to DQL makeTimeseries with interval:${interval}`
    );

    return cmd;
  }

  /**
   * Generate sort command
   */
  private generateSort(orderBy: OrderByClause): string {
    const direction = orderBy.direction.toLowerCase();
    return `| sort ${orderBy.field} ${direction}`;
  }

  // ==========================================================================
  // Confidence Calculation
  // ==========================================================================

  /**
   * Calculate translation confidence level
   */
  private calculateConfidence(
    parsed: ParsedNRQL,
    warnings: string[]
  ): 'high' | 'medium' | 'low' {
    let score = 100;

    // Deduct for warnings
    score -= warnings.length * 10;

    // Deduct for unsupported features
    if (parsed.compareWith) score -= 20;
    if (parsed.timezone) score -= 5;

    // Deduct for complex queries
    if (parsed.select.aggregations.length > 3) score -= 5;
    if (parsed.facet.length > 3) score -= 5;

    // Deduct for unknown event types
    const primaryType = parsed.from[0].toLowerCase();
    if (!NRQLToDQLTranslator.EVENT_TYPE_MAP[primaryType]) {
      score -= 15;
    }

    // Determine confidence level
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  // ==========================================================================
  // Notes Generation
  // ==========================================================================

  /**
   * Generate additional notes for the translation
   */
  private generateNotes(
    parsed: ParsedNRQL,
    notes: TranslationNotes,
    _warnings: string[]
  ): void {
    // Performance considerations
    if (parsed.select.aggregations.length > 5) {
      notes.performanceConsiderations.push(
        'Query contains many aggregations. Consider splitting into multiple queries for better performance.'
      );
    }

    if (parsed.facet.length > 5) {
      notes.performanceConsiderations.push(
        'High cardinality grouping (many FACET fields). May impact query performance.'
      );
    }

    // Testing recommendations
    notes.testingRecommendations.push(
      'Verify the DQL query returns expected results with sample data'
    );

    if (parsed.timeseries) {
      notes.testingRecommendations.push(
        'Validate time series interval produces expected number of data points'
      );
    }

    if (parsed.select.aggregations.some(a =>
      ['percentile', 'median', 'uniquecount'].includes(a.name.toLowerCase())
    )) {
      notes.testingRecommendations.push(
        'Statistical aggregations may show slight differences due to sampling methods. Validate with representative data.'
      );
    }

    // Data model requirements
    if (parsed.from.length > 1) {
      notes.dataModelRequirements.push(
        `Query references multiple event types (${parsed.from.join(', ')}). Ensure all data sources are available in Dynatrace.`
      );
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
