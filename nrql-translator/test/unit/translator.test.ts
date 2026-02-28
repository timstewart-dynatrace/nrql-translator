/**
 * Unit tests for NRQLToDQLTranslator
 */

import { NRQLToDQLTranslator } from '../../src/core/NRQLToDQLTranslator';
import * as fixtures from '../fixtures/queries.json';

describe('NRQLToDQLTranslator', () => {
  let translator: NRQLToDQLTranslator;

  beforeEach(() => {
    translator = new NRQLToDQLTranslator();
  });

  describe('Basic queries', () => {
    for (const testCase of fixtures.basic) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();
        expect(result.confidence).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('Aggregation functions', () => {
    for (const testCase of fixtures.aggregations) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('FACET clause', () => {
    for (const testCase of fixtures.facet) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('TIMESERIES clause', () => {
    for (const testCase of fixtures.timeseries) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('WHERE clause', () => {
    for (const testCase of fixtures.where) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('ORDER BY and LIMIT', () => {
    for (const testCase of fixtures.orderAndLimit) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('Event types', () => {
    for (const testCase of fixtures.eventTypes) {
      it(`should handle: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('Complex queries', () => {
    for (const testCase of fixtures.complex) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }
  });

  describe('Unsupported features', () => {
    for (const testCase of fixtures.unsupported) {
      it(`should warn about: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        if (testCase.shouldWarn) {
          expect(result.warnings.length).toBeGreaterThan(0);

          const warningText = result.warnings.join(' ').toLowerCase();
          expect(warningText).toContain(testCase.expectedWarningContains.toLowerCase());
        }
      });
    }
  });

  describe('rate() function', () => {
    for (const testCase of fixtures.rateFunction) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }

    it('should decompose rate(count(*), 1 minute) to count()', () => {
      const result = translator.translate(
        "SELECT rate(count(*), 1 minute) FROM Transaction"
      );
      expect(result.dql).toContain('count()');
      expect(result.notes.keyDifferences.some(n => n.includes('rate('))).toBe(true);
    });

    it('should produce high confidence for rate queries', () => {
      const result = translator.translate(
        "SELECT rate(count(*), 1 minute) FROM Span FACET http.status_code TIMESERIES"
      );
      expect(result.confidence).toBe('high');
    });
  });

  describe('percentage() function', () => {
    for (const testCase of fixtures.percentageFunction) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }

    it('should decompose percentage to countIf/count', () => {
      const result = translator.translate(
        "SELECT percentage(count(*), WHERE status = 200) FROM Transaction"
      );
      expect(result.dql).toContain('countIf(');
      expect(result.dql).toContain('count()');
      expect(result.dql).toContain('100.0');
    });

    it('should translate WHERE condition inside percentage()', () => {
      const result = translator.translate(
        "SELECT percentage(count(http.status_code), where http.status_code > 199 and http.status_code < 300) as '2XX' from Span"
      );
      expect(result.dql).toContain('2XX');
      expect(result.dql).toContain('countIf(');
      // Operators should be translated
      expect(result.dql).toContain('http.response.status_code');
    });
  });

  describe('cdfPercentage() function', () => {
    for (const testCase of fixtures.cdfPercentageFunction) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }

    it('should expand cdfPercentage to multiple countIf expressions', () => {
      const result = translator.translate(
        "SELECT cdfPercentage(duration.ms, 1000, 2000, 3000) FROM Span"
      );
      expect(result.dql).toContain('countIf(duration.ms <= 1000)');
      expect(result.dql).toContain('countIf(duration.ms <= 2000)');
      expect(result.dql).toContain('countIf(duration.ms <= 3000)');
      expect(result.dql).toContain('100.0');
    });

    it('should produce meaningful aliases for each threshold', () => {
      const result = translator.translate(
        "SELECT cdfPercentage(duration.ms, 500, 1000) FROM Span"
      );
      expect(result.dql).toContain('pct_le_500');
      expect(result.dql).toContain('pct_le_1000');
    });
  });

  describe('LIMIT MAX', () => {
    for (const testCase of fixtures.limitMax) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }

    it('should not produce limit clause for LIMIT MAX', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Span FACET host LIMIT MAX"
      );
      expect(result.dql).not.toContain('limit');
    });

    it('should still handle numeric LIMIT', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Span FACET host LIMIT 10"
      );
      expect(result.dql).toContain('limit 10');
    });
  });

  describe('CASES() in FACET', () => {
    for (const testCase of fixtures.casesFunction) {
      it(`should translate: ${testCase.name}`, () => {
        const result = translator.translate(testCase.nrql);

        expect(result.dql).toBeDefined();

        for (const expected of testCase.expectedDqlContains) {
          expect(result.dql.toLowerCase()).toContain(expected.toLowerCase());
        }
      });
    }

    it('should convert CASES to fieldsAdd with if() expression', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Span FACET CASES(where status = 200 AS success, where status != 200 AS failure)"
      );
      expect(result.dql).toContain('fieldsAdd');
      expect(result.dql).toContain('if(');
      expect(result.dql).toContain('case_result');
    });
  });

  describe('TranslationResult structure', () => {
    it('should return complete TranslationResult', () => {
      const result = translator.translate('SELECT count(*) FROM Transaction');

      expect(result).toHaveProperty('dql');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('warnings');

      expect(result.notes).toHaveProperty('dataSourceMapping');
      expect(result.notes).toHaveProperty('fieldExtraction');
      expect(result.notes).toHaveProperty('keyDifferences');
      expect(result.notes).toHaveProperty('performanceConsiderations');
      expect(result.notes).toHaveProperty('dataModelRequirements');
      expect(result.notes).toHaveProperty('testingRecommendations');
    });

    it('should return high confidence for simple queries', () => {
      const result = translator.translate('SELECT count(*) FROM Transaction');
      expect(['high', 'medium']).toContain(result.confidence);
    });

    it('should return lower confidence for queries with unsupported features', () => {
      // Multiple unsupported functions to lower confidence
      const result = translator.translate(
        'SELECT histogram(duration, 100, 10), funnel(session, WHERE step1, WHERE step2) FROM Transaction'
      );
      expect(['medium', 'low']).toContain(result.confidence);
    });
  });

  describe('COMPARE WITH support', () => {
    it('should generate append pattern for COMPARE WITH', () => {
      const result = translator.translate(
        'SELECT count(*) FROM Transaction COMPARE WITH 1 week ago SINCE 1 day ago'
      );
      expect(result.dql).toContain('append');
      expect(result.dql).toContain('current_');
      expect(result.dql).toContain('previous_');
      expect(result.dql).toContain('fieldsAdd timestamp');
    });

    it('should calculate correct time offsets for week comparison', () => {
      const result = translator.translate(
        'SELECT count(*) FROM Transaction COMPARE WITH 1 week ago SINCE 1 day ago'
      );
      // 1 week = 168 hours, 1 day = 24 hours
      // Previous window should start at -(168+24)h = -192h and end at -168h
      expect(result.dql).toContain('from:-192h');
      expect(result.dql).toContain('to:-168h');
      expect(result.dql).toContain('timestamp + 168h');
    });

    it('should fall back to warning for unparseable time expressions', () => {
      const result = translator.translate(
        'SELECT count(*) FROM Transaction COMPARE WITH last tuesday'
      );
      expect(result.warnings.some(w => w.includes('COMPARE WITH'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle missing SELECT clause', () => {
      const result = translator.translate('FROM Transaction');
      expect(result.confidence).toBe('low');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing FROM clause', () => {
      const result = translator.translate('SELECT count(*)');
      expect(result.confidence).toBe('low');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle empty query', () => {
      const result = translator.translate('');
      expect(result.confidence).toBe('low');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Field mapping', () => {
    it('should map appName to service.name', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction WHERE appName = 'MyApp'"
      );
      expect(result.dql).toContain('service.name');
    });

    it('should map host to host.name', () => {
      const result = translator.translate(
        'SELECT count(*) FROM Transaction FACET host'
      );
      expect(result.dql).toContain('host.name');
    });

    it('should map Kubernetes fields', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction WHERE k8s.clusterName = 'my-cluster' AND k8s.containerName = 'my-container'"
      );
      expect(result.dql).toContain('k8s.cluster.name');
      expect(result.dql).toContain('k8s.container.name');
      expect(result.dql).not.toContain('k8s.clusterName');
      expect(result.dql).not.toContain('k8s.containerName');
    });
  });

  describe('FROM ... SELECT syntax', () => {
    it('should translate FROM before SELECT', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) as CPUUsage FACET host"
      );
      expect(result.dql).toContain('timeseries');
      expect(result.dql).toContain('avg(cpuUsage)');
      expect(result.dql).toContain('by:{');
    });

    it('should translate FROM before SELECT with WHERE', () => {
      const result = translator.translate(
        "FROM Transaction SELECT count(*) WHERE appName = 'MyApp'"
      );
      expect(result.dql).toContain('fetch spans');
      expect(result.dql).toContain('count()');
      expect(result.dql).toContain('service.name');
    });

    it('should translate FROM before SELECT with TIMESERIES', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) FACET host TIMESERIES"
      );
      expect(result.dql).toContain('timeseries');
      expect(result.dql).toContain('by:{');
    });
  });

  describe('Bare TIMESERIES clause', () => {
    it('should handle TIMESERIES without interval', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction TIMESERIES"
      );
      expect(result.dql).toContain('makeTimeseries');
      expect(result.dql).toContain('interval:1h');
    });
  });

  describe('Flexible clause ordering', () => {
    it('should handle FACET before WHERE', () => {
      const result = translator.translate(
        "FROM Transaction SELECT count(*) FACET host WHERE appName = 'MyApp' TIMESERIES 5 minutes"
      );
      expect(result.dql).toContain('makeTimeseries');
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('service.name');
      expect(result.dql).not.toContain('by:{host.name WHERE');
    });

    it('should handle TIMESERIES at end of query without trailing space', () => {
      const result = translator.translate(
        "FROM Transaction SELECT count(*) FACET host WHERE appName = 'MyApp' TIMESERIES"
      );
      expect(result.dql).not.toContain('TIMESERIES');
      expect(result.dql).toContain('makeTimeseries');
      expect(result.dql).toContain('service.name');
    });
  });

  describe('Metric queries', () => {
    it('should use timeseries command for Metric event type', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) as CPUUsage FACET host WHERE appName = 'MyApp'"
      );
      expect(result.dql).toContain('timeseries');
      expect(result.dql).toContain('CPUUsage = avg(cpuUsage)');
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('filter');
      expect(result.dql).not.toContain('fetch dt.metrics');
    });

    it('should warn when latest() is converted to avg()', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) as CPUUsage"
      );
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('latest()'))).toBe(true);
      expect(result.warnings.some(w => w.includes('avg()'))).toBe(true);
    });

    it('should not quote metric keys or facet fields in timeseries', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(`k8s.container.cpuUsedCores`) as CPUUsage FACET `k8s.containerName`"
      );
      expect(result.dql).toContain('avg(k8s.container.cpuUsedCores)');
      expect(result.dql).toContain('by:{k8s.container.name}');
      expect(result.dql).not.toContain('"k8s.container.cpuUsedCores"');
      expect(result.dql).not.toContain('"k8s.container.name"');
    });

    it('should add WHERE fields to by:{} clause for timeseries', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) as CPU FACET host WHERE clusterName = 'prod'"
      );
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('host');
      expect(result.dql).toContain('k8s.cluster.name');
      expect(result.dql).toContain('filter');
    });

    it('should map k8s field names in by:{} clause to match filter clause', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(k8s.container.cpuUsedCores) as CPUUsage FACET k8s.containerName, k8s.containerId WHERE k8s.containerName = 'my-container' AND k8s.clusterName = 'my-cluster'"
      );
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('k8s.container.name');
      expect(result.dql).toContain('k8s.container.id');
      expect(result.dql).toContain('k8s.cluster.name');
      expect(result.dql).not.toMatch(/by:\{[^}]*k8s\.containerName[^}]*\}/);
      expect(result.dql).not.toMatch(/by:\{[^}]*k8s\.containerId[^}]*\}/);
      expect(result.dql).not.toMatch(/by:\{[^}]*k8s\.clusterName[^}]*\}/);
    });
  });

  describe('Translation context', () => {
    it('should apply custom field mappings', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction WHERE customField = 'value'",
        {
          fieldMappings: {
            customField: 'dt.custom.field',
          },
        }
      );
      expect(result.dql).toContain('dt.custom.field');
    });

    it('should use custom default data source', () => {
      const result = translator.translate('SELECT count(*) FROM UnknownEvent', {
        defaultDataSource: 'fetch bizevents',
      });
      expect(result.dql).toContain('fetch bizevents');
    });
  });

  describe('NRQL comments', () => {
    it('should strip -- line comments', () => {
      const result = translator.translate(
        "SELECT count(*) -- this is a comment\nFROM Log"
      );
      expect(result.dql).toContain('summarize');
      expect(result.dql).toContain('count()');
      expect(result.dql).not.toContain('comment');
    });

    it('should handle comment after SELECT with trailing fields', () => {
      const result = translator.translate(
        "SELECT count(*) -- correlationId, divisionNumber\nFROM Log WHERE container_name = 'my-api'"
      );
      expect(result.dql).toContain('summarize');
      expect(result.dql).toContain('count()');
      expect(result.dql).not.toContain('correlationId');
    });
  });

  describe('Backtick-quoted fields', () => {
    it('should strip backticks and map fields correctly', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Log WHERE `container_name` = 'my-api'"
      );
      expect(result.dql).toContain('container_name == "my-api"');
      expect(result.dql).not.toContain('`');
      expect(result.dql).not.toContain('"container_name"');
    });

    it('should handle backtick-quoted field with IN operator', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Log WHERE `level` IN ('info', 'warn')"
      );
      expect(result.dql).toContain('in(loglevel, array(');
      expect(result.dql).not.toContain('`');
    });
  });

  describe('NOT LIKE operator', () => {
    it('should translate NOT LIKE startsWith pattern', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Log WHERE message NOT LIKE 'ADS returned%'"
      );
      expect(result.dql.toLowerCase()).toContain('not(startswith(content');
      expect(result.dql).not.toContain('startsWith(NOT');
    });

    it('should translate NOT LIKE contains pattern', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Log WHERE message NOT LIKE '%error%'"
      );
      expect(result.dql.toLowerCase()).toContain('not(contains(content');
    });

    it('should handle multiple NOT LIKE in same query', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Log WHERE message NOT LIKE 'query:%' AND message NOT LIKE 'Calling%' AND returnedCount > 0"
      );
      expect(result.dql.toLowerCase()).toContain('not(startswith(content');
      expect(result.dql).toContain('returnedCount > 0');
      expect(result.dql).not.toContain('startsWith(NOT');
    });
  });

  describe('Real-world production queries', () => {
    it('should translate percentage HTTP status code query', () => {
      const result = translator.translate(
        "SELECT percentage(count(http.status_code), where http.status_code > 199 and http.status_code < 300) as '2XX', percentage(count(http.status_code), where http.status_code > 399 and http.status_code < 500) as '4XX', percentage(count(http.status_code), where http.status_code > 499 and http.status_code < 600) as '5XX' from Span where service.name = 'prod-usf-auth-api' and span.kind = 'server' and net.protocol.name = 'http' TIMESERIES auto"
      );
      expect(result.dql).toContain('makeTimeseries');
      expect(result.dql).toContain('2XX');
      expect(result.dql).toContain('4XX');
      expect(result.dql).toContain('5XX');
      expect(result.dql).toContain('countIf(');
    });

    it('should translate rate with COMPARE WITH', () => {
      const result = translator.translate(
        "SELECT rate(count(*), 1 minute) AS 'Typeahead Rate' FROM Span WHERE (http.route = '/product-domain-api/v1/typeahead') AND ((span.kind LIKE 'server' OR span.kind LIKE 'consumer' OR kind LIKE 'server' OR kind LIKE 'consumer')) SINCE 1 hour ago COMPARE WITH 1 week ago FACET http.status_code TIMESERIES limit max"
      );
      expect(result.dql).toContain('count()');
      expect(result.dql).toContain('append');
    });

    it('should translate cdfPercentage with COMPARE WITH', () => {
      const result = translator.translate(
        "SELECT cdfPercentage(duration.ms, 1000, 2000, 3000, 4000) FROM Span WHERE http.route = '/price-domain-api/v1/pricing' AND parent.id IS NULL and http.status_code < 300 TIMESERIES COMPARE WITH 1 week ago"
      );
      expect(result.dql).toContain('countIf(');
      expect(result.dql).toContain('append');
    });
  });

  describe('CASES + COMPARE WITH bug fixes', () => {
    it('should not include stray comma in CASES label', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Span FACET CASES(where status = 200 AS success, where status != 200 AS failure) TIMESERIES"
      );
      expect(result.dql).toContain('"success"');
      expect(result.dql).toContain('"failure"');
      expect(result.dql).not.toContain('"success,"');
    });

    it('should apply CASES transformation in COMPARE WITH append block', () => {
      const result = translator.translate(
        "SELECT rate(count(*), 1 minute) FROM AjaxRequest WHERE requestUrl IN ('example.com/api') FACET httpResponseCode, CASES(where enduser.id = 'GUESTUSER' AS guest, where enduser.id != 'GUESTUSER' AS customer) TIMESERIES COMPARE WITH 1 week ago"
      );
      // Both primary and append blocks should have fieldsAdd with if()
      const fieldsAddCount = (result.dql.match(/fieldsAdd case_result/g) || []).length;
      expect(fieldsAddCount).toBeGreaterThanOrEqual(2);
      // Append block should NOT contain raw CASES()
      expect(result.dql).not.toContain('by:{httpResponseCode, CASES(');
    });

    it('should apply field mapping in COMPARE WITH append block', () => {
      const result = translator.translate(
        "SELECT count(*) FROM AjaxRequest FACET httpResponseCode TIMESERIES COMPARE WITH 1 week ago"
      );
      // Both primary and append should use mapped field name
      const appendBlock = result.dql.split('append [')[1];
      expect(appendBlock).toContain('http.response.status_code');
      expect(appendBlock).not.toContain('httpResponseCode');
    });
  });

  describe('filter() NRQL aggregate function', () => {
    it('should translate filter(count(*), WHERE cond) to countIf', () => {
      const result = translator.translate(
        "SELECT filter(count(*), WHERE error IS TRUE) FROM Transaction"
      );
      expect(result.dql).toContain('countIf(');
      expect(result.confidence).toBe('high');
    });

    it('should translate filter(average(field), WHERE cond) to avg(if(cond, field))', () => {
      const result = translator.translate(
        "SELECT filter(average(duration), WHERE appName LIKE '%api%') AS 'API Avg Duration' FROM Transaction"
      );
      expect(result.dql).toContain('avg(if(');
      expect(result.dql).toContain('API Avg Duration');
    });

    it('should handle multiple filter() aggregations', () => {
      const result = translator.translate(
        "SELECT filter(count(*), WHERE error IS TRUE) AS errors, filter(count(*), WHERE duration > 5) AS slow FROM Transaction"
      );
      expect(result.dql).toContain('errors = countIf(');
      expect(result.dql).toContain('slow = countIf(');
    });
  });

  describe('hourOf()/dateOf()/weekOf() in FACET', () => {
    it('should translate hourOf(timestamp) to getHour()', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction FACET hourOf(timestamp)"
      );
      expect(result.dql).toContain('fieldsAdd hour = getHour(timestamp)');
      expect(result.dql).toContain('by:{hour}');
    });

    it('should translate dateOf(timestamp) to formatTimestamp()', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction FACET dateOf(timestamp)"
      );
      expect(result.dql).toContain('fieldsAdd date = formatTimestamp(timestamp');
      expect(result.dql).toContain('by:{date}');
    });

    it('should translate weekOf(timestamp) to getWeekOfYear()', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction FACET weekOf(timestamp)"
      );
      expect(result.dql).toContain('fieldsAdd week = getWeekOfYear(timestamp)');
      expect(result.dql).toContain('by:{week}');
    });

    it('should handle hourOf() alongside regular fields', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction FACET hourOf(timestamp), appName"
      );
      expect(result.dql).toContain('fieldsAdd hour = getHour(timestamp)');
      expect(result.dql).toContain('by:{hour, service.name}');
    });
  });

  describe('SLIDE BY warning', () => {
    it('should warn about SLIDE BY not being supported', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction TIMESERIES 30 minutes SLIDE BY 10 minutes"
      );
      expect(result.warnings.some(w => w.includes('SLIDE BY'))).toBe(true);
      expect(result.dql).toContain('makeTimeseries');
    });
  });

  describe('ago() time function', () => {
    it('should translate ago(7 days) to now() - 7d', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction WHERE timestamp >= ago(7 days)"
      );
      expect(result.dql).toContain('now() - 7d');
      expect(result.dql).not.toContain('ago(');
    });

    it('should translate ago(24 hours) to now() - 24h', () => {
      const result = translator.translate(
        "SELECT count(*) FROM Transaction WHERE timestamp >= ago(24 hours) AND environment = 'production'"
      );
      expect(result.dql).toContain('now() - 24h');
      expect(result.dql).toContain('environment == "production"');
    });
  });

  describe('CASES + COMPARE WITH production queries', () => {
    it('should translate AjaxRequest CASES + COMPARE WITH correctly', () => {
      const result = translator.translate(
        "SELECT rate(count(*), 1 minute) FROM AjaxRequest WHERE requestUrl IN ('usfoodsproduction10upnbvk4.org.coveo.com/rest/organizations/usfoodsproduction10upnbvk4/commerce/v2/search/productsuggest') FACET httpResponseCode, CASES(where enduser.id = 'GUESTUSER' AS guest, where enduser.id != 'GUESTUSER' AS customer) TIMESERIES COMPARE WITH 1 week ago"
      );
      expect(result.dql).toContain('fetch bizevents');
      expect(result.dql).toContain('fieldsAdd case_result = if(');
      expect(result.dql).toContain('by:{http.response.status_code, case_result}');
      expect(result.dql).toContain('append');
      expect(result.confidence).toBe('high');
    });

    it('should translate Span CASES + COMPARE WITH with backtick fields', () => {
      const result = translator.translate(
        "SELECT rate(count(*), 1 minute) FROM Span WHERE http.route = '/product-domain-api/v2/products' AND span.kind = 'server' FACET http.status_code, CASES(where `prod-usf-product-domain-api.accessToken.userName` = 'GUESTUSER' AS guest, where `prod-usf-product-domain-api.accessToken.userName` != 'GUESTUSER' AS customer) TIMESERIES COMPARE WITH 1 week ago"
      );
      expect(result.dql).toContain('fetch spans');
      expect(result.dql).toContain('fieldsAdd case_result = if(');
      expect(result.dql).toContain('append');
    });
  });

  describe('filter() arithmetic expressions', () => {
    it('should translate filter()/filter() division AS alias', () => {
      const result = translator.translate(
        "FROM Transaction SELECT filter(sum(duration), WHERE appName = 'checkout') / filter(count(*), WHERE appName = 'checkout') AS 'Manual Avg' WHERE environment = 'production'"
      );
      expect(result.dql).toContain('Manual Avg');
      expect(result.dql).toContain('countIf(');
      expect(result.dql).toContain('sum(if(');
      expect(result.dql).toContain('/');
      expect(result.dql).not.toContain('filter(');
    });

    it('should translate parenthesized filter arithmetic with multiplier', () => {
      const result = translator.translate(
        "FROM Transaction SELECT (filter(count(*), WHERE error IS TRUE) / count(*)) * 100 AS 'Error %' WHERE environment = 'production'"
      );
      expect(result.dql).toContain('Error %');
      expect(result.dql).toContain('countIf(');
      expect(result.dql).toContain('count()');
      expect(result.dql).toContain('* 100');
      expect(result.dql).not.toContain('filter(');
    });

    it('should translate filter() subtraction (delta)', () => {
      const result = translator.translate(
        "FROM Transaction SELECT filter(average(duration), WHERE httpResponseCode >= 500) - filter(average(duration), WHERE httpResponseCode < 400) AS 'Error vs Success Delta' WHERE environment = 'production'"
      );
      expect(result.dql).toContain('Error vs Success Delta');
      expect(result.dql).toContain('avg(if(');
      expect(result.dql).toContain('-');
      expect(result.dql).not.toContain('filter(');
    });

    it('should translate filter(percentile(field, N)) preserving percentile value', () => {
      const result = translator.translate(
        "FROM Transaction SELECT filter(percentile(duration, 95), WHERE request.method = 'POST') AS 'POST p95' WHERE environment = 'production'"
      );
      expect(result.dql).toContain('POST p95');
      expect(result.dql).toContain('percentile(if(');
      expect(result.dql).toContain(', 95)');
      expect(result.dql).not.toContain('filter(');
    });

    it('should translate the full multi-filter production query', () => {
      const result = translator.translate(
        "FROM Transaction SELECT filter(sum(duration), WHERE appName = 'checkout') / filter(count(*), WHERE appName = 'checkout') AS 'Manual Avg', (filter(count(*), WHERE error IS TRUE) / count(*)) * 100 AS 'Error %', filter(average(duration), WHERE httpResponseCode >= 500) - filter(average(duration), WHERE httpResponseCode < 400) AS 'Error vs Success Delta', filter(percentile(duration, 95), WHERE request.method = 'POST') AS 'POST p95', filter(percentile(duration, 95), WHERE request.method = 'GET') AS 'GET p95' WHERE environment = 'production' AND appName IN ('checkout', 'auth', 'inventory') AND timestamp >= ago(24 hours) FACET appName, request.method TIMESERIES 15 minutes COMPARE WITH 1 week ago"
      );
      expect(result.dql).toContain('fetch spans');
      // All filter() calls should be decomposed
      expect(result.dql).not.toContain('filter(');
      // Should contain countIf for count(*) filters
      expect(result.dql).toContain('countIf(');
      // Should contain percentile with if() and the percentile value
      expect(result.dql).toContain('percentile(if(');
      expect(result.dql).toContain(', 95)');
      // Should have COMPARE WITH append block
      expect(result.dql).toContain('append');
      // Should translate ago()
      expect(result.dql).toContain('now() - 24h');
    });

    it('should handle FROM...SELECT with filter() containing WHERE without truncation', () => {
      const result = translator.translate(
        "FROM Transaction SELECT filter(count(*), WHERE error IS TRUE) AS 'Errors', count(*) AS 'Total' WHERE environment = 'production' FACET appName"
      );
      expect(result.dql).toContain('Errors');
      expect(result.dql).toContain('Total');
      expect(result.dql).toContain('countIf(');
      expect(result.dql).toContain('count()');
      expect(result.dql).not.toContain('filter(');
    });
  });
});
