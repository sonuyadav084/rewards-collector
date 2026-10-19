import { apiClient } from './client';
import { CouponSubmission, PaginationMeta } from '../types';

export interface SubmitCouponPayload {
  customerName: string;
  customerMobile: string;
  couponNumber: string;
  photoFile: File;
  feedbackRating?: 'Good' | 'Better' | 'Excellent';
  feedbackComment?: string;
}

export interface CustomerHistoryResponse {
  success: boolean;
  data: {
    submissions: CouponSubmission[];
    counts: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
    pagination: PaginationMeta;
  };
}

export interface ScanCouponResponse {
  success: boolean;
  isTemplateValid: boolean;
  matchedTemplateName?: string;
  detectedCode: string | null;
  verified: boolean;
  isSubmitted: boolean;
  message: string;
  confidence?: number;
}

export const customerApi = {
  scanCouponPhoto: async (photoFile: File): Promise<ScanCouponResponse> => {
    const formData = new FormData();
    formData.append('couponPhoto', photoFile);

    const res = await apiClient.post('/submissions/scan-coupon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  },
  submitCoupon: async (
    payload: SubmitCouponPayload,
    onProgress?: (percent: number) => void
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('customerName', payload.customerName);
    formData.append('customerMobile', payload.customerMobile);
    formData.append('couponNumber', payload.couponNumber);
    formData.append('couponPhoto', payload.photoFile);
    if (payload.feedbackRating) {
      formData.append('feedbackRating', payload.feedbackRating);
    }
    if (payload.feedbackComment) {
      formData.append('feedbackComment', payload.feedbackComment);
    }

    const res = await apiClient.post('/submissions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return res.data;
  },

  getMySubmissions: async (page = 1, limit = 10, mobile?: string): Promise<CustomerHistoryResponse> => {
    const res = await apiClient.get('/submissions/my', {
      params: { page, limit, ...(mobile ? { mobile } : {}) },
    });
    return res.data;
  },

  getMySubmissionById: async (id: string, mobile?: string): Promise<{ success: boolean; data: CouponSubmission }> => {
    const res = await apiClient.get(`/submissions/my/${id}`, {
      params: { ...(mobile ? { mobile } : {}) },
    });
    return res.data;
  },

  getPhotoBlobUrl: async (submissionId: string, mobile?: string): Promise<string> => {
    const res = await apiClient.get(`/submissions/my/${submissionId}/photo`, {
      responseType: 'blob',
      params: { ...(mobile ? { mobile } : {}) },
    });
    return URL.createObjectURL(res.data);
  },
};

