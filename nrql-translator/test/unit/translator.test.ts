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
      const result = translator.translate(
        'SELECT count(*) FROM Transaction COMPARE WITH 1 week ago'
      );
      expect(['medium', 'low']).toContain(result.confidence);
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
  });

  describe('FROM ... SELECT syntax', () => {
    it('should translate FROM before SELECT', () => {
      const result = translator.translate(
        "FROM Metric SELECT latest(cpuUsage) as CPUUsage FACET host"
      );
      // Metric queries use timeseries command
      expect(result.dql).toContain('timeseries');
      expect(result.dql).toContain('last(cpuUsage)');
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
      expect(result.dql).toContain('CPUUsage = last(cpuUsage)');
      expect(result.dql).toContain('by:{');
      expect(result.dql).toContain('filter');
      expect(result.dql).not.toContain('fetch dt.metrics');
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
