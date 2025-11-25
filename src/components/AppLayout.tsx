import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import TrialStatusBanner from './TrialStatusBanner';
import NoAccountScreen from './NoAccountScreen';

const AppLayout = () => {
  const { isAuthenticated, isLoading, account, user } = useAuth();
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isMobileSidebarOpen]);

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

  // Show no account screen if user is authenticated but has no account
  if (isAuthenticated && user && !account) {
    return <NoAccountScreen />;
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <AppSidebar 
          isMobile={isMobile}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div 
          className={`flex flex-col flex-1 transition-all duration-300 ${
            isMobile 
              ? 'w-full' 
              : isSidebarCollapsed 
                ? 'mr-16' 
                : 'mr-64'
          }`}
        >
          <AppHeader 
            onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            isMobile={isMobile}
          />
          <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-x-hidden bg-gradient-to-br from-background to-accent/20">
            <TrialStatusBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
