import crypto from 'crypto';
import { RegisteredCoupon } from '../models/RegisteredCoupon';
import { CouponSubmission, ICouponSubmission } from '../models/CouponSubmission';
import { Customer } from '../models/Customer';
import { normalizeCouponNumber } from '../utils/couponNormalizer';
import { logger } from '../utils/logger';

export interface SubmitCouponParams {
  customerName: string;
  customerMobile: string;
  rawCouponNumber: string;
  photoBuffer: Buffer;
  photoOriginalName: string;
  photoMimeType: string;
}

export class CouponService {
  /**
   * Generates a unique, human-readable submission reference ID
   * Example: SUB-20261013-A1B2C3
   */
  public static generateSubmissionReference(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SUB-${dateStr}-${randomHex}`;
  }

  /**
   * Validates and submits a coupon with strict atomic concurrency protection
   */
  public static async processCouponSubmission(
    params: {
      customerName: string;
      customerMobile: string;
      rawCouponNumber: string;
      photoStoragePath: string;
      photoOriginalName: string;
      photoMimeType: string;
      photoFileSize: number;
      feedbackRating?: 'Good' | 'Better' | 'Excellent';
      feedbackComment?: string;
    }
  ): Promise<ICouponSubmission> {
    const {
      customerName,
      customerMobile,
      rawCouponNumber,
      photoStoragePath,
      photoOriginalName,
      photoMimeType,
      photoFileSize,
      feedbackRating,
      feedbackComment,
    } = params;

    // Verify customer mobile is locked to the registered name
    let registeredCustomer = await Customer.findOne({ mobileNumber: customerMobile });
    if (registeredCustomer) {
      if (registeredCustomer.name.trim().toLowerCase() !== customerName.trim().toLowerCase()) {
        throw new Error('This mobile number is already registered');
      }
    } else {
      registeredCustomer = await Customer.create({
        name: customerName.trim(),
        mobileNumber: customerMobile,
        lastLoginAt: new Date(),
      });
    }

    // 1. Normalize coupon number
    const norm = normalizeCouponNumber(rawCouponNumber);
    if (!norm.isValid) {
      throw new Error(norm.error || 'Invalid coupon number format.');
    }
    const normalizedCouponNumber = norm.normalized;

    // 2. Check pre-existence in RegisteredCoupons
    const existingRegistration = await RegisteredCoupon.findOne({ normalizedCouponNumber });
    if (!existingRegistration) {
      throw new Error('This coupon number is not registered in our system.');
    }

    if (existingRegistration.isSubmitted) {
      throw new Error('This coupon has already been submitted and cannot be reused.');
    }

    // 3. Check CouponSubmission collection for double-check
    const existingSubmission = await CouponSubmission.findOne({ normalizedCouponNumber });
    if (existingSubmission) {
      throw new Error('This coupon has already been submitted and processed.');
    }

    // 4. ATOMIC CONCURRENCY LOCK:
    // Atomic findOneAndUpdate ensures only ONE concurrent request can claim the registered coupon!
    const atomicClaim = await RegisteredCoupon.findOneAndUpdate(
      { normalizedCouponNumber, isSubmitted: false },
      { $set: { isSubmitted: true } },
      { new: true }
    );

    if (!atomicClaim) {
      // Another concurrent worker claimed it milliseconds earlier
      logger.warn(`Concurrency race prevented: coupon ${normalizedCouponNumber} was claimed simultaneously.`);
      throw new Error('This coupon has already been submitted by another user.');
    }

    try {
      // 5. Create the Submission Record
      const submissionReference = this.generateSubmissionReference();

      const newSubmission = await CouponSubmission.create({
        submissionReference,
        couponNumber: norm.original.trim(),
        normalizedCouponNumber,
        customerName: customerName.trim(),
        customerMobile,
        photoStoragePath,
        photoOriginalName,
        photoMimeType,
        photoFileSize,
        status: 'Approved',
        isAutoApproved: true,
        feedbackRating: feedbackRating || 'Excellent',
        feedbackComment: feedbackComment?.trim() || undefined,
        submittedAt: new Date(),
        reviewedAt: new Date(),
      });

      // Link submission ID back to registered coupon
      atomicClaim.submissionId = newSubmission._id;
      await atomicClaim.save();

      return newSubmission;
    } catch (err: any) {
      // If duplicate key error occurred on CouponSubmission (code 11000)
      if (err.code === 11000) {
        throw new Error('This coupon has already been submitted and recorded.');
      }

      logger.error('Failed to create coupon submission record:', err);
      // If unexpected error, release lock if needed, or leave locked to be safe
      throw err;
    }
  }
}

