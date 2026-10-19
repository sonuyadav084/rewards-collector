import { normalizeMobileNumber } from '../utils/phoneNormalizer';
import { FileStorageService } from '../services/fileStorageService';

describe('Phone Normalization and Security Logic', () => {
  test('Standardizes phone numbers with country code', () => {
    const result = normalizeMobileNumber('+1 (555) 019-2834');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('+15550192834');
  });

  test('Adds plus prefix if missing and validates digits length', () => {
    const result = normalizeMobileNumber('9876543210');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('+9876543210');
  });

  test('Rejects invalid phone numbers with too few digits', () => {
    const result = normalizeMobileNumber('12345');
    expect(result.isValid).toBe(false);
  });
});

describe('File Magic Bytes Validation', () => {
  test('Identifies valid JPEG signature', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const result = FileStorageService.validateMagicBytes(jpegBuffer);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
  });

  test('Identifies valid PNG signature', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = FileStorageService.validateMagicBytes(pngBuffer);
    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe('image/png');
  });

  test('Rejects executable or malicious file spoofing an image extension', () => {
    // Windows PE EXE header: 'MZ' (0x4D, 0x5A)
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    const result = FileStorageService.validateMagicBytes(exeBuffer);
    expect(result.isValid).toBe(false);
  });
});

