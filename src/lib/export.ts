import * as XLSX from "xlsx";

export interface ExportData {
  headers: string[];
  rows: string[][];
  sheetName?: string;
}

export function exportToCSV(data: ExportData): Buffer {
  const lines: string[] = [];

  // Header row
  lines.push(data.headers.map(escapeCSV).join(","));

  // Data rows
  for (const row of data.rows) {
    // Ensure each row has the same length as headers
    const padded = [...row];
    while (padded.length < data.headers.length) padded.push("");
    lines.push(padded.slice(0, data.headers.length).map(escapeCSV).join(","));
  }

  // Add BOM for Excel compatibility with UTF-8
  const bom = "﻿";
  return Buffer.from(bom + lines.join("\r\n"), "utf-8");
}

export function exportToExcel(data: ExportData): Buffer {
  const wb = XLSX.utils.book_new();

  // Force all cells to text type — prevents xlsx from auto-converting
  // values like "$0.0001477" or "4,706%" into numbers and losing precision.
  const sheetData = [data.headers, ...data.rows].map((row) =>
    row.map((cell) => ({ v: String(cell ?? ""), t: "s" }))
  );
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Style header row (bold, background)
  const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
    };
  }

  // Auto-fit column widths
  const colWidths = data.headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...data.rows.map((r) => String(r[i] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, data.sheetName || "Data");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function escapeCSV(value: string): string {
  const str = String(value ?? "");
  // Quote if contains comma, newline, or double quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function getMimeType(format: "csv" | "xlsx"): string {
  return format === "xlsx"
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "text/csv; charset=utf-8";
}

export function getFileExtension(format: "csv" | "xlsx"): string {
  return format === "xlsx" ? "xlsx" : "csv";
}
