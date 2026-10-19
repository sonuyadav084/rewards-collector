import { Response } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/auth.middleware';
import { RegisteredCoupon } from '../models/RegisteredCoupon';
import { CouponSubmission } from '../models/CouponSubmission';
import { AdminUser } from '../models/AdminUser';

export class AdminDashboardController {
  /**
   * Aggregates real-time dashboard analytics
   */
  public static async getDashboardMetrics(
    _req: AuthenticatedAdminRequest,
    res: Response
  ): Promise<void> {
    const [
      totalRegisteredCoupons,
      totalSubmittedCoupons,
      statusBreakdown,
      uniqueMobilesResult,
      dailyTrend,
      totalAdminUsers,
      adminUsersList,
    ] = await Promise.all([
      RegisteredCoupon.countDocuments(),
      CouponSubmission.countDocuments(),
      CouponSubmission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      CouponSubmission.distinct('customerMobile'),
      // Daily trend for the past 14 days
      CouponSubmission.aggregate([
        {
          $match: {
            submittedAt: {
              $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' },
            },
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AdminUser.countDocuments(),
      AdminUser.find({}, 'name email role isActive lastLoginAt createdAt').sort({ createdAt: -1 }).lean(),
    ]);

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    statusBreakdown.forEach((item) => {
      if (item._id === 'Pending') statusCounts.pending = item.count;
      else if (item._id === 'Approved') statusCounts.approved = item.count;
      else if (item._id === 'Rejected') statusCounts.rejected = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalRegisteredCoupons,
          totalSubmittedCoupons,
          pendingSubmissions: statusCounts.pending,
          approvedSubmissions: statusCounts.approved,
          rejectedSubmissions: statusCounts.rejected,
          uniqueSubmittingMobiles: uniqueMobilesResult.length,
          totalAdminUsers,
        },
        adminUsers: adminUsersList,
        charts: {
          statusDistribution: [
            { name: 'Pending', value: statusCounts.pending, color: '#f59e0b' },
            { name: 'Approved', value: statusCounts.approved, color: '#10b981' },
            { name: 'Rejected', value: statusCounts.rejected, color: '#ef4444' },
          ],
          dailyTrend: dailyTrend.map((d) => ({
            date: d._id,
            total: d.count,
            approved: d.approved,
            rejected: d.rejected,
            pending: d.pending,
          })),
        },
      },
    });
  }
}

