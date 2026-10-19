import { apiClient } from './client';
import {
  DashboardData,
  CouponSubmission,
  RegisteredCoupon,
  ImportPreviewData,
  PaginationMeta,
} from '../types';

export const adminApi = {
  getDashboardMetrics: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const res = await apiClient.get('/admin/dashboard');
    return res.data;
  },

  getSubmissions: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: { submissions: CouponSubmission[]; pagination: PaginationMeta };
  }> => {
    const res = await apiClient.get('/admin/submissions', { params });
    return res.data;
  },

  getSubmissionById: async (id: string): Promise<{ success: boolean; data: CouponSubmission }> => {
    const res = await apiClient.get(`/admin/submissions/${id}`);
    return res.data;
  },

  updateSubmissionStatus: async (
    id: string,
    payload: { status: 'Approved' | 'Rejected'; rejectionReason?: string; reviewNotes?: string }
  ): Promise<{ success: boolean; message: string; data: CouponSubmission }> => {
    const res = await apiClient.patch(`/admin/submissions/${id}/status`, payload);
    return res.data;
  },

  getPhotoBlobUrl: async (submissionId: string): Promise<string> => {
    const res = await apiClient.get(`/admin/submissions/${submissionId}/photo`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },

  listCoupons: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    isSubmitted?: boolean;
  }): Promise<{
    success: boolean;
    data: { coupons: RegisteredCoupon[]; pagination: PaginationMeta };
  }> => {
    const res = await apiClient.get('/admin/coupons', { params });
    return res.data;
  },

  previewImport: async (file: File): Promise<{ success: boolean; data: ImportPreviewData }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/admin/coupons/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirmImport: async (previewId: string): Promise<{ success: boolean; data: { batchId: string; totalImported: number } }> => {
    const res = await apiClient.post('/admin/coupons/import/confirm', { previewId });
    return res.data;
  },

  downloadTemplate: async (): Promise<void> => {
    const res = await apiClient.get('/admin/coupons/import/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'coupon_import_template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  downloadErrorReport: async (previewId: string): Promise<void> => {
    const res = await apiClient.get(`/admin/coupons/import/${previewId}/errors`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import_errors_${previewId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  exportSubmissionsReport: async (params: {
    startDate?: string;
    endDate?: string;
    status?: string;
    customerName?: string;
    mobileNumber?: string;
    couponNumber?: string;
  }): Promise<void> => {
    const res = await apiClient.get('/admin/reports/submissions.csv', {
      params,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `submissions_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },


  // Coupon Card Templates & Formats
  getTemplates: async (): Promise<{ success: boolean; data: CouponTemplateItem[] }> => {
    const res = await apiClient.get('/admin/templates');
    return res.data;
  },

  createTemplate: async (payload: CreateTemplatePayload): Promise<{ success: boolean; data: CouponTemplateItem; message: string }> => {
    const res = await apiClient.post('/admin/templates', payload);
    return res.data;
  },

  updateTemplate: async (id: string, payload: Partial<CreateTemplatePayload>): Promise<{ success: boolean; data: CouponTemplateItem; message: string }> => {
    const res = await apiClient.put(`/admin/templates/${id}`, payload);
    return res.data;
  },

  deleteTemplate: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/admin/templates/${id}`);
    return res.data;
  },

  toggleTemplateStatus: async (id: string): Promise<{ success: boolean; data: CouponTemplateItem; message: string }> => {
    const res = await apiClient.patch(`/admin/templates/${id}/toggle`);
    return res.data;
  },

  autoDetectTemplate: async (file: File): Promise<AutoDetectedTemplateResponse> => {
    const formData = new FormData();
    formData.append('cardImage', file);
    const res = await apiClient.post('/admin/templates/auto-detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export interface CouponTemplateItem {
  _id: string;
  name: string;
  description?: string;
  codePrefix: string;
  codePattern: string;
  sampleCode: string;
  requiredKeywords: string[];
  minKeywordMatches: number;
  qrCodeMatch?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  codePrefix: string;
  codePattern: string;
  sampleCode: string;
  requiredKeywords: string[];
  minKeywordMatches?: number;
  qrCodeMatch?: string;
  isActive?: boolean;
}

export interface AutoDetectedTemplateResponse {
  success: boolean;
  data: {
    name: string;
    description: string;
    codePrefix: string;
    codePattern: string;
    sampleCode: string;
    requiredKeywords: string[];
    minKeywordMatches: number;
    qrCodeMatch?: string;
    detectedQr?: string;
    rawText: string;
  };
  message: string;
}


