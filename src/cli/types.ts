/**
 * CLI-specific type definitions
 */

import { TranslationResult } from '../index';

/**
 * Translation status values
 */
export type TranslationStatus = 'APPROVED' | 'CHANGED' | 'NEEDS_REVIEW' | 'ERROR';

/**
 * Record of a single translation operation
 */
export interface TranslationRecord {
  /** Row number in Excel (1-indexed) */
  row: number;

  /** Original NRQL query */
  nrql: string;

  /** New translated DQL */
  newDql: string | null;

  /** Previous/approved DQL (for comparison) */
  oldDql: string | null;

  /** Computed status based on comparison */
  status: TranslationStatus;

  /** Error message if translation failed */
  error?: string;

  /** Confidence level from translator */
  confidence?: 'high' | 'medium' | 'low';

  /** Full translation result for detailed info */
  translationResult?: TranslationResult;
}

/**
 * Options for the translate command
 */
export interface TranslateCommandOptions {
  /** Column containing NRQL queries */
  nrqlColumn: string;

  /** Column to write new DQL */
  newDqlColumn?: string;

  /** Column with approved/old DQL */
  oldDqlColumn?: string;

  /** Column to write status */
  statusColumn?: string;

  /** Row range to process */
  rows: string;

  /** Sheet name */
  sheet?: string;

  /** Output file path */
  output?: string;

  /** Column containing App names */
  appColumn?: string;

  /** Comma-separated list of App names to filter */
  apps?: string;

  /** Column containing Dashboard names */
  dashboardColumn?: string;

  /** Comma-separated list of Dashboard names to filter */
  dashboards?: string;

  /** Preview without writing */
  dryRun: boolean;

  /** Show detailed progress */
  verbose: boolean;

  /** Disable cell coloring */
  color: boolean;
}

/**
 * Filter configuration for targeting specific rows
 */
export interface RowFilter {
  /** Column containing the filter value */
  column: string | number;

  /** Values to match (case-insensitive) */
  values: string[];
}

/**
 * Options for processing rows
 */
export interface ProcessRowsOptions {
  /** Row numbers to process */
  rows: number[];

  /** NRQL column reference */
  nrqlColumn: string | number;

  /** Old DQL column reference (optional) */
  oldDqlColumn?: string | number;
}

/**
 * Summary of translation batch operation
 */
export interface TranslationSummary {
  /** Total rows processed */
  total: number;

  /** Rows where new matches approved */
  approved: number;

  /** Rows where translation changed */
  changed: number;

  /** New translations needing review */
  needsReview: number;

  /** Translation errors */
  errors: number;

  /** High confidence translations */
  highConfidence: number;

  /** Medium confidence translations */
  mediumConfidence: number;

  /** Low confidence translations */
  lowConfidence: number;
}
