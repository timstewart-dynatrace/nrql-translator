/**
 * Excel file processor for reading/writing NRQL queries and DQL translations
 */

import ExcelJS from 'exceljs';
import { CELL_COLORS } from '../constants';

export type CellColor = { argb: string };

export class ExcelProcessor {
  private workbook: ExcelJS.Workbook;
  private worksheet: ExcelJS.Worksheet | null = null;
  private headerRow: Map<string, number> = new Map();

  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Load an Excel file
   */
  async load(filePath: string, sheetName?: string): Promise<void> {
    await this.workbook.xlsx.readFile(filePath);

    if (sheetName) {
      this.worksheet = this.workbook.getWorksheet(sheetName) ?? null;
      if (!this.worksheet) {
        const available = this.workbook.worksheets.map(ws => ws.name).join(', ');
        throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${available}`);
      }
    } else {
      this.worksheet = this.workbook.worksheets[0] ?? null;
      if (!this.worksheet) {
        throw new Error('No worksheets found in the Excel file');
      }
    }

    // Build header map from first row
    this.buildHeaderMap();
  }

  /**
   * Build a map of header names to column numbers
   */
  private buildHeaderMap(): void {
    this.headerRow.clear();
    if (!this.worksheet) return;

    const firstRow = this.worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString().trim();
      if (value) {
        this.headerRow.set(value.toLowerCase(), colNumber);
      }
    });
  }

  /**
   * Get the worksheet name
   */
  getSheetName(): string {
    return this.worksheet?.name ?? '';
  }

  /**
   * Get available sheet names
   */
  getSheetNames(): string[] {
    return this.workbook.worksheets.map(ws => ws.name);
  }

  /**
   * Get the maximum row number with data
   */
  getMaxRow(): number {
    if (!this.worksheet) return 0;
    return this.worksheet.rowCount;
  }

  /**
   * Get the maximum column number with data
   */
  getMaxColumn(): number {
    if (!this.worksheet) return 0;
    return this.worksheet.columnCount;
  }

  /**
   * Resolve a column reference to a column number
   * Accepts: "A", "B", "AA", "1", "2", or header name like "NRQL Query"
   */
  resolveColumn(ref: string | number): number {
    if (typeof ref === 'number') {
      return ref;
    }

    const trimmed = ref.trim();

    // Check if it's a number string
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }

    // Check if it's a column letter (A, B, AA, etc.)
    if (/^[A-Za-z]+$/.test(trimmed)) {
      return this.letterToColumn(trimmed.toUpperCase());
    }

    // Try to find by header name (case-insensitive)
    const colNum = this.headerRow.get(trimmed.toLowerCase());
    if (colNum !== undefined) {
      return colNum;
    }

    throw new Error(`Cannot resolve column reference "${ref}". Use column letter (A, B), number (1, 2), or header name.`);
  }

  /**
   * Convert column letter to number (A=1, B=2, AA=27, etc.)
   */
  private letterToColumn(letters: string): number {
    let column = 0;
    for (let i = 0; i < letters.length; i++) {
      column = column * 26 + (letters.charCodeAt(i) - 64);
    }
    return column;
  }

  /**
   * Convert column number to letter (1=A, 2=B, 27=AA, etc.)
   */
  columnToLetter(column: number): string {
    let letter = '';
    while (column > 0) {
      const remainder = (column - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      column = Math.floor((column - 1) / 26);
    }
    return letter;
  }

  /**
   * Parse a row range string into an array of row numbers
   * Supports: "all", "5", "2-10", "2,5,10", "2-5,10,15-20"
   */
  parseRowRange(range: string, maxRow?: number): number[] {
    const max = maxRow ?? this.getMaxRow();
    const trimmed = range.trim().toLowerCase();

    if (trimmed === 'all') {
      // Return all rows except header (row 1)
      const rows: number[] = [];
      for (let i = 2; i <= max; i++) {
        rows.push(i);
      }
      return rows;
    }

    const rows: Set<number> = new Set();
    const parts = trimmed.split(',');

    for (const part of parts) {
      const trimmedPart = part.trim();

      if (trimmedPart.includes('-')) {
        // Range: "2-10"
        const [start, end] = trimmedPart.split('-').map(s => parseInt(s.trim(), 10));
        if (isNaN(start) || isNaN(end)) {
          throw new Error(`Invalid row range: "${trimmedPart}"`);
        }
        for (let i = start; i <= Math.min(end, max); i++) {
          if (i >= 1) rows.add(i);
        }
      } else {
        // Single row: "5"
        const row = parseInt(trimmedPart, 10);
        if (isNaN(row)) {
          throw new Error(`Invalid row number: "${trimmedPart}"`);
        }
        if (row >= 1 && row <= max) {
          rows.add(row);
        }
      }
    }

    return Array.from(rows).sort((a, b) => a - b);
  }

  /**
   * Get a cell value as string
   */
  getCellValue(row: number, column: string | number): string {
    if (!this.worksheet) {
      throw new Error('No worksheet loaded');
    }

    const colNum = this.resolveColumn(column);
    const cell = this.worksheet.getCell(row, colNum);

    if (cell.value === null || cell.value === undefined) {
      return '';
    }

    // Handle rich text
    if (typeof cell.value === 'object' && 'richText' in cell.value) {
      return (cell.value.richText as Array<{ text: string }>)
        .map(rt => rt.text)
        .join('');
    }

    // Handle formula results
    if (typeof cell.value === 'object' && 'result' in cell.value) {
      return String(cell.value.result ?? '');
    }

    return String(cell.value);
  }

  /**
   * Set a cell value
   */
  setCellValue(row: number, column: string | number, value: string): void {
    if (!this.worksheet) {
      throw new Error('No worksheet loaded');
    }

    const colNum = this.resolveColumn(column);
    const cell = this.worksheet.getCell(row, colNum);
    cell.value = value;
  }

  /**
   * Set cell background color
   */
  setCellBackground(row: number, column: string | number, color: CellColor): void {
    if (!this.worksheet) {
      throw new Error('No worksheet loaded');
    }

    const colNum = this.resolveColumn(column);
    const cell = this.worksheet.getCell(row, colNum);

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: color,
    };
  }

  /**
   * Clear cell background color
   */
  clearCellBackground(row: number, column: string | number): void {
    this.setCellBackground(row, column, CELL_COLORS.WHITE);
  }

  /**
   * Set multiple cell properties at once
   */
  updateCell(
    row: number,
    column: string | number,
    options: {
      value?: string;
      backgroundColor?: CellColor;
    }
  ): void {
    if (options.value !== undefined) {
      this.setCellValue(row, column, options.value);
    }
    if (options.backgroundColor) {
      this.setCellBackground(row, column, options.backgroundColor);
    }
  }

  /**
   * Check if a row is empty (no data in any cell)
   */
  isRowEmpty(row: number): boolean {
    if (!this.worksheet) return true;

    const rowData = this.worksheet.getRow(row);
    let isEmpty = true;

    rowData.eachCell((cell) => {
      if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
        isEmpty = false;
      }
    });

    return isEmpty;
  }

  /**
   * Get header names from first row
   */
  getHeaders(): string[] {
    return Array.from(this.headerRow.keys());
  }

  /**
   * Auto-detect a column by trying multiple header names
   */
  findColumnByHeaders(possibleHeaders: string[]): number | null {
    for (const header of possibleHeaders) {
      const colNum = this.headerRow.get(header.toLowerCase());
      if (colNum !== undefined) {
        return colNum;
      }
    }
    return null;
  }

  /**
   * Save the workbook to a file
   */
  async save(outputPath: string): Promise<void> {
    await this.workbook.xlsx.writeFile(outputPath);
  }

  /**
   * Create a new workbook (for testing or creating new files)
   */
  createNew(sheetName: string = 'Sheet1'): void {
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = this.workbook.addWorksheet(sheetName);
    this.headerRow.clear();
  }

  /**
   * Add a header row
   */
  setHeaders(headers: string[]): void {
    if (!this.worksheet) {
      throw new Error('No worksheet loaded');
    }

    const headerRow = this.worksheet.getRow(1);
    headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
      this.headerRow.set(header.toLowerCase(), index + 1);
    });
    headerRow.commit();
  }

  /**
   * Filter rows by column value
   * Returns row numbers where the column value matches any of the filter values
   * @param rows - Row numbers to filter from
   * @param column - Column to check
   * @param filterValues - Values to match (case-insensitive)
   */
  filterRowsByColumnValue(
    rows: number[],
    column: string | number,
    filterValues: string[]
  ): number[] {
    const colNum = this.resolveColumn(column);
    const normalizedFilters = filterValues.map(v => v.trim().toLowerCase());

    return rows.filter(row => {
      const cellValue = this.getCellValue(row, colNum).trim().toLowerCase();
      return normalizedFilters.includes(cellValue);
    });
  }

  /**
   * Get unique values from a column
   * Useful for displaying available filter options
   */
  getUniqueColumnValues(column: string | number, rows?: number[]): string[] {
    const colNum = this.resolveColumn(column);
    const targetRows = rows ?? this.parseRowRange('all');
    const values = new Set<string>();

    for (const row of targetRows) {
      const value = this.getCellValue(row, colNum).trim();
      if (value) {
        values.add(value);
      }
    }

    return Array.from(values).sort();
  }
}
