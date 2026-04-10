/**
 * Notebook Generator Command
 *
 * Generates Dynatrace Notebook JSON files from NRQL test data.
 * Each notebook contains alternating markdown (showing NRQL) and DQL query sections.
 * The resulting JSON can be imported directly into a Dynatrace tenant for testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
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

interface NotebookSection {
  id: string;
  type: 'markdown' | 'query';
  markdown?: string;
  title?: string;
  query?: string;
  visualization?: string;
  visualizationSettings?: Record<string, unknown>;
}

interface DynatraceNotebook {
  version: string;
  defaultTimeframe: {
    from: string;
    to: string;
  };
  sections: NotebookSection[];
}

export interface NotebookCommandOptions {
  output?: string;
  perDashboard: boolean;
  maxQueries?: number;
  source: 'typescript' | 'python' | 'both';
  verbose: boolean;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Strip comment lines from DQL (lines starting with //)
 */
function stripDqlComments(dql: string): string {
  return dql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('//'))
    .join('\n')
    .trim();
}

/**
 * Create the header markdown section for a notebook
 */
function createHeaderSection(dashboardName: string, queryCount: number): NotebookSection {
  const markdown = [
    `# NRQL to DQL Validation: ${dashboardName}`,
    '',
    `**Generated:** ${new Date().toISOString().split('T')[0]}`,
    `**Queries:** ${queryCount}`,
    '',
    'This notebook contains NRQL queries from New Relic and their DQL translations.',
    'Each query pair consists of:',
    '1. A **markdown section** showing the original NRQL query, confidence level, and any warnings',
    '2. A **DQL query section** that can be executed directly in this notebook',
    '',
    '---',
  ].join('\n');

  return {
    id: generateUUID(),
    type: 'markdown',
    markdown,
  };
}

/**
 * Create a page divider section
 */
function createPageDivider(pageName: string): NotebookSection {
  return {
    id: generateUUID(),
    type: 'markdown',
    markdown: `\n---\n\n## Page: ${pageName}\n`,
  };
}

/**
 * Create a markdown section showing the NRQL query details
 */
function createNrqlSection(
  title: string,
  nrql: string,
  confidence: string,
  warnings: string[],
  queryIndex: number
): NotebookSection {
  const lines: string[] = [
    `### ${queryIndex}. ${title}`,
    '',
    `**Confidence:** ${confidence}`,
    '',
    '**Original NRQL:**',
    '```sql',
    nrql.trim(),
    '```',
  ];

  if (warnings.length > 0) {
    lines.push('', '**Warnings:**');
    for (const w of warnings) {
      lines.push(`- ${w}`);
    }
  }

  return {
    id: generateUUID(),
    type: 'markdown',
    markdown: lines.join('\n'),
  };
}

/**
 * Create a DQL query section that can be executed
 */
function createDqlSection(
  title: string,
  dql: string,
  queryIndex: number
): NotebookSection {
  return {
    id: generateUUID(),
    type: 'query',
    title: `${queryIndex}. ${title}`,
    query: stripDqlComments(dql),
    visualization: 'table',
    visualizationSettings: {},
  };
}

/**
 * Build a Dynatrace notebook from test queries
 */
function buildNotebook(
  dashboardName: string,
  queries: Array<{
    title: string;
    page: string;
    nrql: string;
    dql: string;
    confidence: string;
    warnings: string[];
  }>,
  maxQueries?: number
): DynatraceNotebook {
  const limitedQueries = maxQueries ? queries.slice(0, maxQueries) : queries;
  const sections: NotebookSection[] = [];

  // Add header
  sections.push(createHeaderSection(dashboardName, limitedQueries.length));

  // Group by page
  const pageGroups = new Map<string, typeof limitedQueries>();
  for (const q of limitedQueries) {
    const page = q.page || 'Default';
    if (!pageGroups.has(page)) {
      pageGroups.set(page, []);
    }
    pageGroups.get(page)!.push(q);
  }

  let queryIndex = 1;
  for (const [pageName, pageQueries] of pageGroups) {
    // Add page divider
    sections.push(createPageDivider(pageName));

    // Add query pairs
    for (const q of pageQueries) {
      // Markdown section with NRQL
      sections.push(createNrqlSection(q.title, q.nrql, q.confidence, q.warnings, queryIndex));

      // DQL query section (runnable)
      sections.push(createDqlSection(q.title, q.dql, queryIndex));

      queryIndex++;
    }
  }

  return {
    version: '5',
    defaultTimeframe: {
      from: 'now-2h',
      to: 'now',
    },
    sections,
  };
}

/**
 * Execute the notebook command
 */
export async function executeNotebook(
  inputPath: string,
  options: NotebookCommandOptions
): Promise<void> {
  const translator = new NRQLToDQLTranslator();

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

  console.log(`\nProcessing ${files.length} test file(s)...\n`);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let testFile: TestFile;

    try {
      testFile = JSON.parse(content);
    } catch {
      console.error(`Failed to parse: ${filePath}`);
      continue;
    }

    // Prepare queries with translations
    const queries: Array<{
      title: string;
      page: string;
      nrql: string;
      dql: string;
      confidence: string;
      warnings: string[];
    }> = [];

    for (const query of testFile.queries) {
      const nrql = query.nrql.trim();

      if (options.source === 'python') {
        // Use Python compiler's DQL output
        queries.push({
          title: query.title,
          page: query.page,
          nrql,
          dql: query.dql,
          confidence: query.confidence,
          warnings: query.warnings,
        });
      } else if (options.source === 'typescript') {
        // Use TypeScript translator's DQL output
        try {
          const result = translator.translate(nrql);
          queries.push({
            title: query.title,
            page: query.page,
            nrql,
            dql: result.dql,
            confidence: result.confidence,
            warnings: result.warnings,
          });
        } catch (error) {
          queries.push({
            title: query.title,
            page: query.page,
            nrql,
            dql: `/* Translation failed: ${error instanceof Error ? error.message : String(error)} */`,
            confidence: 'low',
            warnings: [`Translation error: ${error instanceof Error ? error.message : String(error)}`],
          });
        }
      } else {
        // 'both' - show Python DQL with TS comparison in notes
        let tsDql = '';
        let tsConfidence = '';
        let tsWarnings: string[] = [];

        try {
          const result = translator.translate(nrql);
          tsDql = result.dql;
          tsConfidence = result.confidence;
          tsWarnings = result.warnings;
        } catch (error) {
          tsDql = `/* TS Translation failed: ${error instanceof Error ? error.message : String(error)} */`;
          tsConfidence = 'error';
        }

        const combinedWarnings = [
          ...query.warnings.map(w => `[Python] ${w}`),
          ...tsWarnings.map(w => `[TypeScript] ${w}`),
        ];

        if (tsDql !== query.dql) {
          combinedWarnings.push('[Comparison] Python and TypeScript outputs differ');
        }

        queries.push({
          title: query.title,
          page: query.page,
          nrql,
          dql: query.dql, // Use Python DQL as primary since it's more mature
          confidence: `Python: ${query.confidence}, TS: ${tsConfidence}`,
          warnings: combinedWarnings,
        });
      }
    }

    // Build notebook
    const notebook = buildNotebook(testFile.dashboard, queries, options.maxQueries);

    // Determine output path
    let outputPath: string;
    if (options.output && !options.perDashboard) {
      outputPath = options.output;
    } else {
      const baseName = testFile.dashboard.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dir = options.output ? path.dirname(options.output) : path.dirname(filePath);
      outputPath = path.join(dir, `${baseName}_notebook.json`);
    }

    // Write notebook JSON
    fs.writeFileSync(outputPath, JSON.stringify(notebook, null, 2));

    console.log(`Generated: ${outputPath}`);
    console.log(`  Dashboard:  ${testFile.dashboard}`);
    console.log(`  Queries:    ${queries.length}${options.maxQueries ? ` (limited to ${options.maxQueries})` : ''}`);
    console.log(`  Sections:   ${notebook.sections.length}`);
    console.log(`  Source:     ${options.source}`);
    console.log('');

    if (options.verbose) {
      const confidenceCounts = queries.reduce(
        (acc, q) => {
          const conf = q.confidence.toLowerCase();
          if (conf.includes('high')) acc.high++;
          else if (conf.includes('medium')) acc.medium++;
          else acc.low++;
          return acc;
        },
        { high: 0, medium: 0, low: 0 }
      );

      console.log(`  Confidence: HIGH=${confidenceCounts.high} MED=${confidenceCounts.medium} LOW=${confidenceCounts.low}`);
      console.log(`  Warnings:   ${queries.reduce((sum, q) => sum + q.warnings.length, 0)} total`);
      console.log('');
    }
  }

  console.log('Notebooks can be imported into Dynatrace via: All notebooks > Upload');
}
