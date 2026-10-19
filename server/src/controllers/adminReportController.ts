import { Response } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/auth.middleware';
import { ReportService } from '../services/reportService';
import { AuditLogService } from '../services/auditLogService';

export class AdminReportController {
  /**
   * Export submission reports as CSV with formula-injection sanitization
   */
  public static async exportSubmissionsCsv(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const admin = req.admin!;
    const { startDate, endDate, status, customerName, mobileNumber, couponNumber } = req.query;

    try {
      const csvData = await ReportService.exportSubmissionsCsv({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
        customerName: customerName as string,
        mobileNumber: mobileNumber as string,
        couponNumber: couponNumber as string,
      });

      // Audit Log
      await AuditLogService.logAction({
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'REPORT_EXPORTED',
        targetType: 'CouponSubmission',
        targetId: 'REPORT',
        reason: 'Exported submissions CSV report',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      const filename = `submissions_report_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate CSV export.',
      });
    }
  }
}

