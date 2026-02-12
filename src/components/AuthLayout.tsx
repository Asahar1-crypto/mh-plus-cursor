
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
  // EXCEPT for specific pages that need special handling
  if (!requiresAuth && isAuthenticated) {
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // SECURITY FIX: Do NOT redirect to dashboard during password reset flow
    // This prevents unauthorized access after clicking reset link
    // Always allow access to the reset-password page regardless of tokens
    const isPasswordResetFlow = currentPath === '/reset-password';
    
    if (isPasswordResetFlow) {
      // Allow user to stay on reset page to enter new password
      return (
        <div className="min-h-screen bg-background">
          <AppHeader />
          <div className="pt-16">
            <Outlet />
          </div>
        </div>
      );
    }
    
    // Allow access to other auth pages that handle their own tokens
    // Include /register to allow celebration modal to show after successful registration
    const allowedPages = ['/verify-email', '/register'];
    const hasOtherAuthTokens = searchParams.has('access_token');
    
    if (allowedPages.includes(currentPath) || hasOtherAuthTokens) {
      // Allow access to these pages even if authenticated
    } else {
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
