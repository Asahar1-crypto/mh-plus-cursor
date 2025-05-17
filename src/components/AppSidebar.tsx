
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, CreditCard, User, Settings, Plus, Users } from 'lucide-react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, path, isActive }) => {
  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
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
    { icon: Plus, label: 'הוצאה חדשה', path: '/add-expense' },
    { icon: User, label: 'פרופיל', path: '/profile' },
    { icon: Settings, label: 'הגדרות', path: '/account-settings' },
  ];

  // Fixed the sidebar positioning and z-index
  const sidebarClasses = cn(
    'flex flex-col w-64 bg-card border-r border-border h-[calc(100vh-4rem)] fixed top-16 z-10 transition-all duration-300',
    isMobile ? 'z-50' : 'md:relative md:top-0',
    isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'
  );

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
      <aside className={sidebarClasses}>
        <div className="p-4 flex-1 overflow-y-auto">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                isActive={location.pathname === item.path}
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
