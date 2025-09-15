
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
    console.log('AuthLayout: Redirecting to login - requiresAuth:', requiresAuth, 'isAuthenticated:', isAuthenticated);
    return <Navigate to="/login" />;
  }

  // If auth is NOT required and user is authenticated, redirect to dashboard
  // EXCEPT for specific pages that need special handling
  if (!requiresAuth && isAuthenticated) {
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Allow access to pages that handle their own auth tokens
    const allowedPages = ['/reset-password', '/verify-email'];
    const hasAuthTokens = searchParams.has('token') || searchParams.has('access_token');
    
    if (allowedPages.includes(currentPath) || hasAuthTokens) {
      // Allow access to these pages even if authenticated
      console.log('AuthLayout: Allowing access to auth flow page:', currentPath);
    } else {
      console.log('AuthLayout: Redirecting to dashboard - requiresAuth:', requiresAuth, 'isAuthenticated:', isAuthenticated);
      return <Navigate to="/dashboard" />;
    }
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
