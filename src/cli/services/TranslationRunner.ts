/**
 * Translation runner - processes rows from Excel and runs translations
 */

import { NRQLToDQLTranslator } from '../../core/NRQLToDQLTranslator';
import { ExcelProcessor } from './ExcelProcessor';
import {
  TranslationRecord,
  TranslationStatus,
  TranslationSummary,
  ProcessRowsOptions,
} from '../types';
import { STATUS_VALUES, getColorForStatus } from '../constants';

export class TranslationRunner {
  private translator: NRQLToDQLTranslator;
  private excel: ExcelProcessor;

  constructor(excel: ExcelProcessor) {
    this.translator = new NRQLToDQLTranslator();
    this.excel = excel;
  }

  /**
   * Process rows and generate translation records
   */
  processRows(options: ProcessRowsOptions): TranslationRecord[] {
    const records: TranslationRecord[] = [];

    for (const row of options.rows) {
      // Skip empty rows
      if (this.excel.isRowEmpty(row)) {
        continue;
      }

      // Get NRQL query
      const nrql = this.excel.getCellValue(row, options.nrqlColumn);
      if (!nrql.trim()) {
        continue;
      }

      // Get old/approved DQL if column specified
      const oldDql = options.oldDqlColumn
        ? this.excel.getCellValue(row, options.oldDqlColumn).trim() || null
        : null;

      // Translate
      const record = this.translateRow(row, nrql, oldDql);
      records.push(record);
    }

    return records;
  }

  /**
   * Translate a single row
   */
  private translateRow(row: number, nrql: string, oldDql: string | null): TranslationRecord {
    try {
      const result = this.translator.translate(nrql);

      // Determine status
      const status = this.determineStatus(result.dql, oldDql);

      return {
        row,
        nrql,
        newDql: result.dql,
        oldDql,
        status,
        confidence: result.confidence,
        translationResult: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        row,
        nrql,
        newDql: null,
        oldDql,
        status: 'ERROR',
        error: errorMessage,
      };
    }
  }

  /**
   * Determine translation status based on comparison with old DQL
   */
  private determineStatus(newDql: string, oldDql: string | null): TranslationStatus {
    if (!oldDql) {
      return 'NEEDS_REVIEW';
    }

    // Normalize for comparison (trim whitespace, normalize line endings)
    const normalizedNew = this.normalizeDql(newDql);
    const normalizedOld = this.normalizeDql(oldDql);

    if (normalizedNew === normalizedOld) {
      return 'APPROVED';
    }

    return 'CHANGED';
  }

  /**
   * Normalize DQL for comparison
   */
  private normalizeDql(dql: string): string {
    return dql
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Write results back to Excel
   */
  writeResults(
    records: TranslationRecord[],
    newDqlColumn: string | number,
    statusColumn?: string | number,
    useColors: boolean = true
  ): void {
    for (const record of records) {
      // Write new DQL
      const dqlValue = record.newDql ?? `ERROR: ${record.error ?? 'Unknown error'}`;
      this.excel.setCellValue(record.row, newDqlColumn, dqlValue);

      // Apply color if enabled
      if (useColors) {
        const color = getColorForStatus(record.status);
        this.excel.setCellBackground(record.row, newDqlColumn, color);
      }

      // Write status if column specified
      if (statusColumn) {
        this.excel.setCellValue(record.row, statusColumn, STATUS_VALUES[record.status]);

        if (useColors) {
          const color = getColorForStatus(record.status);
          this.excel.setCellBackground(record.row, statusColumn, color);
        }
      }
    }
  }

  /**
   * Generate summary statistics from translation records
   */
  generateSummary(records: TranslationRecord[]): TranslationSummary {
    const summary: TranslationSummary = {
      total: records.length,
      approved: 0,
      changed: 0,
      needsReview: 0,
      errors: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
    };

    for (const record of records) {
      // Count by status
      switch (record.status) {
        case 'APPROVED':
          summary.approved++;
          break;
        case 'CHANGED':
          summary.changed++;
          break;
        case 'NEEDS_REVIEW':
          summary.needsReview++;
          break;
        case 'ERROR':
          summary.errors++;
          break;
      }

      // Count by confidence
      switch (record.confidence) {
        case 'high':
          summary.highConfidence++;
          break;
        case 'medium':
          summary.mediumConfidence++;
          break;
        case 'low':
          summary.lowConfidence++;
          break;
      }
    }

    return summary;
  }

  /**
   * Format summary for console output
   */
  formatSummary(summary: TranslationSummary): string {
    const lines: string[] = [
      '',
      '='.repeat(50),
      'Translation Summary',
      '='.repeat(50),
      '',
      `Total rows processed: ${summary.total}`,
      '',
      'Status Breakdown:',
      `  APPROVED (matches approved):  ${summary.approved}`,
      `  CHANGED (differs from old):   ${summary.changed}`,
      `  NEEDS_REVIEW (new):           ${summary.needsReview}`,
      `  ERROR (failed):               ${summary.errors}`,
      '',
      'Confidence Breakdown:',
      `  High:   ${summary.highConfidence}`,
      `  Medium: ${summary.mediumConfidence}`,
      `  Low:    ${summary.lowConfidence}`,
      '',
      '='.repeat(50),
    ];

    return lines.join('\n');
  }

  /**
   * Get detailed report for a specific record
   */
  getRecordReport(record: TranslationRecord): string {
    const lines: string[] = [
      `Row ${record.row}:`,
      `  Status: ${record.status}`,
      `  Confidence: ${record.confidence ?? 'N/A'}`,
      `  NRQL: ${record.nrql.substring(0, 100)}${record.nrql.length > 100 ? '...' : ''}`,
    ];

    if (record.newDql) {
      lines.push(`  DQL: ${record.newDql.substring(0, 100)}${record.newDql.length > 100 ? '...' : ''}`);
    }

    if (record.error) {
      lines.push(`  Error: ${record.error}`);
    }

    if (record.translationResult?.warnings.length) {
      lines.push(`  Warnings: ${record.translationResult.warnings.length}`);
      for (const warning of record.translationResult.warnings.slice(0, 3)) {
        lines.push(`    - ${warning}`);
      }
      if (record.translationResult.warnings.length > 3) {
        lines.push(`    ... and ${record.translationResult.warnings.length - 3} more`);
      }
    }

    return lines.join('\n');
  }
}
