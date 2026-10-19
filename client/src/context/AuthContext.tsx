import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { authApi } from '../api/authApi';

interface AuthContextType {
  customerMobile: string | null;
  customerName: string | null;
  adminUser: AdminUser | null;
  isCustomerAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  setCustomerAuth: (token: string, mobileNumber: string, customerName?: string) => void;
  updateCustomerName: (name: string) => void;
  setAdminAuth: (token: string, admin: AdminUser) => void;
  logoutCustomer: () => void;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customerMobile, setCustomerMobile] = useState<string | null>(
    localStorage.getItem('customer_mobile')
  );
  const [customerName, setCustomerName] = useState<string | null>(
    localStorage.getItem('customer_name')
  );
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session on initial load
    const verifySession = async () => {
      try {
        const res = await authApi.getMe();
        if (res.data?.type === 'admin') {
          setAdminUser(res.data.admin);
        } else if (res.data?.type === 'customer') {
          setCustomerMobile(res.data.mobileNumber);
          if (res.data.customerName) {
            setCustomerName(res.data.customerName);
            localStorage.setItem('customer_name', res.data.customerName);
          }
        }
      } catch {
        // Not active, keep local states or clear
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const setCustomerAuth = (token: string, mobileNumber: string, name?: string) => {
    localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_mobile', mobileNumber);
    setCustomerMobile(mobileNumber);
    if (name) {
      localStorage.setItem('customer_name', name);
      setCustomerName(name);
    }
  };

  const updateCustomerName = (name: string) => {
    localStorage.setItem('customer_name', name);
    setCustomerName(name);
  };

  const setAdminAuth = (token: string, admin: AdminUser) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(admin));
    setAdminUser(admin);
  };

  const logoutCustomer = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_mobile');
    localStorage.removeItem('customer_name');
    setCustomerMobile(null);
    setCustomerName(null);
  };

  const logoutAdmin = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        customerMobile,
        customerName,
        adminUser,
        isCustomerAuthenticated: !!customerMobile,
        isAdminAuthenticated: !!adminUser,
        isLoading,
        setCustomerAuth,
        updateCustomerName,
        setAdminAuth,
        logoutCustomer,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

