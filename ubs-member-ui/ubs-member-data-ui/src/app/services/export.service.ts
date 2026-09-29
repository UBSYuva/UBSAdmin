import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  constructor() { }

  exportToExcel(tableId: string, fileName: string): void {
    const table = document.getElementById(tableId);
    const ws = XLSX.utils.table_to_sheet(table); // Convert the HTML table to a sheet
    const wb = XLSX.utils.book_new(); // Create a new workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1'); // Append the sheet to the workbook

    // Write the workbook to a file with the specified name
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }
}
