import xlsx from 'xlsx';
import crypto from 'crypto';
import { RegisteredCoupon } from '../models/RegisteredCoupon';
import { normalizeCouponNumber } from '../utils/couponNormalizer';
import { generateCsv } from '../utils/csvHelper';
import { logger } from '../utils/logger';

export interface RowError {
  rowNumber: number;
  rawValue: string;
  reason: string;
}

export interface ImportPreviewResult {
  previewId: string;
  totalRowsRead: number;
  validNewCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  alreadyRegisteredCount: number;
  validNewCoupons: Array<{ original: string; normalized: string }>;
  errors: RowError[];
}

// In-memory cache for preview sessions (5-minute TTL)
interface CachedPreview {
  expiresAt: number;
  validNewCoupons: Array<{ original: string; normalized: string }>;
  errors: RowError[];
}

const previewCache = new Map<string, CachedPreview>();

export class ImportService {
  /**
   * Generates a sample CSV template for coupon imports
   */
  public static getSampleCsvTemplate(): string {
    const headers = ['Coupon Number'];
    const sampleRows = [
      ['PROMO-2026-0001'],
      ['PROMO-2026-0002'],
      ['SUMMER-SAVE-050'],
      ['VIP-LOYALTY-009'],
    ];
    return generateCsv(headers, sampleRows);
  }

  /**
   * Parses buffer of CSV or Excel file and generates comprehensive preview & validation report
   */
  public static async previewCouponImport(fileBuffer: Buffer): Promise<ImportPreviewResult> {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('The uploaded spreadsheet does not contain any sheets.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = (xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      header: 1, // raw array of rows
      defval: '',
      blankrows: false,
    }) as unknown) as unknown[][];

    if (!rawData || rawData.length === 0) {
      throw new Error('The uploaded file is empty.');
    }

    // Determine coupon column index
    let headerRowIndex = -1;
    let couponColIndex = 0;

    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const foundIdx = row.findIndex((cell) => {
          const str = String(cell).toLowerCase().trim();
          return str.includes('coupon') || str.includes('code');
        });
        if (foundIdx !== -1) {
          headerRowIndex = i;
          couponColIndex = foundIdx;
          break;
        }
      }
    }

    const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    const dataRows = rawData.slice(startIndex);

    if (dataRows.length === 0) {
      throw new Error('No data rows found below the header.');
    }

    if (dataRows.length > 10000) {
      throw new Error('File exceeds the maximum limit of 10,000 coupons per import batch.');
    }

    const errors: RowError[] = [];
    const seenInFile = new Set<string>();
    const candidates: Array<{ rowNumber: number; original: string; normalized: string }> = [];

    // First pass: file-level validation & deduplication
    dataRows.forEach((row, idx) => {
      const rowNumber = startIndex + idx + 1;
      const rawCell = Array.isArray(row) ? row[couponColIndex] : '';
      const rawStr = String(rawCell ?? '').trim();

      if (!rawStr) {
        errors.push({
          rowNumber,
          rawValue: '',
          reason: 'Row is blank or contains empty coupon value.',
        });
        return;
      }

      const normResult = normalizeCouponNumber(rawStr);
      if (!normResult.isValid) {
        errors.push({
          rowNumber,
          rawValue: rawStr,
          reason: normResult.error || 'Invalid coupon format.',
        });
        return;
      }

      if (seenInFile.has(normResult.normalized)) {
        errors.push({
          rowNumber,
          rawValue: rawStr,
          reason: `Duplicate coupon number within this file (Normalized: ${normResult.normalized}).`,
        });
        return;
      }

      seenInFile.add(normResult.normalized);
      candidates.push({
        rowNumber,
        original: normResult.original,
        normalized: normResult.normalized,
      });
    });

    // Second pass: database check for existing registrations
    const normalizedCandidateList = candidates.map((c) => c.normalized);
    const existingRecords = await RegisteredCoupon.find({
      normalizedCouponNumber: { $in: normalizedCandidateList },
    }).select('normalizedCouponNumber');

    const existingSet = new Set(existingRecords.map((r) => r.normalizedCouponNumber));

    const validNewCoupons: Array<{ original: string; normalized: string }> = [];
    let alreadyRegisteredCount = 0;

    candidates.forEach((cand) => {
      if (existingSet.has(cand.normalized)) {
        alreadyRegisteredCount += 1;
        errors.push({
          rowNumber: cand.rowNumber,
          rawValue: cand.original,
          reason: `Coupon is already registered in the database (Normalized: ${cand.normalized}).`,
        });
      } else {
        validNewCoupons.push({
          original: cand.original,
          normalized: cand.normalized,
        });
      }
    });

    // Generate unique preview token and cache for confirmation
    const previewId = crypto.randomUUID();
    previewCache.set(previewId, {
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
      validNewCoupons,
      errors,
    });

    // Clean up expired cache items
    const now = Date.now();
    for (const [key, value] of previewCache.entries()) {
      if (value.expiresAt < now) {
        previewCache.delete(key);
      }
    }

    const duplicateInFileCount = errors.filter((e) => e.reason.includes('within this file')).length;
    const invalidCount = errors.length - duplicateInFileCount - alreadyRegisteredCount;

    return {
      previewId,
      totalRowsRead: dataRows.length,
      validNewCount: validNewCoupons.length,
      invalidCount,
      duplicateInFileCount,
      alreadyRegisteredCount,
      validNewCoupons: validNewCoupons.slice(0, 50), // Send first 50 sample items for preview
      errors: errors.slice(0, 100), // First 100 errors for display
    };
  }

  /**
   * Confirms the import and commits the coupons into the database
   */
  public static async confirmImport(
    previewId: string,
    adminId: string
  ): Promise<{
    batchId: string;
    totalImported: number;
  }> {
    const cached = previewCache.get(previewId);

    if (!cached || cached.expiresAt < Date.now()) {
      throw new Error('Import preview session has expired. Please re-upload your file to preview and confirm.');
    }

    if (cached.validNewCoupons.length === 0) {
      throw new Error('No valid new coupons to import.');
    }

    const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const documentsToInsert = cached.validNewCoupons.map((item) => ({
      couponNumber: item.original,
      normalizedCouponNumber: item.normalized,
      isSubmitted: false,
      importBatchId: batchId,
      importedBy: adminId,
    }));

    // Batch insert using ordered: false so individual errors (if any) don't stop the batch
    const insertResult = await RegisteredCoupon.insertMany(documentsToInsert, { ordered: false });

    // Clean up preview cache
    previewCache.delete(previewId);

    logger.info(`Admin ${adminId} successfully imported ${insertResult.length} coupons in batch ${batchId}`);

    return {
      batchId,
      totalImported: insertResult.length,
    };
  }

  /**
   * Generates a downloadable CSV report of rejected rows for an import
   */
  public static generateErrorReportCsv(previewId: string): string {
    const cached = previewCache.get(previewId);
    if (!cached) {
      throw new Error('Import preview session not found or expired.');
    }

    const headers = ['Row Number', 'Provided Value', 'Rejection Reason'];
    const rows = cached.errors.map((e) => [e.rowNumber, e.rawValue, e.reason]);

    return generateCsv(headers, rows);
  }
}

