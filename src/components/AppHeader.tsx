
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Menu } from 'lucide-react';
import AccountSwitcher from './account/AccountSwitcher';
import { Logo } from '@/components/ui/Logo';
import { NotificationBadge } from '@/components/notifications';

interface AppHeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onMenuClick, isMobile }) => {
  const { user, profile, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-card/95 backdrop-blur-xl border-b border-border shadow-sm px-3 sm:px-4 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="p-2 flex-shrink-0"
              aria-label="פתח תפריט"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo size="sm" showText={!isMobile} />
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {isAuthenticated && (
            <>
              {/* Account Switcher - always in same place, just scaled */}
              <div className="flex-shrink-0">
                <AccountSwitcher />
              </div>
              
              {/* Notification bell */}
              <div className="flex-shrink-0">
                <NotificationBadge iconSize={18} />
              </div>

              {/* User greeting and logout */}
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground hidden lg:inline truncate max-w-[150px]">
                  שלום, {profile?.name || user?.name || user?.email?.split('@')[0]}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="p-2 flex-shrink-0"
                  aria-label="התנתק"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                  התחברות
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                  הרשמה
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
