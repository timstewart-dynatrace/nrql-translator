/**
 * Validate Command
 *
 * Reads TEMP JSON test files containing NRQL queries with Python compiler DQL output,
 * runs each NRQL through the TypeScript translator, and generates a comparison report.
 */

import * as fs from 'fs';
import * as path from 'path';
import { NRQLToDQLTranslator } from '../../core/NRQLToDQLTranslator';

interface TestQuery {
  title: string;
  page: string;
  nrql: string;
  dql: string;
  path: string;
  confidence: string;
  warnings: string[];
  fixes: string[];
}

interface TestFile {
  dashboard: string;
  guid: string;
  stats: {
    total: number;
    ast_path: number;
    regex_path: number;
    high: number;
    medium: number;
    low: number;
    warnings: number;
    fixes: number;
  };
  elapsed_seconds: number;
  queries: TestQuery[];
}

interface ValidationResult {
  title: string;
  nrql: string;
  pythonDql: string;
  tsDql: string;
  tsConfidence: string;
  pythonConfidence: string;
  tsWarnings: string[];
  pythonWarnings: string[];
  match: boolean;
}

interface ValidationSummary {
  dashboard: string;
  total: number;
  matches: number;
  mismatches: number;
  tsErrors: number;
  tsHigh: number;
  tsMedium: number;
  tsLow: number;
  results: ValidationResult[];
}

export interface ValidateCommandOptions {
  output?: string;
  verbose: boolean;
  limit?: number;
}

/**
 * Normalize DQL for comparison: strip comments, normalize whitespace, lowercase
 */
function normalizeDqlForComparison(dql: string): string {
  return dql
    .split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('//') && !line.startsWith('/*') && line.length > 0)
    .join('\n')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Execute the validate command
 */
export async function executeValidate(
  inputPath: string,
  options: ValidateCommandOptions
): Promise<void> {
  const translator = new NRQLToDQLTranslator();
  const summaries: ValidationSummary[] = [];

  // Determine if input is a file or directory
  const stat = fs.statSync(inputPath);
  let files: string[];

  if (stat.isDirectory()) {
    files = fs.readdirSync(inputPath)
      .filter(f => f.endsWith('_ast_test.json'))
      .map(f => path.join(inputPath, f));
  } else {
    files = [inputPath];
  }

  if (files.length === 0) {
    console.error('No *_ast_test.json files found in the specified path.');
    process.exit(1);
  }

  console.log(`\nValidating ${files.length} test file(s)...\n`);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let testFile: TestFile;

    try {
      testFile = JSON.parse(content);
    } catch {
      console.error(`Failed to parse: ${filePath}`);
      continue;
    }

    const summary: ValidationSummary = {
      dashboard: testFile.dashboard,
      total: 0,
      matches: 0,
      mismatches: 0,
      tsErrors: 0,
      tsHigh: 0,
      tsMedium: 0,
      tsLow: 0,
      results: [],
    };

    const queries = options.limit
      ? testFile.queries.slice(0, options.limit)
      : testFile.queries;

    for (const query of queries) {
      summary.total++;

      const nrql = query.nrql.trim();
      let tsResult;

      try {
        tsResult = translator.translate(nrql);
      } catch (error) {
        summary.tsErrors++;
        summary.results.push({
          title: query.title,
          nrql,
          pythonDql: query.dql,
          tsDql: `ERROR: ${error instanceof Error ? error.message : String(error)}`,
          tsConfidence: 'error',
          pythonConfidence: query.confidence,
          tsWarnings: [],
          pythonWarnings: query.warnings,
          match: false,
        });
        continue;
      }

      // Compare normalized DQL
      const normalizedTs = normalizeDqlForComparison(tsResult.dql);
      const normalizedPython = normalizeDqlForComparison(query.dql);
      const match = normalizedTs === normalizedPython;

      if (match) summary.matches++;
      else summary.mismatches++;

      if (tsResult.confidence === 'high') summary.tsHigh++;
      else if (tsResult.confidence === 'medium') summary.tsMedium++;
      else summary.tsLow++;

      summary.results.push({
        title: query.title,
        nrql,
        pythonDql: query.dql,
        tsDql: tsResult.dql,
        tsConfidence: tsResult.confidence,
        pythonConfidence: query.confidence,
        tsWarnings: tsResult.warnings,
        pythonWarnings: query.warnings,
        match,
      });
    }

    summaries.push(summary);

    // Print summary for this dashboard
    const matchRate = summary.total > 0
      ? ((summary.matches / summary.total) * 100).toFixed(1)
      : '0.0';

    console.log(`Dashboard: ${summary.dashboard}`);
    console.log(`  Total:      ${summary.total}`);
    console.log(`  Matches:    ${summary.matches} (${matchRate}%)`);
    console.log(`  Mismatches: ${summary.mismatches}`);
    console.log(`  TS Errors:  ${summary.tsErrors}`);
    console.log(`  TS Confidence: HIGH=${summary.tsHigh} MED=${summary.tsMedium} LOW=${summary.tsLow}`);
    console.log('');

    // Print verbose details for mismatches
    if (options.verbose) {
      for (const result of summary.results) {
        if (!result.match) {
          console.log(`  MISMATCH: ${result.title}`);
          console.log(`    NRQL:      ${result.nrql.substring(0, 120)}${result.nrql.length > 120 ? '...' : ''}`);
          console.log(`    Python:    ${result.pythonDql.split('\n').filter(l => !l.startsWith('//')).join(' | ').substring(0, 120)}`);
          console.log(`    TS:        ${result.tsDql.split('\n').join(' | ').substring(0, 120)}`);
          if (result.tsWarnings.length > 0) {
            console.log(`    Warnings:  ${result.tsWarnings.join('; ')}`);
          }
          console.log('');
        }
      }
    }
  }

  // Print overall summary
  const totals = summaries.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      matches: acc.matches + s.matches,
      mismatches: acc.mismatches + s.mismatches,
      tsErrors: acc.tsErrors + s.tsErrors,
    }),
    { total: 0, matches: 0, mismatches: 0, tsErrors: 0 }
  );

  const overallRate = totals.total > 0
    ? ((totals.matches / totals.total) * 100).toFixed(1)
    : '0.0';

  console.log('='.repeat(60));
  console.log('OVERALL VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Dashboards: ${summaries.length}`);
  console.log(`  Total:      ${totals.total}`);
  console.log(`  Matches:    ${totals.matches} (${overallRate}%)`);
  console.log(`  Mismatches: ${totals.mismatches}`);
  console.log(`  TS Errors:  ${totals.tsErrors}`);
  console.log('');

  // Save JSON output if requested
  if (options.output) {
    const outputData = {
      timestamp: new Date().toISOString(),
      overall: totals,
      matchRate: overallRate + '%',
      dashboards: summaries.map(s => ({
        dashboard: s.dashboard,
        total: s.total,
        matches: s.matches,
        mismatches: s.mismatches,
        tsErrors: s.tsErrors,
        confidence: { high: s.tsHigh, medium: s.tsMedium, low: s.tsLow },
        mismatched: s.results.filter(r => !r.match).map(r => ({
          title: r.title,
          nrql: r.nrql,
          pythonDql: r.pythonDql,
          tsDql: r.tsDql,
          tsConfidence: r.tsConfidence,
          tsWarnings: r.tsWarnings,
        })),
      })),
    };

    fs.writeFileSync(options.output, JSON.stringify(outputData, null, 2));
    console.log(`Detailed report saved to: ${options.output}`);
  }
}
