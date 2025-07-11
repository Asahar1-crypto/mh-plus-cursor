
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import AccountSwitcher from './account/AccountSwitcher';

const AppHeader = () => {
  const { user, profile, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          ניהול הוצאות
        </Link>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated && (
            <>
              <AccountSwitcher />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  שלום, {profile?.name || user?.name || user?.email}
                </span>
                <Link to="/account-settings">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          {!isAuthenticated && (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  התחברות
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">
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
