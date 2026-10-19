import { Response } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { AuthenticatedAdminRequest } from '../middleware/auth.middleware';
import { CouponSubmission, ICouponSubmission } from '../models/CouponSubmission';
import { FileStorageService } from '../services/fileStorageService';
import { AuditLogService } from '../services/auditLogService';

export const updateStatusSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  rejectionReason: z.string().max(500).optional(),
  reviewNotes: z.string().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'Rejected' && (!data.rejectionReason || !data.rejectionReason.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rejectionReason'],
      message: 'Rejection reason is mandatory when rejecting a submission.',
    });
  }
});

export class AdminSubmissionController {
  /**
   * Search, filter, and paginate customer submissions
   */
  public static async getSubmissions(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 15));
    const skip = (page - 1) * limit;

    const { search, status, startDate, endDate, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;

    const query: FilterQuery<ICouponSubmission> = {};

    // Status filter
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status as string)) {
      query.status = status;
    }

    // Search across reference, name, mobile, coupon
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      query.$or = [
        { submissionReference: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerMobile: { $regex: term, $options: 'i' } },
        { couponNumber: { $regex: term, $options: 'i' } },
        { normalizedCouponNumber: { $regex: term.toUpperCase(), $options: 'i' } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) {
        query.submittedAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.submittedAt.$lte = end;
      }
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortField = ['submittedAt', 'customerName', 'status'].includes(sortBy as string)
      ? (sortBy as string)
      : 'submittedAt';

    const [submissions, totalCount] = await Promise.all([
      CouponSubmission.find(query)
        .populate('reviewedBy', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      CouponSubmission.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
          totalCount,
        },
      },
    });
  }

  /**
   * Get submission details by ID
   */
  public static async getSubmissionById(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const submission = await CouponSubmission.findById(id)
      .populate('reviewedBy', 'name email')
      .lean();

    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  }

  /**
   * Update submission review status (Approve or Reject with reason)
   */
  public static async updateSubmissionStatus(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { status, rejectionReason, reviewNotes } = req.body;
    const admin = req.admin!;

    const submission = await CouponSubmission.findById(id);

    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found.' });
      return;
    }

    const previousState = {
      status: submission.status,
      rejectionReason: submission.rejectionReason,
      reviewedAt: submission.reviewedAt,
      reviewedBy: submission.reviewedBy,
    };

    // Update status
    submission.status = status;
    submission.reviewedAt = new Date();
    submission.reviewedBy = admin.id as any;
    submission.reviewNotes = reviewNotes?.trim() || '';

    if (status === 'Rejected') {
      submission.rejectionReason = rejectionReason.trim();
    } else {
      submission.rejectionReason = undefined;
    }

    await submission.save();

    // Audit Logging
    await AuditLogService.logAction({
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: status === 'Approved' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      targetType: 'CouponSubmission',
      targetId: submission._id.toString(),
      targetReference: submission.submissionReference,
      beforeState: previousState,
      afterState: {
        status: submission.status,
        rejectionReason: submission.rejectionReason,
        reviewedAt: submission.reviewedAt,
      },
      reason: status === 'Rejected' ? rejectionReason : reviewNotes || 'Administrative review completed',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `Submission successfully marked as ${status}.`,
      data: submission,
    });
  }

  /**
   * Securely stream uploaded coupon photo for admin review
   */
  public static async streamPhoto(
    req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const submission = await CouponSubmission.findById(id);

    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found.' });
      return;
    }

    try {
      const filePath = FileStorageService.getSecureFilePath(submission.photoStoragePath);
      res.setHeader('Content-Type', submission.photoMimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, no-transform, max-age=3600');
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(404).json({ success: false, error: 'Coupon image file could not be retrieved.' });
    }
  }
}

