
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Menu } from 'lucide-react';
import AccountSwitcher from './account/AccountSwitcher';
import { Logo } from '@/components/ui/Logo';

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
    <header className="bg-card/95 backdrop-blur-xl border-b border-border shadow-sm px-4 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo size="sm" showText={true} />
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated && (
            <>
              <div className="hidden sm:block">
                <AccountSwitcher />
              </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline">
                    שלום, {profile?.name || user?.name || user?.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
            </>
          )}
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  התחברות
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="text-xs sm:text-sm">
                  הרשמה
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Mobile account switcher */}
      {isAuthenticated && isMobile && (
        <div className="mt-3 pt-3 border-t border-border">
          <AccountSwitcher />
        </div>
      )}
    </header>
  );
};

export default AppHeader;
