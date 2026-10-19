import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  role: 'admin' | 'customer';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role }) => {
  const { isAdminAuthenticated, isCustomerAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner text="Checking authorization..." />
      </div>
    );
  }

  if (role === 'admin' && !isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role === 'customer' && !isCustomerAuthenticated) {
    return <Navigate to="/?verify=true" replace />;
  }

  return <Outlet />;
};

