import { sanitizeCsvField, generateCsv } from '../utils/csvHelper';

describe('CSV Security and Formula Injection (CWE-1236) Protection', () => {
  test('Prepends apostrophe to formula execution triggers', () => {
    // Excel formula starting with =
    expect(sanitizeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");

    // Command execution formula
    expect(sanitizeCsvField('=cmd|/c calc!A0')).toBe("'=cmd|/c calc!A0");

    // Starting with +, -, @, \t
    expect(sanitizeCsvField('+12345')).toBe("'+12345");
    expect(sanitizeCsvField('-12345')).toBe("'-12345");
    expect(sanitizeCsvField('@SUM(1+1)')).toBe("'@SUM(1+1)");
    expect(sanitizeCsvField('\tTAB_PREFIX')).toBe("'\tTAB_PREFIX");
  });

  test('Properly escapes quotes and quotes fields with commas', () => {
    expect(sanitizeCsvField('Hello, World')).toBe('"Hello, World"');
    expect(sanitizeCsvField('Item with "Quotes"')).toBe('"Item with ""Quotes"""');
  });

  test('Safely formats multiple rows and columns', () => {
    const headers = ['Name', 'Phone', 'Coupon'];
    const rows = [
      ['John Doe', '+1234567890', '=PAYLOAD()'],
      ['Normal User', '+9876543210', 'SAVE-2026'],
    ];

    const csvOutput = generateCsv(headers, rows);
    expect(csvOutput).toContain("John Doe,'+1234567890,'=PAYLOAD()");
    expect(csvOutput).toContain("Normal User,'+9876543210,SAVE-2026");
  });
});

