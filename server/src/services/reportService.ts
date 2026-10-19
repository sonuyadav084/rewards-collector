import { FilterQuery } from 'mongoose';
import { CouponSubmission, ICouponSubmission } from '../models/CouponSubmission';
import { generateCsv } from '../utils/csvHelper';

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  customerName?: string;
  mobileNumber?: string;
  couponNumber?: string;
}

export class ReportService {
  /**
   * Generates a sanitized CSV string of submissions matching query filters
   */
  public static async exportSubmissionsCsv(filters: ReportFilterParams): Promise<string> {
    const query: FilterQuery<ICouponSubmission> = {};

    if (filters.status && ['Pending', 'Approved', 'Rejected'].includes(filters.status)) {
      query.status = filters.status;
    }

    if (filters.customerName) {
      query.customerName = { $regex: filters.customerName.trim(), $options: 'i' };
    }

    if (filters.mobileNumber) {
      query.customerMobile = { $regex: filters.mobileNumber.trim(), $options: 'i' };
    }

    if (filters.couponNumber) {
      query.couponNumber = { $regex: filters.couponNumber.trim(), $options: 'i' };
    }

    if (filters.startDate || filters.endDate) {
      query.submittedAt = {};
      if (filters.startDate) {
        query.submittedAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Include full day
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        query.submittedAt.$lte = end;
      }
    }

    // Stream/cursor or fetch records (limit to 50,000 for safety)
    const submissions = await CouponSubmission.find(query)
      .sort({ submittedAt: -1 })
      .limit(50000)
      .lean();

    const headers = [
      'Submission Reference',
      'Customer Name',
      'Mobile Number',
      'Coupon Number',
      'Submission Date (UTC)',
      'Status',
      'Feedback Rating',
      'Feedback Comment',
      'Reviewed Date (UTC)',
      'Rejection Reason',
    ];

    const rows = submissions.map((sub) => [
      sub.submissionReference,
      sub.customerName,
      sub.customerMobile,
      sub.couponNumber,
      sub.submittedAt ? new Date(sub.submittedAt).toISOString() : '',
      sub.status,
      sub.feedbackRating || '',
      sub.feedbackComment || '',
      sub.reviewedAt ? new Date(sub.reviewedAt).toISOString() : '',
      sub.rejectionReason || '',
    ]);

    return generateCsv(headers, rows);
  }
}

