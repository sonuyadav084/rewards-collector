import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedAdminRequest } from '../middleware/auth.middleware';
import { ImportService } from '../services/importService';
import { RegisteredCoupon } from '../models/RegisteredCoupon';
import { AuditLogService } from '../services/auditLogService';

export const confirmImportSchema = z.object({
  previewId: z.string().uuid('Invalid preview identifier'),
});

export class AdminCouponController {
  /**
   * Parse uploaded CSV or Excel and provide detailed validation preview
   */
  public static async previewImport(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'A CSV or Excel file is required for coupon import.' });
      return;
    }

    try {
      const preview = await ImportService.previewCouponImport(req.file.buffer);
      res.status(200).json({
        success: true,
        message: 'File parsed and validated successfully.',
        data: preview,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to process spreadsheet.',
      });
    }
  }

  /**
   * Commit verified coupons from preview session into database
   */
  public static async confirmImport(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const { previewId } = req.body;
    const admin = req.admin!;

    try {
      const result = await ImportService.confirmImport(previewId, admin.id);

      // Audit Log
      await AuditLogService.logAction({
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'COUPONS_IMPORTED',
        targetType: 'RegisteredCoupon',
        targetId: result.batchId,
        targetReference: result.batchId,
        afterState: { totalImported: result.totalImported },
        reason: `Batch import of ${result.totalImported} coupons`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        message: `Successfully registered ${result.totalImported} valid coupons.`,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to complete coupon import.',
      });
    }
  }

  /**
   * Download sample CSV template
   */
  public static async downloadTemplate(
    _req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const csvContent = ImportService.getSampleCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="coupons_sample_template.csv"');
    res.send(csvContent);
  }

  /**
   * Download error report for rejected rows from a preview session
   */
  public static async downloadErrorReport(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const { previewId } = req.params;

    try {
      const csvContent = ImportService.generateErrorReportCsv(previewId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="import_errors_${previewId}.csv"`);
      res.send(csvContent);
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: err.message || 'Error report not found.',
      });
    }
  }

  /**
   * List registered coupons with search, submission status filter, and pagination
   */
  public static async listRegisteredCoupons(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const { search, isSubmitted } = req.query;
    const filter: any = {};

    if (isSubmitted !== undefined && isSubmitted !== '') {
      filter.isSubmitted = isSubmitted === 'true';
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { couponNumber: { $regex: search.trim(), $options: 'i' } },
        { normalizedCouponNumber: { $regex: search.trim().toUpperCase(), $options: 'i' } },
      ];
    }

    const [coupons, totalCount] = await Promise.all([
      RegisteredCoupon.find(filter)
        .populate('submissionId', 'submissionReference status customerName customerMobile submittedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RegisteredCoupon.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
          totalCount,
        },
      },
    });
  }
}

