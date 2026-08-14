import ExcelJS = require('exceljs');
import {
  classifySheet,
  normalizeSheetName,
} from './gcc-import.constants';
import { excelCellToString, headerToField } from './gcc-import.normalize';

export type GccExcelRow = {
  sheet: string;
  rowNumber: number;
  name?: string;
  mobile?: unknown;
  gender?: unknown;
  dataFlow?: unknown;
  remarks?: string;
};

export type LoadWorkbookResult = {
  rows: GccExcelRow[];
  excludedSheets: string[];
  unknownSheets: string[];
};

export async function loadGccWorkbook(excelPath: string): Promise<LoadWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const rows: GccExcelRow[] = [];
  const excludedSheets: string[] = [];
  const unknownSheets: string[] = [];

  for (const worksheet of workbook.worksheets) {
    const sheetName = normalizeSheetName(worksheet.name);
    const kind = classifySheet(worksheet.name);
    if (kind === 'excluded') {
      excludedSheets.push(sheetName);
      continue;
    }
    if (kind === 'unknown') {
      unknownSheets.push(sheetName);
      continue;
    }

    const headerRow = worksheet.getRow(1);
    const fieldByCol = new Map<number, string>();
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = headerToField(excelCellToString(cell.value));
      if (field) fieldByCol.set(colNumber, field);
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: GccExcelRow = { sheet: sheetName, rowNumber };
      let hasAny = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const field = fieldByCol.get(colNumber);
        if (!field) return;
        const value = cell.value;
        if (field === 'name') {
          record.name = excelCellToString(value);
          if (record.name) hasAny = true;
        } else if (field === 'mobile') {
          record.mobile = value;
          if (excelCellToString(value)) hasAny = true;
        } else if (field === 'gender') {
          record.gender = value;
        } else if (field === 'dataFlow') {
          record.dataFlow = value;
        } else if (field === 'remarks') {
          record.remarks = excelCellToString(value);
        }
      });
      if (hasAny) rows.push(record);
    });
  }

  return { rows, excludedSheets, unknownSheets };
}
