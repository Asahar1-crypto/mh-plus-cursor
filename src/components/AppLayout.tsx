
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import PendingInvitationAlert from './invitation/PendingInvitationAlert';

const AppLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <AppHeader />
        <main className="flex-1 p-4 md:p-8">
          <PendingInvitationAlert />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
