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
        'SELECT stddev(duration), rate(count(*), 1 minute) FROM Transaction'
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
      // Metric queries use timeseries command with avg() since DQL doesn't support last()
      expect(result.dql).toContain('timeseries');
      expect(result.dql).toContain('avg(cpuUsage)');
      expect(result.dql).toContain('by:{');
    });

    it('should translate FROM before SELECT with WHERE', () => {
      const result = translator.translate(
        "FROM Transaction SELECT count(*) WHERE appName = 'MyApp'"
      );
      expect(result.dql).toContain('fetch logs');
      expect(result.dql).toContain('count()');
      expect(result.dql).toContain('service.name');
    });

    it('should translate FROM before SELECT with TIMESERIES', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) FACET host TIMESERIES"
      );
      // Metric queries use timeseries command
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
      // Make sure WHERE clause content isn't in the by:{} clause
      expect(result.dql).not.toContain('by:{host.name WHERE');
    });

    it('should handle TIMESERIES at end of query without trailing space', () => {
      const result = translator.translate(
        "FROM Transaction SELECT count(*) FACET host WHERE appName = 'MyApp' TIMESERIES"
      );
      // Make sure TIMESERIES keyword doesn't appear in DQL output (it becomes makeTimeseries)
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
      // DQL timeseries only supports avg, sum, min, max, count, rate - latest() maps to avg()
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
      // Metric keys and facet fields should NOT be quoted in DQL timeseries
      expect(result.dql).toContain('avg(k8s.container.cpuUsedCores)');
      // k8s.containerName should be mapped to k8s.container.name in by:{} clause
      expect(result.dql).toContain('by:{k8s.container.name}');
      // Should NOT contain quoted versions
      expect(result.dql).not.toContain('"k8s.container.cpuUsedCores"');
      expect(result.dql).not.toContain('"k8s.container.name"');
    });

    it('should add WHERE fields to by:{} clause for timeseries', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) as CPU FACET host WHERE clusterName = 'prod'"
      );
      // WHERE field should be automatically added to by:{} clause
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('host');
      expect(result.dql).toContain('k8s.cluster.name'); // clusterName mapped to k8s.cluster.name
      expect(result.dql).toContain('filter');
    });

    it('should map k8s field names in by:{} clause to match filter clause', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(k8s.container.cpuUsedCores) as CPUUsage FACET k8s.containerName, k8s.containerId WHERE k8s.containerName = 'my-container' AND k8s.clusterName = 'my-cluster'"
      );
      // Both FACET and WHERE k8s fields should be mapped in by:{} clause
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('k8s.container.name'); // k8s.containerName mapped
      expect(result.dql).toContain('k8s.container.id'); // k8s.containerId mapped
      expect(result.dql).toContain('k8s.cluster.name'); // k8s.clusterName mapped
      // Unmapped versions should NOT appear in by:{} clause
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
});
