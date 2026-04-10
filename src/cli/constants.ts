/**
 * CLI constants - colors, status values, etc.
 */

/**
 * Cell background colors for Excel (ARGB format)
 * Format: AARRGGBB where AA is alpha (FF = opaque)
 */
export const CELL_COLORS = {
  /** Light green - approved, matches previous */
  GREEN: { argb: 'FF90EE90' },

  /** Yellow - changed from previous, needs review */
  YELLOW: { argb: 'FFFFFF00' },

  /** Light blue - new conversion, needs review */
  BLUE: { argb: 'FF87CEEB' },

  /** Light red - translation error */
  RED: { argb: 'FFFFCCCB' },

  /** White - no color (reset) */
  WHITE: { argb: 'FFFFFFFF' },
} as const;

/**
 * Status text values written to Excel
 */
export const STATUS_VALUES = {
  APPROVED: 'APPROVED',
  CHANGED: 'CHANGED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  ERROR: 'ERROR',
} as const;

/**
 * Map status to color
 */
export function getColorForStatus(status: keyof typeof STATUS_VALUES): typeof CELL_COLORS[keyof typeof CELL_COLORS] {
  switch (status) {
    case 'APPROVED':
      return CELL_COLORS.GREEN;
    case 'CHANGED':
      return CELL_COLORS.YELLOW;
    case 'NEEDS_REVIEW':
      return CELL_COLORS.BLUE;
    case 'ERROR':
      return CELL_COLORS.RED;
    default:
      return CELL_COLORS.WHITE;
  }
}

/**
 * Default column names (suggestions for auto-detection)
 */
export const DEFAULT_COLUMN_NAMES = {
  NRQL: ['NRQL', 'NRQL Query', 'New Relic Query', 'Query'],
  NEW_DQL: ['New DQL', 'DQL', 'Translated', 'Translation', 'Dynatrace Query'],
  OLD_DQL: ['Approved DQL', 'Old DQL', 'Previous', 'Approved', 'Expected'],
  STATUS: ['Status', 'Translation Status', 'Result'],
} as const;
