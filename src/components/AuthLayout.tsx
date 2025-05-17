
import React from 'react';
import AppHeader from './AppHeader';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

interface AuthLayoutProps {
  requiresAuth?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ requiresAuth = false }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, redirect to login
  if (requiresAuth && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If auth is NOT required and user is authenticated, redirect to dashboard
  if (!requiresAuth && isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="pt-16">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
