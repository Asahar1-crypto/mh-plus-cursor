
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import TrialStatusBanner from './TrialStatusBanner';
import NoAccountScreen from './NoAccountScreen';

const AppLayout = () => {
  const { isAuthenticated, isLoading, account, user } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar 
          isMobile={isMobile}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
        <div className={`flex flex-col flex-1 transition-all duration-300 ${isMobile ? 'w-full' : 'mr-64'}`}>
          <AppHeader 
            onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            isMobile={isMobile}
          />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden bg-gradient-to-br from-background to-accent/20">
            <TrialStatusBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
