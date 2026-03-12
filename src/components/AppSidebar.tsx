
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, CreditCard, Settings, Users, BarChart3, X, Shield, UserCog, Calculator, ChevronRight, ChevronLeft, Tag, Mail, MessageSquare, DollarSign, Activity, Crown, CalendarDays, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  isMobile?: boolean;
  badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  path,
  isActive,
  onClick,
  collapsed,
  isMobile,
  badge
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
      <div className="relative flex-shrink-0">
        <Icon className="h-5 w-5" />
        {badge != null && badge > 0 && collapsed && !isMobile && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-0.5 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {(!collapsed || isMobile) && (
        <span className="font-medium whitespace-nowrap flex-1">{label}</span>
      )}
      {(!collapsed || isMobile) && badge != null && badge > 0 && (
        <span className={cn(
          "min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 leading-none",
          isActive
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-destructive text-destructive-foreground"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
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
  const { getPendingExpenses } = useExpense();

  const pendingCount = getPendingExpenses().length;

  const regularItems = [
    { icon: Home, label: 'דשבורד', path: '/dashboard' },
    { icon: CreditCard, label: 'הוצאות', path: '/expenses', badge: pendingCount },
    { icon: Calculator, label: 'סגירת חודש', path: '/monthly-settlement' },
    { icon: Users, label: 'ילדים', path: '/children' },
    { icon: CalendarDays, label: 'משמורת', path: '/custody-calendar' },
    { icon: PartyPopper, label: 'ימי הולדת', path: '/birthday-projects' },
    { icon: BarChart3, label: 'דוחות', path: '/reports' },
    { icon: Settings, label: 'הגדרות', path: '/account-settings' },
  ];

  const adminItems = [
    { icon: Shield, label: 'לוח בקרה', path: '/admin/dashboard' },
    { icon: Users, label: 'ניהול משפחות', path: '/admin/tenants' },
    { icon: Crown, label: 'סופר אדמינים', path: '/admin/super-admins' },
    { icon: UserCog, label: 'משתמשים לא מאומתים', path: '/admin/unverified-users' },
    { icon: DollarSign, label: 'תמחור', path: '/admin/pricing' },
    { icon: Tag, label: 'קופונים', path: '/admin/coupons' },
    { icon: Mail, label: 'הגדרות מייל', path: '/admin/email-settings' },
    { icon: Mail, label: 'ניהול מיילים', path: '/admin/email-management' },
    { icon: MessageSquare, label: 'יומני SMS', path: '/admin/sms-logs' },
    { icon: Activity, label: 'בריאות מערכת', path: '/admin/system-health' },
  ];

  const sidebarItems = profile?.is_super_admin 
    ? [...regularItems, ...adminItems]
    : regularItems;

  // Sidebar classes based on state
  const sidebarClasses = cn(
    'flex flex-col liquid-glass border-l border-border/50 transition-all duration-300 ease-in-out',
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
        {/* Mobile header with logo */}
        {isMobile && (
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2" onClick={onClose}>
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                  <span className="font-bold text-white text-sm">מ+</span>
                </div>
                <span className="text-lg font-bold text-foreground">מחציות פלוס</span>
              </Link>
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

        {/* Desktop header with logo + collapse toggle */}
        {!isMobile && (
          <div className="border-b border-border bg-card/50">
            <div className={cn(
              "flex items-center transition-all duration-300",
              collapsed ? "justify-center p-3" : "justify-between p-4"
            )}>
              <Link to="/dashboard" className={cn(
                "flex items-center gap-2 hover:opacity-80 transition-opacity",
                collapsed && "justify-center"
              )}>
                <div className={cn(
                  "rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm flex-shrink-0",
                  collapsed ? "h-8 w-8" : "h-9 w-9"
                )}>
                  <span className={cn("font-bold text-white", collapsed ? "text-xs" : "text-sm")}>מ+</span>
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-foreground leading-tight">מחציות פלוס</span>
                    <span className="text-[10px] text-muted-foreground">ניהול תקציב משפחתי</span>
                  </div>
                )}
              </Link>
              {!collapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="p-1.5 hover:bg-accent transition-all duration-200 flex-shrink-0"
                  title="צמצם תפריט"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            {collapsed && (
              <div className="flex justify-center pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="p-1.5 hover:bg-accent transition-all duration-200"
                  title="הרחב תפריט"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          collapsed && !isMobile ? "px-2 py-6" : "p-6 pt-8"
        )}>
          <nav className="space-y-1">
            {regularItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                isActive={location.pathname === item.path}
                onClick={isMobile ? onClose : undefined}
                collapsed={collapsed}
                isMobile={isMobile}
                badge={'badge' in item ? (item as any).badge : undefined}
              />
            ))}
            {profile?.is_super_admin && (
              <>
                <div className={cn(
                  "border-t border-border my-3",
                  collapsed && !isMobile ? "mx-1" : "mx-2"
                )} />
                {(!collapsed || isMobile) && (
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ניהול מערכת
                  </div>
                )}
                {adminItems.map((item) => (
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
              </>
            )}
          </nav>
        </div>
        
        {(!collapsed || isMobile) && (
          <div className="p-4 border-t border-border text-sm text-muted-foreground text-center">
            <p>מחציות פלוס &copy; 2026</p>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
