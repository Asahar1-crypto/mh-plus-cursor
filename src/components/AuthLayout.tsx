
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
    
    console.log('🔍 AuthLayout: Checking authenticated user access');
    console.log('🔍 Current path:', currentPath);
    console.log('🔍 Search params:', searchParams.toString());
    
    // SECURITY FIX: Do NOT redirect to dashboard during password reset flow
    // This prevents unauthorized access after clicking reset link
    const isPasswordResetFlow = currentPath === '/reset-password' && 
      (searchParams.has('token') && searchParams.get('type') === 'recovery');
    
    if (isPasswordResetFlow) {
      console.log('🔒 SECURITY: Password reset in progress - staying on reset page');
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
    const allowedPages = ['/verify-email'];
    const hasOtherAuthTokens = searchParams.has('access_token');
    
    console.log('🔍 Is allowed page:', allowedPages.includes(currentPath));
    console.log('🔍 Has other auth tokens:', hasOtherAuthTokens);
    
    if (allowedPages.includes(currentPath) || hasOtherAuthTokens) {
      // Allow access to these pages even if authenticated
      console.log('✅ AuthLayout: Allowing access to auth flow page:', currentPath);
    } else {
      console.log('❌ AuthLayout: Redirecting to dashboard - requiresAuth:', requiresAuth, 'isAuthenticated:', isAuthenticated);
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
