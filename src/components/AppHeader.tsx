
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  toggleSidebar?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ toggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 shadow-sm border-b border-border h-16">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center">
          {isAuthenticated && toggleSidebar && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2 md:hidden">
              <Menu />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-brand-500 flex items-center justify-center">
              <span className="font-bold text-white">מ+</span>
            </div>
            <span className="text-xl font-bold text-foreground">מחציות פלוס</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticated && location.pathname !== '/login' && (
            <Button variant="outline" onClick={() => navigate('/login')}>
              כניסה
            </Button>
          )}
          
          {!isAuthenticated && location.pathname !== '/register' && (
            <Button onClick={() => navigate('/register')}>
              הרשמה
            </Button>
          )}

          {isAuthenticated && (
            <>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    פרופיל
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account-settings')}>
                    הגדרות
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>התנתקות</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
