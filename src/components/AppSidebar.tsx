
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, CreditCard, User, Settings, Plus, Users, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, path, isActive, onClick }) => {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'hover:bg-accent text-foreground hover:text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full"></div>
      )}
    </Link>
  );
};

interface AppSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ isMobile, isOpen, onClose }) => {
  const location = useLocation();

  const sidebarItems = [
    { icon: Home, label: 'דשבורד', path: '/dashboard' },
    { icon: CreditCard, label: 'הוצאות', path: '/expenses' },
    { icon: Users, label: 'ילדים', path: '/children' },
    { icon: BarChart3, label: 'דוחות', path: '/reports' },
    { icon: User, label: 'פרופיל', path: '/profile' },
    { icon: Settings, label: 'הגדרות', path: '/account-settings' },
  ];

  // Improved sidebar positioning and responsiveness
  const sidebarClasses = cn(
    'flex flex-col w-64 bg-card/95 backdrop-blur-xl border-r border-border shadow-lg transition-all duration-300 ease-in-out',
    isMobile 
      ? 'fixed top-0 right-0 h-full z-50 transform' + (isOpen ? ' translate-x-0' : ' translate-x-full')
      : 'fixed top-0 left-0 h-full z-20'
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
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
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="p-6 pt-8 flex-1 overflow-y-auto">
          <div className="mb-6">
            <Logo size="md" />
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                isActive={location.pathname === item.path}
                onClick={isMobile ? onClose : undefined}
              />
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          <p>מחציות פלוס &copy; 2025</p>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
