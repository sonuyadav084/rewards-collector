import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT tokens if stored locally
apiClient.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token');
  const customerToken = localStorage.getItem('customer_token');

  // Attach appropriate token header if available
  const isAdminRequest =
    config.url?.startsWith('/admin') ||
    config.url?.includes('admin') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  if (isAdminRequest && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (adminToken && !customerToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (customerToken) {
    config.headers.Authorization = `Bearer ${customerToken}`;
  }

  return config;
});

// Response interceptor for unified error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    return Promise.reject(new Error(message));
  }
);

