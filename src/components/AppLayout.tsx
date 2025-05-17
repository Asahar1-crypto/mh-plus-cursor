
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 h-[calc(100vh-4rem)] pt-16">
        <AppSidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={closeSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full md:w-[calc(100%-16rem)] transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
