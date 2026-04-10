/**
 * NRQL to DQL Translator
 *
 * A library for translating New Relic Query Language (NRQL) queries
 * to Dynatrace Query Language (DQL) for migration purposes.
 *
 * @example
 * ```typescript
 * import { NRQLToDQLTranslator } from '@bhdynatrace/nrql-translator';
 *
 * const translator = new NRQLToDQLTranslator();
 * const result = translator.translate(
 *   "SELECT count(*), average(duration) FROM Transaction WHERE appName = 'MyApp' FACET host TIMESERIES 5 minutes"
 * );
 *
 * console.log(result.dql);
 * // fetch logs
 * // | filter log.source == "apm" and service.name == "MyApp"
 * // | makeTimeseries count = count(), avg_duration = avg(duration), interval:"5m", by:{host.name}
 * ```
 */

export { NRQLToDQLTranslator } from './core/NRQLToDQLTranslator';
export * from './core/types';
