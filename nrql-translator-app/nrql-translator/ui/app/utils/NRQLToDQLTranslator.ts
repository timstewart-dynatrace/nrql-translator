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
    'uniquecount': { dql: 'countDistinctExact', notes: 'uniqueCount maps to countDistinctExact for exact cardinality' },
    'percentile': { dql: 'percentile' },
    'latest': { dql: 'takeLast', notes: 'latest() maps to takeLast() - takes last value by ingest order' },
    'earliest': { dql: 'takeFirst', notes: 'earliest() maps to takeFirst() - takes first value by ingest order' },
    'uniques': { dql: 'collectDistinct' },
    'median': { dql: 'percentile', notes: 'median converted to percentile(field, 50)' },
    'stddev': { dql: 'stddev', notes: 'stddev() is natively supported in DQL' },
  };

  /**
   * Unsupported functions that require manual handling
   */
  private static readonly UNSUPPORTED_FUNCTIONS: Record<string, string> = {
    'histogram': 'Histogram requires manual implementation using summarize with bin() grouping',
    'funnel': 'Funnel analysis requires decomposition into sequential countIf() steps',
    'apdex': 'Apdex requires decomposition: (countIf(duration < T) + countIf(duration >= T and duration < 4T) * 0.5) / count()',
    'bytecountestimate': 'bytecountestimate() has no DQL equivalent. Consider using data volume metrics instead.',
  };

  /**
   * Event type to DQL data source mapping
   */
  private static readonly EVENT_TYPE_MAP: Record<string, EventTypeMapping> = {
    'transaction': {
      eventType: 'Transaction',
      dqlFetch: 'fetch spans',
      notes: 'APM transaction data maps to distributed tracing spans',
    },
    'transactionerror': {
      eventType: 'TransactionError',
      dqlFetch: 'fetch spans',
      filter: 'error == true',
      notes: 'APM error data - spans with error flag',
    },
    'log': {
      eventType: 'Log',
      dqlFetch: 'fetch logs',
      notes: 'Log data',
    },
    'logevent': {
      eventType: 'LogEvent',
      dqlFetch: 'fetch logs',
      notes: 'Log event data',
    },
    'metric': {
      eventType: 'Metric',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Metric data - uses timeseries command instead of fetch',
    },
    'pageview': {
      eventType: 'PageView',
      dqlFetch: 'fetch bizevents',
      notes: 'Browser/RUM page view data maps to business events',
    },
    'pageaction': {
      eventType: 'PageAction',
      dqlFetch: 'fetch bizevents',
      notes: 'Browser/RUM user action data maps to business events',
    },
    'browserinteraction': {
      eventType: 'BrowserInteraction',
      dqlFetch: 'fetch spans',
      notes: 'Browser interaction data maps to spans',
    },
    'syntheticcheck': {
      eventType: 'SyntheticCheck',
      dqlFetch: 'fetch bizevents',
      notes: 'Synthetic monitoring data maps to business events',
    },
    'syntheticrequest': {
      eventType: 'SyntheticRequest',
      dqlFetch: 'fetch bizevents',
      notes: 'Synthetic request data maps to business events',
    },
    'systemsample': {
      eventType: 'SystemSample',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Infrastructure host metrics - uses timeseries command',
    },
    'processsample': {
      eventType: 'ProcessSample',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Infrastructure process metrics - uses timeseries command',
    },
    'networksample': {
      eventType: 'NetworkSample',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Infrastructure network metrics - uses timeseries command',
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
    'infrastructureevent': {
      eventType: 'InfrastructureEvent',
      dqlFetch: 'fetch events',
      notes: 'Infrastructure events',
    },
    'nraiincident': {
      eventType: 'NrAiIncident',
      dqlFetch: 'fetch bizevents',
      notes: 'Alert/incident data maps to business events',
    },
    'k8spodsample': {
      eventType: 'K8sPodSample',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Kubernetes pod metrics - uses timeseries with dt.kubernetes.pod.* metrics',
    },
    'k8scontainersample': {
      eventType: 'K8sContainerSample',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Kubernetes container metrics - uses timeseries with dt.kubernetes.container.* metrics',
    },
    'k8snodesample': {
      eventType: 'K8sNodeSample',
      dqlFetch: 'fetch dt.metrics',
      notes: 'Kubernetes node metrics - uses timeseries with dt.kubernetes.node.* metrics',
    },
    'ajaxrequest': {
      eventType: 'AjaxRequest',
      dqlFetch: 'fetch bizevents',
      notes: 'Browser AJAX request data maps to business events',
    },
  };

  /** Confidence score threshold for 'high' confidence */
  private static readonly CONFIDENCE_HIGH_THRESHOLD = 80;
  /** Confidence score threshold for 'medium' confidence */
  private static readonly CONFIDENCE_MEDIUM_THRESHOLD = 50;

  /**
   * Standard field name mappings from NRQL to DQL.
   * Order matters: more specific mappings (with dots) come first.
   */
  private static readonly FIELD_MAP: Record<string, string> = {
    // Dotted fields first (more specific)
    'service.name': 'service.name',
    'span.kind': 'span.kind',
    'entity.name': 'dt.entity.name',
    'entity.guid': 'entity.guid',
    'http.method': 'http.request.method',
    'http.url': 'http.request.url',
    'http.target': 'http.target',
    'http.statusCode': 'http.response.status_code',
    'http.status_code': 'http.response.status_code',
    'error.class': 'error.type',
    'error.message': 'error.message',
    'log.message': 'content',
    'log.level': 'loglevel',
    'request.uri': 'http.route',
    'request.method': 'http.request.method',
    'response.status': 'http.response.status_code',
    'parent.id': 'span.parent_id',
    'trace.id': 'trace_id',
    'db.name': 'db.name',
    'db.system': 'db.system',
    'db.statement': 'db.statement',
    'server.address': 'server.address',
    'db.namespace': 'db.namespace',
    // Simple fields (less specific)
    'timestamp': 'timestamp',
    'duration': 'duration',
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
    'httpResponseCode': 'http.response.status_code',
    'cpuPercent': 'host.cpu.usage',
    'memoryUsedPercent': 'host.mem.usage',
    'memoryUsedBytes': 'host.mem.used',
    'diskUsedPercent': 'host.disk.usage',
    'message': 'message',
    'level': 'loglevel',
    'severity': 'loglevel',
    // Kubernetes fields
    'k8s.clusterName': 'k8s.cluster.name',
    'k8s.containerName': 'k8s.container.name',
    'k8s.podName': 'k8s.pod.name',
    'k8s.namespaceName': 'k8s.namespace.name',
    'k8s.nodeName': 'k8s.node.name',
    'k8s.deploymentName': 'k8s.deployment.name',
    'k8s.daemonSetName': 'k8s.daemonset.name',
    'k8s.replicaSetName': 'k8s.replicaset.name',
    'k8s.statefulSetName': 'k8s.statefulset.name',
    'k8s.containerId': 'k8s.container.id',
    'k8s.podId': 'k8s.pod.uid',
    'k8s.namespaceId': 'k8s.namespace.uid',
    'clusterName': 'k8s.cluster.name',
    'containerName': 'k8s.container.name',
    'podName': 'k8s.pod.name',
    'namespaceName': 'k8s.namespace.name',
    'nodeName': 'k8s.node.name',
    // Kubernetes container metrics
    'k8s.container.cpuUsedCores': 'dt.kubernetes.container.cpu_usage',
    'k8s.container.memoryUsedBytes': 'dt.kubernetes.container.memory_usage',
    'k8s.container.restartCount': 'dt.kubernetes.container.restarts',
    // Browser/RUM fields
    'requestUrl': 'http.request.url',
    'jobName': 'k8s.job.name',
  };

  /**
   * Known aggregation function names for detection in expressions
   */
  private static readonly AGG_FUNCTIONS = [
    'count', 'sum', 'avg', 'average', 'min', 'max', 'uniquecount',
    'percentile', 'latest', 'earliest', 'uniques', 'median',
    'stddev', 'rate', 'percentage', 'cdfpercentage', 'histogram',
    'funnel', 'apdex', 'bytecountestimate', 'filter',
  ];

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

  /**
   * Parse a time expression like "1 week ago" or "7 days ago" and return DQL duration components
   * Returns { value: number, unit: string, dqlDuration: string } or null if unparseable
   */
  private parseTimeExpression(
    timeExpr: string
  ): { value: number; unit: string; dqlDuration: string; totalHours: number } | null {
    // Match patterns like "1 week ago", "7 days ago", "24 hours ago"
    const match = timeExpr.match(/(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks)\s*ago/i);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const dqlUnit = NRQLToDQLTranslator.TIME_UNIT_MAP[unit] ?? 'h';
    const dqlDuration = `${value}${dqlUnit}`;

    // Calculate total hours for offset calculation
    const hoursMultiplier: Record<string, number> = {
      's': 1 / 3600,
      'm': 1 / 60,
      'h': 1,
      'd': 24,
      'w': 168,
    };
    const totalHours = value * (hoursMultiplier[dqlUnit] ?? 1);

    return { value, unit, dqlDuration, totalHours };
  }

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
      slideBy: this.parseSlideByClause(normalized),
    };
  }

  /**
   * Normalize query for parsing (handle case, whitespace, comments, backtick identifiers)
   */
  private normalizeQuery(nrql: string): string {
    // Strip NRQL line comments (-- to end of line)
    let result = nrql.replace(/--.*$/gm, '');
    // Strip backtick quoting from identifiers (NRQL uses backticks for field names)
    result = result.replace(/`/g, '');
    return result.trim().replace(/\s+/g, ' ');
  }

  /**
   * Parse SELECT clause
   * Handles both "SELECT ... FROM" and "FROM ... SELECT" orderings
   */
  private parseSelectClause(nrql: string): SelectClause {
    let selectContent: string;

    // Check if query starts with FROM (FROM ... SELECT pattern)
    if (/^\s*FROM\s+/i.test(nrql)) {
      // Use depth-aware keyword search to avoid matching WHERE inside filter() args
      const selectIdx = this.findClauseKeyword(nrql, 'SELECT');
      if (selectIdx === -1) {
        throw new Error('Invalid NRQL: Missing SELECT clause after FROM');
      }
      const afterSelect = nrql.substring(selectIdx + 6).trim(); // 6 = 'SELECT'.length
      const stopKeywords = ['WHERE', 'FACET', 'TIMESERIES', 'SINCE', 'UNTIL', 'LIMIT',
                            'ORDER BY', 'COMPARE WITH', 'WITH TIMEZONE', 'SLIDE BY'];
      selectContent = this.extractUntilClauseKeyword(afterSelect, stopKeywords);
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
    const aggFunctions = NRQLToDQLTranslator.AGG_FUNCTIONS;

    // Check if this is an arithmetic expression containing an aggregation
    // Pattern 1: (expr) [OP value] [AS alias] (with outer parens)
    if (part.startsWith('(')) {
      // Find matching closing paren using depth tracking
      let parenDepth = 1;
      let closeIdx = 1;
      for (let i = 1; i < part.length; i++) {
        if (part[i] === '(') parenDepth++;
        else if (part[i] === ')') parenDepth--;
        if (parenDepth === 0) { closeIdx = i; break; }
      }

      if (parenDepth === 0) {
        const innerExpr = part.substring(1, closeIdx);
        const afterParen = part.substring(closeIdx + 1).trim();

        // Check if innerExpr contains any aggregation function
        const hasAggregation = aggFunctions.some(fn =>
          new RegExp(`\\b${fn}\\s*\\(`, 'i').test(innerExpr)
        );

        if (hasAggregation) {
          // Extract optional alias and arithmetic suffix (e.g., "* 100 AS 'Error %'")
          let alias: string | null = null;
          let arithmeticSuffix = '';

          if (afterParen.length > 0) {
            const asIdx = this.findClauseKeyword(afterParen, 'AS');
            if (asIdx !== -1) {
              alias = afterParen.substring(asIdx + 2).trim().replace(/^['"]|['"]$/g, '');
              arithmeticSuffix = afterParen.substring(0, asIdx).trim();
            } else {
              arithmeticSuffix = afterParen;
            }
          }

          const fullExpr = arithmeticSuffix
            ? `(${innerExpr}) ${arithmeticSuffix}`
            : innerExpr;

          return {
            name: '_arithmetic_',
            args: [fullExpr],
            alias,
            original: part,
          };
        }
      }
    }

    // Pattern 2: aggFunc(field) operator value AS alias (without outer parens)
    // e.g., average(duration.ms)/1000, max(bytes)*100 AS scaled
    const arithmeticNoParensMatch = part.match(
      /^(\w+)\s*\(([^)]+)\)\s*([+\-*/])\s*(\d+(?:\.\d+)?)\s*(?:AS\s+['"]?(.+?)['"]?)?$/i
    );
    if (arithmeticNoParensMatch) {
      const [, funcName, funcArgs, operator, operand, alias] = arithmeticNoParensMatch;
      const funcLower = funcName.toLowerCase();

      // Check if it's an aggregation function
      if (aggFunctions.includes(funcLower)) {
        const expr = `${funcName}(${funcArgs})${operator}${operand}`;
        return {
          name: '_arithmetic_',
          args: [expr],
          alias: alias?.replace(/['"]/g, '') ?? null,
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
    } else if (afterFunc.length > 0 && !afterFunc.match(/^AS\s/i)) {
      // Content after function isn't an alias — check for arithmetic operator
      const opMatch = afterFunc.match(/^[+\-*/]/);
      if (opMatch) {
        // Arithmetic expression: func(...) OP rest [AS alias]
        let arithmeticAlias: string | null = null;
        let fullExpr = part;

        // Find AS at depth 0 in afterFunc for the alias
        const asIdx = this.findClauseKeyword(afterFunc, 'AS');
        if (asIdx !== -1) {
          const afterAs = afterFunc.substring(asIdx + 2).trim();
          arithmeticAlias = afterAs.replace(/^['"]|['"]$/g, '');
          fullExpr = (part.substring(0, endIdx + 1) + ' ' + afterFunc.substring(0, asIdx)).trim();
        }

        return {
          name: '_arithmetic_',
          args: [fullExpr],
          alias: arithmeticAlias,
          original: part,
        };
      }
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
   * Split function arguments by comma, respecting nested parentheses.
   * Delegates to splitSelectParts which has identical logic.
   */
  private splitArgsRespectingParens(argsStr: string): string[] {
    return this.splitSelectParts(argsStr);
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
   * Only matches WHERE at depth 0 (not inside parentheses like CASES(where ...))
   */
  private parseWhereClause(nrql: string): string | null {
    const fromMatch = nrql.match(/\bFROM\s+\w+/i);
    if (!fromMatch) {
      return null;
    }

    const afterFrom = nrql.substring(fromMatch.index! + fromMatch[0].length);

    // Find WHERE keyword at depth 0 (not inside function calls or CASES)
    const whereIdx = this.findClauseKeyword(afterFrom, 'WHERE');
    if (whereIdx === -1) return null;

    // Extract content after WHERE until next clause keyword at depth 0
    const afterWhere = afterFrom.substring(whereIdx + 5).trim(); // 5 = 'WHERE'.length
    const stopKeywords = ['FACET', 'TIMESERIES', 'SINCE', 'UNTIL', 'LIMIT', 'ORDER BY', 'COMPARE WITH', 'WITH TIMEZONE', 'SLIDE BY'];
    const content = this.extractUntilClauseKeyword(afterWhere, stopKeywords);

    return content || null;
  }

  /**
   * Parse FACET clause
   * Note: NRQL allows flexible clause ordering (FACET can come before or after WHERE)
   * Uses depth-aware keyword search and paren-aware splitting for CASES()
   */
  private parseFacetClause(nrql: string): string[] {
    // Find FACET at depth 0
    const facetIdx = this.findClauseKeyword(nrql, 'FACET');
    if (facetIdx === -1) return [];

    // Extract content after FACET until next clause keyword at depth 0
    const afterFacet = nrql.substring(facetIdx + 5).trim(); // 5 = 'FACET'.length
    const stopKeywords = ['WHERE', 'TIMESERIES', 'SINCE', 'UNTIL', 'LIMIT', 'ORDER BY', 'COMPARE WITH', 'WITH TIMEZONE', 'SLIDE BY'];
    const content = this.extractUntilClauseKeyword(afterFacet, stopKeywords);

    if (!content) return [];

    // Use paren-aware splitting to handle CASES(...) and if(...) in FACET
    return this.splitSelectParts(content);
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
   * Handles LIMIT <number> and LIMIT MAX (no limit)
   */
  private parseLimitClause(nrql: string): number | null {
    // Check for LIMIT MAX first (means no limit)
    if (/LIMIT\s+MAX/i.test(nrql)) {
      return null;
    }
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
    const compareMatch = nrql.match(/COMPARE\s+WITH\s+(.*?)(?=\s+(?:WITH\s+TIMEZONE|SLIDE\s+BY|TIMESERIES)\s|$)/i);
    return compareMatch ? compareMatch[1].trim() : null;
  }

  /**
   * Parse WITH TIMEZONE clause
   */
  private parseTimezoneClause(nrql: string): string | null {
    const tzMatch = nrql.match(/WITH\s+TIMEZONE\s+['"]?(.+?)['"]?$/i);
    return tzMatch ? tzMatch[1].trim() : null;
  }

  /**
   * Parse SLIDE BY clause
   * SLIDE BY creates overlapping time windows (not supported in DQL)
   */
  private parseSlideByClause(nrql: string): string | null {
    const slideMatch = nrql.match(/SLIDE\s+BY\s+(\d+\s+\w+)/i);
    return slideMatch ? slideMatch[1].trim() : null;
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
        context,
        warnings,
        notes
      );
      dqlParts.push(timeseriesCmd);
    } else if (parsed.select.aggregations.length > 0) {
      // Aggregation query
      const summarizeCmd = this.generateSummarize(
        parsed.select,
        parsed.facet,
        context,
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

    // Step 6: Handle COMPARE WITH using append pattern
    if (parsed.compareWith) {
      const compareTime = this.parseTimeExpression(parsed.compareWith);
      const sinceTime = parsed.since ? this.parseTimeExpression(parsed.since) : null;

      if (compareTime) {
        // Calculate time windows
        const currentWindow = sinceTime?.dqlDuration ?? '1d';
        const currentWindowHours = sinceTime?.totalHours ?? 24;
        const compareOffsetHours = compareTime.totalHours;

        // Build the append query with time-shifted timestamps
        const fetchCmd = this.generateFetch(parsed.from, context, notes);
        const filterCmd = this.generateFilter(parsed.from, parsed.where, context, warnings, notes);

        // Generate aggregations with "previous_" prefix
        const previousAggregations: string[] = [];
        for (const agg of parsed.select.aggregations) {
          const dqlAgg = this.translateAggregation(agg, warnings, notes);
          if (dqlAgg) {
            // Prefix alias with "previous_"
            const prefixedAgg = dqlAgg.replace(/^(\w+)\s*=/, 'previous_$1 =');
            previousAggregations.push(prefixedAgg);
          }
        }

        // Rename current aggregations to "current_" prefix
        const renamedParts = dqlParts.map((part) => {
          if (part.startsWith('| summarize') || part.startsWith('| makeTimeseries')) {
            // Add "current_" prefix to aggregation aliases
            // Use lookbehind/lookahead to avoid matching ==, >=, <=, !=
            return part.replace(/(\w+)\s*(?<![=!<>])=(?!=)/g, 'current_$1 =');
          }
          return part;
        });

        // Build append subquery
        const appendParts: string[] = [];
        appendParts.push(`  ${fetchCmd}, from:-${compareOffsetHours + currentWindowHours}h, to:-${compareOffsetHours}h`);
        if (filterCmd) {
          appendParts.push(`  ${filterCmd}`);
        }
        appendParts.push(`  | fieldsAdd timestamp = timestamp + ${compareOffsetHours}h`);

        // Process FACET fields for append block (handles CASES, field mapping)
        let appendByClause = '';
        if (parsed.facet.length > 0) {
          const { facetFields, fieldsAddCmds } = this.processFacetFields(
            parsed.facet, context, warnings, notes
          );
          // Insert fieldsAdd commands before the aggregation
          for (const cmd of fieldsAddCmds) {
            appendParts.push(`  ${cmd}`);
          }
          if (facetFields.length > 0) {
            appendByClause = `, by:{${facetFields.join(', ')}}`;
          }
        }

        if (parsed.timeseries) {
          const dqlUnit = NRQLToDQLTranslator.TIME_UNIT_MAP[parsed.timeseries.unit] ?? 'm';
          const interval = `${parsed.timeseries.value}${dqlUnit}`;
          appendParts.push(
            `  | makeTimeseries ${previousAggregations.join(', ')}, interval:${interval}${appendByClause}, from:-${currentWindow}, to:now()`
          );
        } else {
          appendParts.push(`  | summarize ${previousAggregations.join(', ')}${appendByClause}`);
        }

        // Add time range to current query
        renamedParts[0] = `${renamedParts[0]}, from:-${currentWindow}`;

        // Combine current query with append
        let result = renamedParts.join('\n');
        result += '\n| append [\n';
        result += appendParts.join('\n');
        result += '\n]';

        notes.keyDifferences.push(
          `COMPARE WITH ${parsed.compareWith} translated using DQL append pattern with time-shifted timestamps.`
        );

        result = this.normalizeQuotes(result);
        return result;
      } else {
        // Couldn't parse compare time, fall back to warning
        warnings.push(
          `COMPARE WITH clause could not be automatically translated. Original: COMPARE WITH ${parsed.compareWith}`
        );
        notes.keyDifferences.push(
          'Use append command to overlay queries from different time periods. See docs/LESSONS_LEARNED.md for pattern.'
        );
      }
    }

    if (parsed.slideBy) {
      warnings.push(
        `SLIDE BY ${parsed.slideBy} is not supported in DQL makeTimeseries. The query uses non-overlapping intervals instead.`
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

    // Collect all fields for by:{} clause
    // DQL timeseries requires filter fields to be in the by:{} clause
    // Fields must be mapped to Dynatrace names to match the filter clause
    const byFields = new Set<string>();

    // Add FACET fields - apply field mapping so they match filter clause
    for (const f of parsed.facet) {
      const cleanField = f.replace(/[`'"]/g, '');
      const mappedField = this.mapFieldNames(cleanField, context);
      byFields.add(mappedField);
    }

    // Extract and add fields from WHERE clause
    // DQL timeseries can only filter on dimensions in the by:{} clause
    // Apply field mapping so by:{} fields match the filter clause
    if (parsed.where) {
      const whereFields = this.extractFieldsFromWhere(parsed.where);
      for (const field of whereFields) {
        const mappedField = this.mapFieldNames(field, context);
        byFields.add(mappedField);
      }
    }

    // Add grouping with all collected fields
    if (byFields.size > 0) {
      timeseriesCmd += `, by:{${Array.from(byFields).join(', ')}}`;
      if (parsed.where) {
        notes.keyDifferences.push(
          'DQL timeseries requires filter dimensions in by:{} clause. WHERE fields automatically added to grouping.'
        );
      }
    }

    dqlParts.push(timeseriesCmd);

    // Add filter for WHERE clause (comes after timeseries in DQL)
    // Note: filter clause DOES need proper quoting for string values
    if (parsed.where) {
      const translatedWhere = this.translateWhereConditions(
        parsed.where,
        context,
        warnings,
        notes
      );
      // Normalize quotes only for the filter clause (string values need double quotes)
      dqlParts.push(`| filter ${this.normalizeQuotes(translatedWhere)}`);
    }

    // Add limit if specified
    if (parsed.limit) {
      dqlParts.push(`| limit ${parsed.limit}`);
    }

    return dqlParts.join('\n');
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
        warning: 'latest() converted to avg() - DQL timeseries does not support takeLast(). Consider if avg() provides acceptable results for your use case.',
      },
      'earliest': {
        dql: 'avg',
        warning: 'earliest() converted to avg() - DQL timeseries does not support takeFirst(). Consider if avg() provides acceptable results for your use case.',
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
    const rawMetricSelector = agg.args[0] ?? 'metric.value';
    // DQL timeseries metric keys must NOT be quoted - strip all quotes (backticks, single, double)
    const metricSelector = rawMetricSelector.replace(/[`'"]/g, '');
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

    // Convert ago() time function: ago(7 days) → now() - 7d
    result = result.replace(/\bago\s*\(\s*(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days|week|weeks)\s*\)/gi,
      (_match, value, unit) => {
        const dqlUnit = NRQLToDQLTranslator.TIME_UNIT_MAP[unit.toLowerCase()] ?? 'h';
        return `now() - ${value}${dqlUnit}`;
      }
    );

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

    for (const [nrField, dtField] of Object.entries(NRQLToDQLTranslator.FIELD_MAP)) {
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
    // Field pattern includes dots to support dotted field names like entity.guid
    result = result.replace(
      /([a-zA-Z_][a-zA-Z0-9_.]*)\s+IN\s*\(([^)]+)\)/gi,
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
      /([a-zA-Z_][a-zA-Z0-9_.]*)\s+NOT\s+IN\s*\(([^)]+)\)/gi,
      (_, field, values) => {
        const valueList = values
          .split(',')
          .map((v: string) => v.trim())
          .join(', ');
        return `NOT in(${field}, array(${valueList}))`;
      }
    );

    // IS TRUE -> field == true
    result = result.replace(/(\w[\w.]*)\s+IS\s+TRUE/gi, '$1 == true');

    // IS FALSE -> field == false
    result = result.replace(/(\w[\w.]*)\s+IS\s+FALSE/gi, '$1 == false');

    // IS NOT TRUE -> field != true
    result = result.replace(/(\w[\w.]*)\s+IS\s+NOT\s+TRUE/gi, '$1 != true');

    // IS NOT FALSE -> field != false
    result = result.replace(/(\w[\w.]*)\s+IS\s+NOT\s+FALSE/gi, '$1 != false');

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
   * Note: Field pattern includes dots to support dotted field names like http.target
   * IMPORTANT: NOT LIKE must be processed BEFORE LIKE to prevent 'NOT' being captured as a field name
   */
  private convertLikeOperator(expr: string, notes: TranslationNotes): string {
    let result = expr;
    // Pattern to match field names including dots (e.g., http.target, service.name)
    const fieldPattern = '([a-zA-Z_][a-zA-Z0-9_.]*)';

    // *** NOT LIKE patterns MUST come first ***
    // NOT LIKE '%text%' -> not(matchesPhrase(field, "text"))
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+NOT\\s+LIKE\\s+['"]%([^%'"]+)%['"]`, 'gi'),
      'not(matchesPhrase($1, "$2"))'
    );

    // NOT LIKE 'text%' -> not(startsWith(field, "text"))
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+NOT\\s+LIKE\\s+['"]([^%'"]+)%['"]`, 'gi'),
      'not(startsWith($1, "$2"))'
    );

    // NOT LIKE '%text' -> not(endsWith(field, "text"))
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+NOT\\s+LIKE\\s+['"]%([^%'"]+)['"]`, 'gi'),
      'not(endsWith($1, "$2"))'
    );

    // NOT LIKE complex pattern -> not(matchesValue(field, "regex"))
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+NOT\\s+LIKE\\s+['"](.+?)['"]`, 'gi'),
      (_match, field, pattern) => {
        const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
        return `not(matchesValue(${field}, "${regexPattern}"))`;
      }
    );

    // *** Regular LIKE patterns (after NOT LIKE) ***
    // LIKE '%text%' -> matchesPhrase(field, "text")
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+LIKE\\s+['"]%([^%'"]+)%['"]`, 'gi'),
      'matchesPhrase($1, "$2")'
    );

    // LIKE 'text%' -> startsWith(field, "text")
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+LIKE\\s+['"]([^%'"]+)%['"]`, 'gi'),
      'startsWith($1, "$2")'
    );

    // LIKE '%text' -> endsWith(field, "text")
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+LIKE\\s+['"]%([^%'"]+)['"]`, 'gi'),
      'endsWith($1, "$2")'
    );

    // LIKE complex pattern -> matchesValue(field, "regex")
    result = result.replace(
      new RegExp(`${fieldPattern}\\s+LIKE\\s+['"](.+?)['"]`, 'gi'),
      (_match, field, pattern) => {
        const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
        notes.keyDifferences.push(
          `LIKE pattern converted to regex: "${pattern}" -> "${regexPattern}"`
        );
        return `matchesValue(${field}, "${regexPattern}")`;
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
    context: TranslationContext | undefined,
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

    let cmd = '';

    // Process FACET fields (handles CASES(), if(), and regular fields)
    if (facet.length > 0) {
      const { facetFields, fieldsAddCmds } = this.processFacetFields(facet, context, warnings, notes);

      // Add fieldsAdd commands before summarize
      if (fieldsAddCmds.length > 0) {
        cmd += fieldsAddCmds.join('\n') + '\n';
      }

      cmd += `| summarize ${aggregations.join(', ')}`;

      if (facetFields.length > 0) {
        cmd += `, by:{${facetFields.join(', ')}}`;
        notes.keyDifferences.push(
          'NRQL FACET clause maps to DQL by:{} syntax in summarize command'
        );
      }
    } else {
      cmd = `| summarize ${aggregations.join(', ')}`;
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

      // Translate all aggregation function calls in the expression
      const dqlExpr = this.translateArithmeticExpressionParts(expr, warnings, notes);

      notes.keyDifferences.push(
        `Arithmetic expression "${agg.original}" translated inline. For complex expressions, consider using fieldsAdd for clarity.`
      );

      return `${alias} = ${dqlExpr}`;
    }

    // Handle rate() decomposition: rate(count(*), 1 minute) → count()
    if (funcName === 'rate') {
      return this.translateRateFunction(agg, warnings, notes);
    }

    // Handle percentage() decomposition: percentage(count(f), where cond) → 100.0 * countIf(cond) / count()
    if (funcName === 'percentage') {
      return this.translatePercentageFunction(agg, warnings, notes);
    }

    // Handle cdfPercentage() expansion: cdfPercentage(field, t1, t2, ...) → multiple countIf expressions
    if (funcName === 'cdfpercentage') {
      return this.translateCdfPercentageFunction(agg, warnings, notes);
    }

    // Handle filter() decomposition: filter(aggregate, WHERE condition) → conditional aggregation
    if (funcName === 'filter') {
      return this.translateFilterFunction(agg, warnings, notes);
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
   * Translate rate() function
   * rate(count(*), 1 minute) → count() with note about rate interpretation
   * rate(sum(field), 1 hour) → sum(field) with note
   */
  private translateRateFunction(
    agg: AggregationFunction,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    const alias = agg.alias ?? 'rate';
    const baseAggStr = agg.args[0] ?? 'count(*)';
    const timeWindow = agg.args[1] ?? '1 minute';

    // Parse the base aggregation function
    const baseAgg = this.parseAggregationFunction(baseAggStr);
    if (baseAgg) {
      const dqlBase = this.translateAggregation(baseAgg, warnings, notes);
      if (dqlBase) {
        // Extract just the expression part (after the "alias = " prefix)
        const exprPart = dqlBase.includes('=') ? dqlBase.split('=').slice(1).join('=').trim() : dqlBase;
        notes.keyDifferences.push(
          `rate(${baseAggStr}, ${timeWindow}) decomposed to base aggregation. With makeTimeseries, count per interval equals the rate per interval period.`
        );
        return `${alias} = ${exprPart}`;
      }
    }

    // Fallback: use count()
    warnings.push(`Could not parse base aggregation in rate(): ${baseAggStr}`);
    return `${alias} = count()`;
  }

  /**
   * Translate percentage() function
   * percentage(count(field), where condition) → 100.0 * countIf(condition) / count()
   */
  private translatePercentageFunction(
    agg: AggregationFunction,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    const alias = agg.alias ?? 'percentage';

    if (agg.args.length < 2) {
      warnings.push('percentage() requires at least 2 arguments: aggregation and where condition');
      return `${alias} = count()`;
    }

    // Second arg is "where condition" or "WHERE condition"
    const conditionArg = agg.args[1].trim();
    const condition = conditionArg.replace(/^\s*where\s+/i, '').trim();

    // Translate the condition using the same operator conversion pipeline
    const translatedCondition = this.translateWhereConditions(condition, undefined, warnings, notes);

    notes.keyDifferences.push(
      'percentage() decomposed to 100.0 * countIf(condition) / count()'
    );

    return `${alias} = 100.0 * countIf(${translatedCondition}) / count()`;
  }

  /**
   * Translate cdfPercentage() function
   * cdfPercentage(field, t1, t2, t3, t4) → comma-separated countIf expressions for each threshold
   * Each threshold becomes: 100.0 * countIf(field <= threshold) / count()
   */
  private translateCdfPercentageFunction(
    agg: AggregationFunction,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    if (agg.args.length < 2) {
      warnings.push('cdfPercentage() requires field and at least one threshold');
      return null;
    }

    const field = agg.args[0].trim();
    const thresholds = agg.args.slice(1).map(t => t.trim());

    // Generate one countIf expression per threshold
    const expressions = thresholds.map(threshold => {
      // Create a clean alias from the threshold (replace . with _)
      const cleanThreshold = threshold.replace('.', '_');
      return `pct_le_${cleanThreshold} = 100.0 * countIf(${field} <= ${threshold}) / count()`;
    });

    notes.keyDifferences.push(
      `cdfPercentage(${field}, ${thresholds.join(', ')}) expanded to ${thresholds.length} cumulative distribution countIf() expressions`
    );

    // Return all expressions comma-separated — they'll be joined into the summarize/makeTimeseries
    return expressions.join(', ');
  }

  /**
   * Translate NRQL filter() aggregate function
   * filter(count(*), WHERE error IS TRUE) → countIf(error == true)
   * filter(average(duration), WHERE appName LIKE '%api%') → avg(if(matchesPhrase(service.name, "api"), duration))
   */
  private translateFilterFunction(
    agg: AggregationFunction,
    warnings: string[],
    notes: TranslationNotes
  ): string | null {
    const alias = agg.alias ?? 'filtered';

    // The raw args string contains: "innerAgg, WHERE condition"
    // We need to split carefully on the WHERE keyword at depth 0
    const rawArgs = agg.args.join(', ');

    // Find WHERE at depth 0
    const whereIdx = this.findClauseKeyword(rawArgs, 'WHERE');
    if (whereIdx === -1) {
      warnings.push(`filter() requires a WHERE condition: filter(${rawArgs})`);
      return null;
    }

    const innerAggStr = rawArgs.substring(0, whereIdx).trim().replace(/,\s*$/, '');
    const condition = rawArgs.substring(whereIdx + 5).trim(); // 5 = 'WHERE'.length

    // Translate the WHERE condition
    const translatedCondition = this.translateWhereConditions(condition, undefined, warnings, notes);

    // Parse the inner aggregation
    const innerAgg = this.parseAggregationFunction(innerAggStr);
    if (!innerAgg) {
      warnings.push(`Could not parse inner aggregation in filter(): ${innerAggStr}`);
      return null;
    }

    const innerFuncName = innerAgg.name.toLowerCase();

    // For count(*) → use countIf(condition)
    if (innerFuncName === 'count' && (innerAgg.args.length === 0 || innerAgg.args[0] === '*')) {
      notes.keyDifferences.push(
        `filter(count(*), WHERE ${condition}) decomposed to countIf(${translatedCondition})`
      );
      return `${alias} = countIf(${translatedCondition})`;
    }

    // For other aggregations like average(field) → avg(if(condition, field))
    // For multi-arg functions like percentile(field, 95) → percentile(if(condition, field), 95)
    const dqlFuncName = NRQLToDQLTranslator.FUNCTION_MAP[innerFuncName]?.dql ?? innerFuncName;
    const field = innerAgg.args[0] ?? '*';
    const mappedField = this.mapFieldNames(field, undefined);
    const ifExpr = `if(${translatedCondition}, ${mappedField})`;
    const extraArgs = innerAgg.args.slice(1);
    const allArgs = [ifExpr, ...extraArgs];

    notes.keyDifferences.push(
      `filter(${innerFuncName}(${innerAgg.args.join(', ')}), WHERE ${condition}) decomposed to ${dqlFuncName}(${allArgs.join(', ')})`
    );

    return `${alias} = ${dqlFuncName}(${allArgs.join(', ')})`;
  }

  /**
   * Generate makeTimeseries command for time series queries
   */
  private generateTimeseries(
    select: SelectClause,
    facet: string[],
    timeseries: TimeseriesClause,
    context: TranslationContext | undefined,
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

    let cmd = '';

    // Process FACET fields (handles CASES(), if(), and regular fields)
    if (facet.length > 0) {
      const { facetFields, fieldsAddCmds } = this.processFacetFields(facet, context, warnings, notes);

      // Add fieldsAdd commands before makeTimeseries
      if (fieldsAddCmds.length > 0) {
        cmd += fieldsAddCmds.join('\n') + '\n';
      }

      cmd += `| makeTimeseries ${aggregations.join(', ')}, interval:${interval}`;

      if (facetFields.length > 0) {
        cmd += `, by:{${facetFields.join(', ')}}`;
      }
    } else {
      cmd = `| makeTimeseries ${aggregations.join(', ')}, interval:${interval}`;
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

    // Deduct for features requiring review
    // COMPARE WITH is now supported via append pattern, but still needs review
    if (parsed.compareWith) score -= 5;
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
    if (score >= NRQLToDQLTranslator.CONFIDENCE_HIGH_THRESHOLD) return 'high';
    if (score >= NRQLToDQLTranslator.CONFIDENCE_MEDIUM_THRESHOLD) return 'medium';
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
   * Extract field names from a WHERE clause
   * Matches patterns like: field = 'value', field == "value", field > 5, etc.
   */
  private extractFieldsFromWhere(where: string): string[] {
    const fields: string[] = [];

    // Match field names before comparison operators
    // Handles: field = 'val', field == "val", field > 5, field IN (...), etc.
    // Also handles backtick-quoted fields: `k8s.clusterName`
    const fieldPattern = /(?:`([^`]+)`|([a-zA-Z_][a-zA-Z0-9_.]*))(?:\s*(?:==?|!=|<>|>=?|<=?|IN|NOT\s+IN|LIKE|NOT\s+LIKE|IS))/gi;

    let match;
    while ((match = fieldPattern.exec(where)) !== null) {
      // Group 1 is backtick-quoted, Group 2 is unquoted
      const field = (match[1] || match[2]).replace(/[`'"]/g, '');
      if (field && !fields.includes(field)) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Process FACET fields, converting CASES() expressions to fieldsAdd + field name
   * Returns { facetFields: string[], fieldsAddCmds: string[] }
   */
  private processFacetFields(
    facet: string[],
    context: TranslationContext | undefined,
    warnings: string[],
    notes: TranslationNotes
  ): { facetFields: string[]; fieldsAddCmds: string[] } {
    const facetFields: string[] = [];
    const fieldsAddCmds: string[] = [];

    for (const f of facet) {
      const trimmed = f.trim();

      // Check for CASES(...) expression
      const casesMatch = trimmed.match(/^CASES\s*\((.*)\)$/i);
      if (casesMatch) {
        const casesContent = casesMatch[1];
        const caseResult = this.convertCasesToIf(casesContent, context, warnings, notes);
        if (caseResult) {
          fieldsAddCmds.push(`| fieldsAdd ${caseResult.fieldName} = ${caseResult.expression}`);
          facetFields.push(caseResult.fieldName);
        }
        continue;
      }

      // Check for inline if() expression in FACET
      if (/^if\s*\(/i.test(trimmed)) {
        const alias = 'computed_facet';
        const mappedExpr = this.mapFieldNames(trimmed, context);
        fieldsAddCmds.push(`| fieldsAdd ${alias} = ${mappedExpr}`);
        facetFields.push(alias);
        notes.keyDifferences.push('Inline if() in FACET moved to fieldsAdd command');
        continue;
      }

      // Check for NRQL time grouping functions: hourOf(), dateOf(), weekOf(), monthOf()
      const timeGroupMatch = trimmed.match(/^(hourOf|dateOf|weekOf|monthOf|dayOf|yearOf)\s*\((.+)\)$/i);
      if (timeGroupMatch) {
        const funcName = timeGroupMatch[1].toLowerCase();
        const field = this.mapFieldNames(timeGroupMatch[2].trim(), context);
        const timeGroupMap: Record<string, { dql: string; alias: string }> = {
          'hourof': { dql: `getHour(${field})`, alias: 'hour' },
          'dateof': { dql: `formatTimestamp(${field}, format:"yyyy-MM-dd")`, alias: 'date' },
          'weekof': { dql: `getWeekOfYear(${field})`, alias: 'week' },
          'monthof': { dql: `getMonth(${field})`, alias: 'month' },
          'dayof': { dql: `getDayOfWeek(${field})`, alias: 'day_of_week' },
          'yearof': { dql: `getYear(${field})`, alias: 'year' },
        };
        const mapping = timeGroupMap[funcName];
        if (mapping) {
          fieldsAddCmds.push(`| fieldsAdd ${mapping.alias} = ${mapping.dql}`);
          facetFields.push(mapping.alias);
          notes.keyDifferences.push(
            `NRQL ${timeGroupMatch[1]}() converted to DQL ${mapping.dql} via fieldsAdd`
          );
          continue;
        }
      }

      // Regular field — apply field mapping
      facetFields.push(this.mapFieldNames(trimmed, context));
    }

    return { facetFields, fieldsAddCmds };
  }

  /**
   * Convert NRQL CASES() expression to DQL if() expression
   * CASES(where cond1 AS label1, where cond2 AS label2, ...) → nested if()
   */
  private convertCasesToIf(
    casesContent: string,
    context: TranslationContext | undefined,
    warnings: string[],
    notes: TranslationNotes
  ): { fieldName: string; expression: string } | null {
    // Parse individual case entries: "where condition AS label"
    const caseEntries: Array<{ condition: string; label: string }> = [];

    // Split by "where" keyword (case-insensitive), keeping only non-empty parts
    const parts = casesContent.split(/\bwhere\b/i).filter(p => p.trim());

    for (const part of parts) {
      const asMatch = part.match(/^(.*?)\s+AS\s+['"]?([^'"]+?)['"]?\s*,?\s*$/i);
      if (asMatch) {
        caseEntries.push({
          condition: asMatch[1].trim(),
          label: asMatch[2].trim(),
        });
      }
    }

    if (caseEntries.length === 0) {
      warnings.push('Could not parse CASES() expression');
      return null;
    }

    // Build nested if() expression
    // For 2 cases: if(cond1, "label1", "label2")
    // For 3+ cases: if(cond1, "label1", else(if(cond2, "label2", "label3")))
    const buildIf = (entries: Array<{ condition: string; label: string }>, index: number): string => {
      if (index >= entries.length - 1) {
        // Last entry — just return the label as default
        return `"${entries[index].label}"`;
      }

      const entry = entries[index];
      const translatedCond = this.translateWhereConditions(entry.condition, context, warnings, notes);
      const elseExpr = index === entries.length - 2
        ? `"${entries[index + 1].label}"`
        : buildIf(entries, index + 1);

      return `if(${translatedCond}, "${entry.label}", ${elseExpr})`;
    };

    const expression = buildIf(caseEntries, 0);

    notes.keyDifferences.push(
      'NRQL CASES() converted to DQL if() expression via fieldsAdd'
    );

    return { fieldName: 'case_result', expression };
  }

  /**
   * Translate all aggregation function calls within an arithmetic expression.
   * Scans the expression for known aggregation functions, translates each one,
   * and preserves arithmetic operators and literals between them.
   */
  private translateArithmeticExpressionParts(
    expr: string,
    warnings: string[],
    notes: TranslationNotes
  ): string {
    const aggFunctions = NRQLToDQLTranslator.AGG_FUNCTIONS;

    let result = '';
    let i = 0;

    while (i < expr.length) {
      // Try to match a function name at current position
      const remaining = expr.substring(i);
      const funcMatch = remaining.match(/^(\w+)\s*\(/);

      if (funcMatch && aggFunctions.includes(funcMatch[1].toLowerCase())) {
        const openParenPos = i + funcMatch[0].length - 1;

        // Find matching closing paren
        let depth = 1;
        let j = openParenPos + 1;
        while (j < expr.length && depth > 0) {
          if (expr[j] === '(') depth++;
          else if (expr[j] === ')') depth--;
          j++;
        }

        if (depth === 0) {
          // Extract the full function call
          const fullCall = expr.substring(i, j);

          // Parse and translate
          const parsed = this.parseAggregationFunction(fullCall);
          if (parsed) {
            const translated = this.translateAggregation(parsed, warnings, notes);
            if (translated) {
              // Strip the alias prefix ("alias = expr" → "expr")
              const eqIdx = translated.indexOf(' = ');
              if (eqIdx >= 0) {
                result += translated.substring(eqIdx + 3);
              } else {
                result += translated;
              }
            } else {
              result += fullCall;
            }
          } else {
            result += fullCall;
          }

          i = j;
        } else {
          result += expr[i];
          i++;
        }
      } else {
        result += expr[i];
        i++;
      }
    }

    return result;
  }

  /**
   * Find a clause keyword at depth 0 (not inside parentheses)
   * Returns the index of the keyword start, or -1 if not found
   */
  private findClauseKeyword(text: string, keyword: string): number {
    let depth = 0;
    const upper = text.toUpperCase();
    const kw = keyword.toUpperCase();
    const kwLen = kw.length;

    for (let i = 0; i <= text.length - kwLen; i++) {
      if (text[i] === '(') { depth++; continue; }
      if (text[i] === ')') { depth--; continue; }

      if (depth === 0 && upper.substring(i, i + kwLen) === kw) {
        const before = i > 0 ? text[i - 1] : ' ';
        const after = i + kwLen < text.length ? text[i + kwLen] : ' ';
        if (/\W/.test(before) && /\W/.test(after)) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Extract text until a clause keyword at depth 0
   */
  private extractUntilClauseKeyword(text: string, keywords: string[]): string {
    let depth = 0;
    const upper = text.toUpperCase();

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '(') { depth++; continue; }
      if (text[i] === ')') { depth--; continue; }

      if (depth === 0) {
        for (const kw of keywords) {
          const kwUpper = kw.toUpperCase();
          const kwLen = kwUpper.length;
          if (i + kwLen <= text.length && upper.substring(i, i + kwLen) === kwUpper) {
            const before = i > 0 ? text[i - 1] : ' ';
            const after = i + kwLen < text.length ? text[i + kwLen] : ' ';
            if (/\W/.test(before) && (/\W/.test(after) || i + kwLen === text.length)) {
              return text.substring(0, i).trim();
            }
          }
        }
      }
    }

    return text.trim();
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
