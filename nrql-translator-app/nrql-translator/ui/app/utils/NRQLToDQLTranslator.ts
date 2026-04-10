/**
 * NRQL to DQL Translator — Engine Adapter (Dynatrace App)
 *
 * Thin wrapper around @timstewart-dynatrace/nrql-engine's AST compiler.
 * Replaces the previous 2,197-line duplicated translator.
 */

import { NRQLCompiler } from '@timstewart-dynatrace/nrql-engine';
import type { CompileResult } from '@timstewart-dynatrace/nrql-engine';
import type { TranslationResult, TranslationNotes } from './types';

export class NRQLToDQLTranslator {
  private readonly compiler: NRQLCompiler;

  constructor() {
    this.compiler = new NRQLCompiler();
  }

  translate(nrql: string): TranslationResult {
    const result = this.compiler.compile(nrql);

    if (!result.success) {
      return {
        dql: `// Translation error: ${result.error}\n// Original NRQL: ${nrql}`,
        notes: emptyNotes(),
        confidence: 'low',
        warnings: [result.error],
      };
    }

    return {
      dql: result.dql,
      notes: mapNotes(result.notes),
      confidence: result.confidence.toLowerCase() as 'high' | 'medium' | 'low',
      warnings: result.warnings,
    };
  }
}

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
