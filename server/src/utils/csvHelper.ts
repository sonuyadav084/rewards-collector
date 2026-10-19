/**
 * CSV Utility with Formula Injection (CWE-1236) Protection
 */

export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Strip carriage returns
  str = str.replace(/\r/g, '');

  // Prevent CSV Formula Injection
  // If field starts with =, +, -, @, \t, prepend a single quote
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }

  // If contains commas, double-quotes, or newlines, quote the field and escape internal quotes
  if (/[",\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerRow = headers.map(sanitizeCsvField).join(',');
  const dataRows = rows.map((row) => row.map(sanitizeCsvField).join(','));
  return [headerRow, ...dataRows].join('\n');
}

