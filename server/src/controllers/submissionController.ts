import { Response } from 'express';
import { z } from 'zod';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { AuthenticatedCustomerRequest } from '../middleware/auth.middleware';
import { CouponService } from '../services/couponService';
import { FileStorageService } from '../services/fileStorageService';
import { CouponSubmission } from '../models/CouponSubmission';
import { AuthService } from '../services/authService';
import { OcrService } from '../services/ocrService';
import { normalizeMobileNumber } from '../utils/phoneNormalizer';
import { logger } from '../utils/logger';

export const createSubmissionSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  customerMobile: z.string().min(10, 'Valid 10-15 digit mobile number is required').max(20).optional(),
  couponNumber: z.string().min(4, 'Coupon number is required').max(32),
  feedbackRating: z.enum(['Good', 'Better', 'Excellent']).optional(),
  feedbackComment: z.string().max(1000).optional(),
});

export class SubmissionController {
  /**
   * Submit coupon and photo directly (without requiring OTP verification step)
   */
  public static async createSubmission(
    req: AuthenticatedCustomerRequest,
    res: Response
  ): Promise<void> {
    const rawMobile = req.customer?.mobileNumber || req.body.customerMobile;
    if (!rawMobile) {
      res.status(400).json({ success: false, error: 'Mobile phone number is required.' });
      return;
    }

    const normMobile = normalizeMobileNumber(rawMobile);
    if (!normMobile.isValid) {
      res.status(400).json({ success: false, error: normMobile.error || 'Invalid mobile phone number format.' });
      return;
    }
    const customerMobile = normMobile.normalized;

    if (!req.file) {
      res.status(400).json({ success: false, error: 'Coupon image file is required.' });
      return;
    }

    const { customerName, couponNumber, feedbackRating, feedbackComment } = req.body;

    let savedFile: { filename: string; absolutePath: string } | null = null;

    try {
      // 1. Securely persist uploaded image
      savedFile = await FileStorageService.saveUploadedFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // 2. Validate, lock, and record coupon submission
      const submission = await CouponService.processCouponSubmission({
        customerName: customerName.trim(),
        customerMobile,
        rawCouponNumber: couponNumber,
        photoStoragePath: savedFile.filename,
        photoOriginalName: req.file.originalname,
        photoMimeType: req.file.mimetype,
        photoFileSize: req.file.size,
        feedbackRating,
        feedbackComment,
      });

      // Generate a customer session token so customer can immediately view their history
      const customerToken = AuthService.generateCustomerToken(customerMobile);

      res.status(201).json({
        success: true,
        message: 'Coupon submitted and verified successfully.',
        data: {
          submissionReference: submission.submissionReference,
          couponNumber: submission.couponNumber,
          customerName: submission.customerName,
          customerMobile: submission.customerMobile,
          status: submission.status,
          isAutoApproved: submission.isAutoApproved,
          feedbackRating: submission.feedbackRating,
          feedbackComment: submission.feedbackComment,
          submittedAt: submission.submittedAt,
          token: customerToken,
        },
      });
    } catch (err: any) {
      // Clean up orphaned uploaded file if submission database record failed
      if (savedFile) {
        await FileStorageService.deleteFile(savedFile.filename);
      }

      logger.warn(`Submission failed for mobile ${customerMobile}: ${err.message}`);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to submit coupon.',
      });
    }
  }

  /**
   * Fetch customer submission history (scoped to authenticated customer or requested mobile)
   */
  public static async getMySubmissions(
    req: AuthenticatedCustomerRequest,
    res: Response
  ): Promise<void> {
    let customerMobile = req.customer?.mobileNumber;

    if (!customerMobile && req.query.mobile) {
      const normResult = normalizeMobileNumber(req.query.mobile as string);
      if (normResult.isValid) {
        customerMobile = normResult.normalized;
      }
    }

    if (!customerMobile) {
      res.status(401).json({ success: false, error: 'Mobile phone number or session token required.' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [submissions, totalCount, statusCounts] = await Promise.all([
      CouponSubmission.find({ customerMobile })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('submissionReference couponNumber customerName status rejectionReason feedbackRating feedbackComment isAutoApproved submittedAt reviewedAt')
        .lean(),
      CouponSubmission.countDocuments({ customerMobile }),
      CouponSubmission.aggregate([
        { $match: { customerMobile } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {
      total: totalCount,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    statusCounts.forEach((item) => {
      if (item._id === 'Pending') counts.pending = item.count;
      else if (item._id === 'Approved') counts.approved = item.count;
      else if (item._id === 'Rejected') counts.rejected = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        submissions,
        counts,
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
   * Get single submission detail
   */
  public static async getMySubmissionById(
    req: AuthenticatedCustomerRequest,
    res: Response
  ): Promise<void> {
    let customerMobile = req.customer?.mobileNumber;
    if (!customerMobile && req.query.mobile) {
      const normResult = normalizeMobileNumber(req.query.mobile as string);
      if (normResult.isValid) customerMobile = normResult.normalized;
    }

    const { id } = req.params;

    const query: any = { _id: id };
    if (customerMobile) {
      query.customerMobile = customerMobile;
    }

    const submission = await CouponSubmission.findOne(query).select('-__v');

    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission record not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  }

  /**
   * Securely stream customer's own uploaded photo
   */
  public static async streamMyPhoto(
    req: AuthenticatedCustomerRequest,
    res: Response
  ): Promise<void> {
    let customerMobile = req.customer?.mobileNumber;
    if (!customerMobile && req.query.mobile) {
      const normResult = normalizeMobileNumber(req.query.mobile as string);
      if (normResult.isValid) customerMobile = normResult.normalized;
    }

    const { id } = req.params;

    const query: any = { _id: id };
    if (customerMobile) {
      query.customerMobile = customerMobile;
    }

    const submission = await CouponSubmission.findOne(query);

    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found or unauthorized.' });
      return;
    }

    try {
      const filePath = FileStorageService.getSecureFilePath(submission.photoStoragePath);
      res.setHeader('Content-Type', submission.photoMimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, no-transform, max-age=1800');
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(404).json({ success: false, error: 'Photo file could not be located.' });
    }
  }

  /**
   * Scan uploaded coupon photo using OCR and automatically check against database catalog
   */
  public static async scanCouponPhoto(
    req: AuthenticatedCustomerRequest,
    res: Response
  ): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Coupon image file is required for scanning.' });
      return;
    }

    const tempPath = path.join(
      os.tmpdir(),
      `ocr_scan_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`
    );

    try {
      await fs.promises.writeFile(tempPath, req.file.buffer);
      const scanResult = await OcrService.scanAndVerifyCoupon(tempPath);
      await fs.promises.unlink(tempPath).catch(() => {});

      res.status(200).json({
        success: scanResult.success,
        isTemplateValid: scanResult.isTemplateValid,
        matchedTemplateName: scanResult.matchedTemplateName,
        detectedCode: scanResult.detectedCode,
        verified: scanResult.verified,
        isSubmitted: scanResult.isSubmitted,
        message: scanResult.message,
        confidence: scanResult.confidence,
      });
    } catch (error) {
      await fs.promises.unlink(tempPath).catch(() => {});
      logger.error('scanCouponPhoto error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to scan coupon photo. Please enter code manually.',
      });
    }
  }
}
