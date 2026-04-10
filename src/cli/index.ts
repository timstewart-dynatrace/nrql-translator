#!/usr/bin/env node
/**
 * NRQL to DQL Translator CLI
 *
 * Command-line interface for batch translation of NRQL queries to DQL.
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { executeTranslate } from './commands/translate';
import { executeValidate, ValidateCommandOptions } from './commands/validate';
import { executeNotebook, NotebookCommandOptions } from './commands/notebook';
import { TranslateCommandOptions } from './types';
import { NRQLToDQLTranslator } from '../core/NRQLToDQLTranslator';
import { DQLSyntaxValidator, DQLFixer } from '@timstewart-dynatrace/nrql-engine';

const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));
const program = new Command();

program
  .name('nrql-translator')
  .description('Translate New Relic NRQL queries to Dynatrace DQL')
  .version(pkg.version);

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
  .option('--validate', 'Validate the generated DQL syntax', false)
  .option('--fix', 'Auto-fix common DQL issues in the output', false)
  .action((nrql: string, options: { verbose: boolean; validate: boolean; fix: boolean }) => {
    try {
      const translator = new NRQLToDQLTranslator();
      const result = translator.translate(nrql);

      console.log('\nNRQL:');
      console.log(nrql);
      console.log('\nDQL:');
      console.log(result.dql);
      console.log(`\nConfidence: ${result.confidence} (${result.confidenceScore}/100)`);

      if (result.fixes.length > 0) {
        console.log('\nAuto-corrections:');
        for (const fix of result.fixes) {
          console.log(`  - ${fix}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings) {
          console.log(`  - ${warning}`);
        }
      }

      if (options.fix) {
        const fixer = new DQLFixer();
        const [fixedDql, appliedFixes] = fixer.validateAndFix(result.dql);
        if (appliedFixes.length > 0) {
          console.log('\nDQL Fixer applied:');
          for (const fix of appliedFixes) {
            console.log(`  - ${fix}`);
          }
          console.log('\nFixed DQL:');
          console.log(fixedDql);
        } else {
          console.log('\nDQL Fixer: no issues found.');
        }
      }

      if (options.validate) {
        const validator = new DQLSyntaxValidator();
        const validation = validator.validate(result.dql);
        if (validation.valid) {
          console.log('\nDQL Validation: PASSED');
        } else {
          console.log('\nDQL Validation: FAILED');
          for (const err of validation.errors) {
            console.log(`  - ${err}`);
          }
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

        if (result.notes.fieldExtraction.length > 0) {
          console.log('\n  Field Extraction:');
          for (const note of result.notes.fieldExtraction) {
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

program
  .command('validate')
  .description('Validate TypeScript translator against Python compiler test data')
  .argument('<input>', 'Path to *_ast_test.json file or directory containing them')
  .option('-o, --output <file>', 'Save detailed comparison report as JSON')
  .option('--verbose', 'Show details for each mismatch', false)
  .option('--limit <n>', 'Limit number of queries per file', parseInt)
  .action(async (input: string, options: Partial<ValidateCommandOptions>) => {
    try {
      await executeValidate(input, {
        output: options.output,
        verbose: options.verbose ?? false,
        limit: options.limit,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('notebook')
  .description('Generate Dynatrace Notebook JSON from NRQL test data')
  .argument('<input>', 'Path to *_ast_test.json file or directory containing them')
  .option('-o, --output <file>', 'Output file path (or directory with --per-dashboard)')
  .option('--per-dashboard', 'Generate one notebook per dashboard file', false)
  .option('--max-queries <n>', 'Maximum queries per notebook', parseInt)
  .option('--source <type>', 'DQL source: "typescript", "python", or "both"', 'python')
  .option('--verbose', 'Show detailed generation stats', false)
  .action(async (input: string, options: Partial<NotebookCommandOptions>) => {
    try {
      await executeNotebook(input, {
        output: options.output,
        perDashboard: options.perDashboard ?? false,
        maxQueries: options.maxQueries,
        source: (options.source as 'typescript' | 'python' | 'both') ?? 'python',
        verbose: options.verbose ?? false,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
