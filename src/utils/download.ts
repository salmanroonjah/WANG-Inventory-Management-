/** Saves text as a file. Uses a Blob so large files and characters like "#" are preserved. */
export function downloadCsv(content: string, filename: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Quotes a value for CSV (handles commas, quotes, new lines, undefined). */
export function csvField(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(csvField).join(',')).join('\r\n');
}
