/**
 * Excel translation command
 */

import * as path from 'path';
import { ExcelProcessor } from '../services/ExcelProcessor';
import { TranslationRunner } from '../services/TranslationRunner';
import { TranslateCommandOptions, RowFilter } from '../types';
import { DEFAULT_COLUMN_NAMES } from '../constants';

/**
 * Execute the translate command
 */
export async function executeTranslate(
  inputFile: string,
  options: TranslateCommandOptions
): Promise<void> {
  console.log(`\nNRQL to DQL Translation`);
  console.log(`Input file: ${inputFile}`);

  // Load Excel file
  const excel = new ExcelProcessor();
  try {
    await excel.load(inputFile, options.sheet);
  } catch (error) {
    console.error(`Error loading file: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  console.log(`Sheet: ${excel.getSheetName()}`);
  console.log(`Available headers: ${excel.getHeaders().join(', ')}`);

  // Resolve column references
  const nrqlCol = resolveNrqlColumn(excel, options.nrqlColumn);
  const newDqlCol = options.newDqlColumn
    ? excel.resolveColumn(options.newDqlColumn)
    : findOrCreateColumn(excel, DEFAULT_COLUMN_NAMES.NEW_DQL, 'New DQL');
  const oldDqlCol = options.oldDqlColumn
    ? excel.resolveColumn(options.oldDqlColumn)
    : excel.findColumnByHeaders([...DEFAULT_COLUMN_NAMES.OLD_DQL]);
  const statusCol = options.statusColumn
    ? excel.resolveColumn(options.statusColumn)
    : excel.findColumnByHeaders([...DEFAULT_COLUMN_NAMES.STATUS]);

  console.log(`\nColumn mapping:`);
  console.log(`  NRQL:       ${excel.columnToLetter(nrqlCol)} (column ${nrqlCol})`);
  console.log(`  New DQL:    ${excel.columnToLetter(newDqlCol)} (column ${newDqlCol})`);
  console.log(`  Old DQL:    ${oldDqlCol ? `${excel.columnToLetter(oldDqlCol)} (column ${oldDqlCol})` : 'not specified'}`);
  console.log(`  Status:     ${statusCol ? `${excel.columnToLetter(statusCol)} (column ${statusCol})` : 'not specified'}`);

  // Parse row range
  let rows = excel.parseRowRange(options.rows);
  console.log(`\nRows to process: ${rows.length} (${options.rows})`);

  // Apply filters
  const filters: RowFilter[] = [];

  if (options.apps && options.appColumn) {
    filters.push({
      column: options.appColumn,
      values: options.apps.split(',').map(s => s.trim()),
    });
    console.log(`App filter: ${options.apps}`);
  }

  if (options.dashboards && options.dashboardColumn) {
    filters.push({
      column: options.dashboardColumn,
      values: options.dashboards.split(',').map(s => s.trim()),
    });
    console.log(`Dashboard filter: ${options.dashboards}`);
  }

  // Apply filters to row list
  for (const filter of filters) {
    const beforeCount = rows.length;
    rows = excel.filterRowsByColumnValue(rows, filter.column, filter.values);
    console.log(`  Filter applied: ${beforeCount} -> ${rows.length} rows`);
  }

  if (rows.length === 0) {
    console.log('\nNo rows to process after filtering.');
    return;
  }

  // Process translations
  console.log('\nProcessing translations...');
  const runner = new TranslationRunner(excel);
  const records = runner.processRows({
    rows,
    nrqlColumn: nrqlCol,
    oldDqlColumn: oldDqlCol ?? undefined,
  });

  // Print verbose output if requested
  if (options.verbose) {
    console.log('\nDetailed results:');
    for (const record of records) {
      console.log(runner.getRecordReport(record));
      console.log('');
    }
  }

  // Generate and print summary
  const summary = runner.generateSummary(records);
  console.log(runner.formatSummary(summary));

  // Write results (unless dry run)
  if (options.dryRun) {
    console.log('\nDry run mode - no changes written to file.');
  } else {
    runner.writeResults(records, newDqlCol, statusCol ?? undefined, options.color);

    // Determine output path
    const outputPath = options.output ?? inputFile;
    await excel.save(outputPath);
    console.log(`\nResults written to: ${path.resolve(outputPath)}`);
  }
}

/**
 * Resolve NRQL column, trying auto-detection if not specified
 */
function resolveNrqlColumn(excel: ExcelProcessor, specified?: string): number {
  if (specified) {
    return excel.resolveColumn(specified);
  }

  // Try auto-detection
  const detected = excel.findColumnByHeaders([...DEFAULT_COLUMN_NAMES.NRQL]);
  if (detected) {
    return detected;
  }

  throw new Error(
    'Could not auto-detect NRQL column. Please specify with --nrql-column option.\n' +
      `Available headers: ${excel.getHeaders().join(', ')}`
  );
}

/**
 * Find existing column or return next available
 */
function findOrCreateColumn(
  excel: ExcelProcessor,
  possibleHeaders: readonly string[],
  _defaultName: string
): number {
  const existing = excel.findColumnByHeaders([...possibleHeaders]);
  if (existing) {
    return existing;
  }

  // Return next column after existing data
  return excel.getMaxColumn() + 1;
}
