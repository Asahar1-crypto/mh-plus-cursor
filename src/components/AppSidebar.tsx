
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, CreditCard, Settings, Users, BarChart3, X, Shield, UserCog, Calculator, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  isMobile?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  path, 
  isActive, 
  onClick, 
  collapsed,
  isMobile 
}) => {
  const content = (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'flex items-center rounded-lg transition-all duration-200 group relative',
        collapsed && !isMobile ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'hover:bg-accent text-foreground hover:text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {(!collapsed || isMobile) && (
        <span className="font-medium whitespace-nowrap">{label}</span>
      )}
      {isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-l-full"></div>
      )}
    </Link>
  );

  // Wrap with tooltip only in collapsed desktop mode
  if (collapsed && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

interface AppSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ 
  isMobile, 
  isOpen, 
  onClose, 
  collapsed = false,
  onToggleCollapse 
}) => {
  const location = useLocation();
  const { profile } = useAuth();

  const regularItems = [
    { icon: Home, label: 'דשבורד', path: '/dashboard' },
    { icon: CreditCard, label: 'הוצאות', path: '/expenses' },
    { icon: Calculator, label: 'סגירת חודש', path: '/monthly-settlement' },
    { icon: Users, label: 'ילדים', path: '/children' },
    { icon: BarChart3, label: 'דוחות', path: '/reports' },
    { icon: Settings, label: 'הגדרות', path: '/account-settings' },
  ];

  const adminItems = [
    { icon: Shield, label: 'ניהול מערכת', path: '/admin/dashboard' },
    { icon: UserCog, label: 'משתמשים לא מאומתים', path: '/admin/unverified-users' },
    { icon: Users, label: 'יומני SMS', path: '/admin/sms-logs' },
  ];

  const sidebarItems = profile?.is_super_admin 
    ? [...regularItems, ...adminItems]
    : regularItems;

  // Sidebar classes based on state
  const sidebarClasses = cn(
    'flex flex-col bg-card/95 backdrop-blur-xl border-l border-border shadow-lg transition-all duration-300 ease-in-out',
    isMobile 
      ? 'fixed top-0 right-0 h-full z-50 w-64 transform' + (isOpen ? ' translate-x-0' : ' translate-x-full')
      : 'fixed top-0 right-0 h-full z-20' + (collapsed ? ' w-16' : ' w-64')
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      <aside className={sidebarClasses}>
        {/* Mobile header */}
        {isMobile && (
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">תפריט</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Desktop collapse toggle */}
        {!isMobile && (
          <div className="p-2 border-b border-border bg-card/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className={cn(
                "w-full hover:bg-accent transition-all duration-200",
                collapsed ? "justify-center px-2" : "justify-end px-3"
              )}
              title={collapsed ? "הרחב תפריט" : "צמצם תפריט"}
            >
              {collapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          collapsed && !isMobile ? "px-2 py-6" : "p-6 pt-8"
        )}>
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                isActive={location.pathname === item.path}
                onClick={isMobile ? onClose : undefined}
                collapsed={collapsed}
                isMobile={isMobile}
              />
            ))}
          </nav>
        </div>
        
        {(!collapsed || isMobile) && (
          <div className="p-4 border-t border-border text-sm text-muted-foreground text-center">
            <p>מחציות פלוס &copy; 2025</p>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
