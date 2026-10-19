export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface CustomerSession {
  mobileNumber: string;
  token: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
  lastLoginAt?: string;
}

export interface CouponSubmission {
  _id: string;
  submissionReference: string;
  couponNumber: string;
  normalizedCouponNumber: string;
  customerName: string;
  customerMobile: string;
  photoStoragePath: string;
  photoMimeType: string;
  photoFileSize: number;
  status: SubmissionStatus;
  rejectionReason?: string;
  feedbackRating?: 'Good' | 'Better' | 'Excellent';
  feedbackComment?: string;
  isAutoApproved?: boolean;
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface RegisteredCoupon {
  _id: string;
  couponNumber: string;
  normalizedCouponNumber: string;
  isSubmitted: boolean;
  submissionId?: {
    _id: string;
    submissionReference: string;
    status: SubmissionStatus;
    customerName: string;
    customerMobile: string;
    submittedAt: string;
  };
  importBatchId?: string;
  createdAt: string;
}

export interface DashboardAdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface DashboardCards {
  totalRegisteredCoupons: number;
  totalSubmittedCoupons: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  uniqueSubmittingMobiles: number;
  totalAdminUsers: number;
}

export interface DailyTrendPoint {
  date: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface StatusDistributionPoint {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  cards: DashboardCards;
  charts: {
    statusDistribution: StatusDistributionPoint[];
    dailyTrend: DailyTrendPoint[];
  };
  adminUsers?: DashboardAdminUser[];
}

export interface ImportPreviewData {
  previewId: string;
  totalRowsRead: number;
  validNewCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  alreadyRegisteredCount: number;
  validNewCoupons: Array<{ original: string; normalized: string }>;
  errors: Array<{ rowNumber: number; rawValue: string; reason: string }>;
}


export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

