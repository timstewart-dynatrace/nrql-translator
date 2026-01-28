#!/usr/bin/env node
/**
 * NRQL to DQL Translator CLI
 *
 * Command-line interface for batch translation of NRQL queries to DQL.
 */

import { Command } from 'commander';
import { executeTranslate } from './commands/translate';
import { TranslateCommandOptions } from './types';
import { NRQLToDQLTranslator } from '../core/NRQLToDQLTranslator';

const program = new Command();

program
  .name('nrql-translator')
  .description('Translate New Relic NRQL queries to Dynatrace DQL')
  .version('1.0.0');

program
  .command('excel')
  .description('Translate NRQL queries from an Excel file')
  .argument('<input-file>', 'Excel file containing NRQL queries')
  .option('-n, --nrql-column <column>', 'Column containing NRQL queries (letter, number, or header name)')
  .option('-d, --new-dql-column <column>', 'Column to write translated DQL')
  .option('-o, --old-dql-column <column>', 'Column with approved/previous DQL for comparison')
  .option('-s, --status-column <column>', 'Column to write translation status')
  .option('-r, --rows <range>', 'Row range to process (e.g., "all", "2-100", "2,5,10")', 'all')
  .option('--sheet <name>', 'Sheet name to process')
  .option('--output <file>', 'Output file path (defaults to overwrite input)')
  .option('--app-column <column>', 'Column containing App names for filtering')
  .option('--apps <names>', 'Comma-separated App names to include')
  .option('--dashboard-column <column>', 'Column containing Dashboard names for filtering')
  .option('--dashboards <names>', 'Comma-separated Dashboard names to include')
  .option('--dry-run', 'Preview translations without writing to file', false)
  .option('--verbose', 'Show detailed progress and results', false)
  .option('--no-color', 'Disable cell color coding')
  .action(async (inputFile: string, options: Partial<TranslateCommandOptions>) => {
    try {
      await executeTranslate(inputFile, {
        nrqlColumn: options.nrqlColumn ?? 'NRQL',
        newDqlColumn: options.newDqlColumn,
        oldDqlColumn: options.oldDqlColumn,
        statusColumn: options.statusColumn,
        rows: options.rows ?? 'all',
        sheet: options.sheet,
        output: options.output,
        appColumn: options.appColumn,
        apps: options.apps,
        dashboardColumn: options.dashboardColumn,
        dashboards: options.dashboards,
        dryRun: options.dryRun ?? false,
        verbose: options.verbose ?? false,
        color: options.color ?? true,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('query')
  .description('Translate a single NRQL query')
  .argument('<nrql>', 'NRQL query string')
  .option('--verbose', 'Show detailed translation notes', false)
  .action((nrql: string, options: { verbose: boolean }) => {
    try {
      const translator = new NRQLToDQLTranslator();
      const result = translator.translate(nrql);

      console.log('\nNRQL:');
      console.log(nrql);
      console.log('\nDQL:');
      console.log(result.dql);
      console.log(`\nConfidence: ${result.confidence}`);

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings) {
          console.log(`  - ${warning}`);
        }
      }

      if (options.verbose) {
        console.log('\nNotes:');

        if (result.notes.dataSourceMapping.length > 0) {
          console.log('\n  Data Source Mapping:');
          for (const note of result.notes.dataSourceMapping) {
            console.log(`    - ${note}`);
          }
        }

        if (result.notes.keyDifferences.length > 0) {
          console.log('\n  Key Differences:');
          for (const note of result.notes.keyDifferences) {
            console.log(`    - ${note}`);
          }
        }

        if (result.notes.performanceConsiderations.length > 0) {
          console.log('\n  Performance Considerations:');
          for (const note of result.notes.performanceConsiderations) {
            console.log(`    - ${note}`);
          }
        }

        if (result.notes.dataModelRequirements.length > 0) {
          console.log('\n  Data Model Requirements:');
          for (const note of result.notes.dataModelRequirements) {
            console.log(`    - ${note}`);
          }
        }

        if (result.notes.testingRecommendations.length > 0) {
          console.log('\n  Testing Recommendations:');
          for (const note of result.notes.testingRecommendations) {
            console.log(`    - ${note}`);
          }
        }
      }

      console.log('');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
