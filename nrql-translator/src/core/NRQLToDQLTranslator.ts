/**
 * NRQL to DQL Translator — Engine Adapter
 *
 * Thin wrapper around @timstewart-dynatrace/nrql-engine's AST-based compiler.
 * Replaces the previous 2,197-line regex-based translator with a ~60-line adapter
 * that maps the engine's CompileResult to the existing TranslationResult interface.
 *
 * The engine provides 292 AST-compiled patterns vs the ~80 regex patterns before.
 */

import { NRQLCompiler, type CompileResult } from '@timstewart-dynatrace/nrql-engine';

import type {
  TranslationResult,
  TranslationNotes,
  TranslationContext,
} from './types';

/**
 * Main translator class for converting NRQL to DQL.
 *
 * Public API is unchanged — consumers still call:
 *   const translator = new NRQLToDQLTranslator();
 *   const result = translator.translate(nrql);
 */
export class NRQLToDQLTranslator {
  private readonly compiler: NRQLCompiler;

  constructor() {
    this.compiler = new NRQLCompiler();
  }

  /**
   * Translate an NRQL query to DQL.
   *
   * @param nrql - The NRQL query string
   * @param context - Optional translation context (custom mappings, etc.)
   * @returns TranslationResult with dql, notes, confidence, and warnings
   */
  translate(nrql: string, context?: TranslationContext): TranslationResult {
    // Pass custom field mappings from context to the engine
    const compiler = context?.fieldMappings
      ? new NRQLCompiler({ fieldMap: context.fieldMappings })
      : this.compiler;

    const result = compiler.compile(nrql);

    if (!result.success) {
      // On failure, return error info as a comment in the DQL field
      return {
        dql: `// Translation error: ${result.error}\n// Original NRQL: ${nrql}`,
        notes: emptyNotes(),
        confidence: 'low',
        confidenceScore: 0,
        warnings: [result.error],
        fixes: [],
      };
    }

    // Strip the "// Original NRQL: ..." comment line if context says to strip
    let dql = result.dql;
    if (context?.stripTimeRanges) {
      // Remove SINCE/UNTIL references — the dashboard controls the time range
      dql = dql.replace(/\/\/ Original NRQL:.*\n?/, '');
    }

    return {
      dql,
      notes: mapNotes(result.notes),
      confidence: result.confidence.toLowerCase() as 'high' | 'medium' | 'low',
      confidenceScore: result.confidenceScore,
      warnings: result.warnings,
      fixes: result.fixes ?? [],
    };
  }
}

/**
 * Map engine TranslationNotes to the local TranslationNotes interface.
 * The shapes are identical, but this ensures type safety across packages.
 */
function mapNotes(engineNotes: CompileResult['notes']): TranslationNotes {
  return {
    dataSourceMapping: [...engineNotes.dataSourceMapping],
    fieldExtraction: [...engineNotes.fieldExtraction],
    keyDifferences: [...engineNotes.keyDifferences],
    performanceConsiderations: [...engineNotes.performanceConsiderations],
    dataModelRequirements: [...engineNotes.dataModelRequirements],
    testingRecommendations: [...engineNotes.testingRecommendations],
  };
}

function emptyNotes(): TranslationNotes {
  return {
    dataSourceMapping: [],
    fieldExtraction: [],
    keyDifferences: [],
    performanceConsiderations: [],
    dataModelRequirements: [],
    testingRecommendations: [],
  };
}
