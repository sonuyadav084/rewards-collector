import { apiClient } from './client';

export interface RequestOtpResponse {
  success: boolean;
  data: {
    normalizedMobile: string;
    expiresInSeconds: number;
    cooldownSeconds: number;
    message: string;
    devOtp?: string;
  };
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    mobileNumber: string;
  };
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    admin: {
      _id: string;
      name: string;
      email: string;
      role: 'admin' | 'superadmin';
      lastLoginAt?: string;
    };
  };
}

export const authApi = {
  requestOtp: async (mobileNumber: string): Promise<RequestOtpResponse> => {
    const res = await apiClient.post('/auth/otp/request', { mobileNumber });
    return res.data;
  },

  verifyOtp: async (mobileNumber: string, otp: string): Promise<VerifyOtpResponse> => {
    const res = await apiClient.post('/auth/otp/verify', { mobileNumber, otp });
    return res.data;
  },

  adminLogin: async (email: string, password: string): Promise<AdminLoginResponse> => {
    const res = await apiClient.post('/auth/admin/login', { email, password });
    return res.data;
  },

  customerLogin: async (
    name: string,
    mobileNumber: string
  ): Promise<{ success: boolean; data: { token: string; customerName: string; customerMobile: string } }> => {
    const res = await apiClient.post('/auth/customer/login', { name, mobileNumber });
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<any> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  changeAdminPassword: async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/admin/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res.data;
  },
};

