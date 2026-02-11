import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, DollarSign, Calendar, AlertCircle, TrendingUp, Settings, 
  Mail, MessageSquare, Crown, CreditCard, Tag, UserCog, Activity,
  Shield, ArrowLeft, RefreshCw, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate, useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  expiredTenants: number;
  canceledTenants: number;
  monthlyRevenue: number;
  expiringTrial: number;
  personalPlanCount: number;
  familyPlanCount: number;
  noPlanCount: number;
  totalMembers: number;
  totalExpenses: number;
  superAdminCount: number;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  path: string;
  color: string;
  badge?: string;
}

const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    expiredTenants: 0,
    canceledTenants: 0,
    monthlyRevenue: 0,
    expiringTrial: 0,
    personalPlanCount: 0,
    familyPlanCount: 0,
    noPlanCount: 0,
    totalMembers: 0,
    totalExpenses: 0,
    superAdminCount: 0,
  });
  const [loading, setLoading] = useState(true);

  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch pricing plans for revenue calculation
      const { data: pricingPlans } = await supabase
        .from('pricing_plans')
        .select('slug, monthly_price, yearly_price');

      const priceMap: Record<string, { monthly: number; yearly: number }> = {};
      (pricingPlans || []).forEach((p: any) => {
        priceMap[p.slug] = { monthly: p.monthly_price, yearly: p.yearly_price };
      });

      // Fetch accounts with plan info
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('accounts')
        .select('subscription_status, trial_ends_at, created_at, plan_slug, billing_period');

      if (tenantsError) throw tenantsError;

      // Fetch total members
      const { count: membersCount } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true });

      // Fetch total expenses this month
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);
      const { count: expensesCount } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstOfMonth.toISOString());

      // Fetch super admin count
      const { count: superAdminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_super_admin', true);

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Calculate revenue based on actual plans from pricing_plans table
      const activeAccounts = tenantsData?.filter(t => t.subscription_status === 'active') || [];
      let monthlyRevenue = 0;
      activeAccounts.forEach(t => {
        const plan = (t as any).plan_slug;
        const billing = (t as any).billing_period;
        const prices = priceMap[plan];
        if (prices) {
          monthlyRevenue += billing === 'yearly' ? prices.yearly / 12 : prices.monthly;
        }
      });

      setStats({
        totalTenants: tenantsData?.length || 0,
        activeTenants: activeAccounts.length,
        trialTenants: tenantsData?.filter(t => t.subscription_status === 'trial').length || 0,
        expiredTenants: tenantsData?.filter(t => t.subscription_status === 'expired').length || 0,
        canceledTenants: tenantsData?.filter(t => t.subscription_status === 'canceled').length || 0,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        expiringTrial: tenantsData?.filter(t => 
          t.subscription_status === 'trial' && 
          t.trial_ends_at && 
          new Date(t.trial_ends_at) <= nextWeek
        ).length || 0,
        personalPlanCount: tenantsData?.filter(t => (t as any).plan_slug === 'personal' && t.subscription_status === 'active').length || 0,
        familyPlanCount: tenantsData?.filter(t => (t as any).plan_slug === 'family' && t.subscription_status === 'active').length || 0,
        noPlanCount: tenantsData?.filter(t => !(t as any).plan_slug && t.subscription_status === 'active').length || 0,
        totalMembers: membersCount || 0,
        totalExpenses: expensesCount || 0,
        superAdminCount: superAdminCount || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת נתוני הדשבורד',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      icon: Users,
      label: 'ניהול משפחות',
      description: 'צפה, ערוך ונהל משפחות',
      path: '/admin/tenants',
      color: 'from-blue-500/20 to-blue-600/10 text-blue-700 dark:text-blue-300',
      badge: `${stats.totalTenants}`,
    },
    {
      icon: Crown,
      label: 'סופר אדמינים',
      description: 'נהל הרשאות מנהלי מערכת',
      path: '/admin/super-admins',
      color: 'from-purple-500/20 to-purple-600/10 text-purple-700 dark:text-purple-300',
      badge: `${stats.superAdminCount}`,
    },
    {
      icon: UserCog,
      label: 'משתמשים לא מאומתים',
      description: 'טפל במשתמשים שלא השלימו רישום',
      path: '/admin/unverified-users',
      color: 'from-orange-500/20 to-orange-600/10 text-orange-700 dark:text-orange-300',
    },
    {
      icon: DollarSign,
      label: 'תמחור והגדרות',
      description: 'עדכן תוכניות ומחירים',
      path: '/admin/pricing',
      color: 'from-green-500/20 to-green-600/10 text-green-700 dark:text-green-300',
    },
    {
      icon: Tag,
      label: 'קופונים',
      description: 'נהל קודי הנחה וקופונים',
      path: '/admin/coupons',
      color: 'from-pink-500/20 to-pink-600/10 text-pink-700 dark:text-pink-300',
    },
    {
      icon: Mail,
      label: 'הגדרות מייל',
      description: 'הגדר תבניות מייל ושליחה',
      path: '/admin/email-settings',
      color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-700 dark:text-cyan-300',
    },
    {
      icon: Mail,
      label: 'ניהול מיילים',
      description: 'בקשות שינוי מייל',
      path: '/admin/email-management',
      color: 'from-teal-500/20 to-teal-600/10 text-teal-700 dark:text-teal-300',
    },
    {
      icon: MessageSquare,
      label: 'יומני SMS',
      description: 'צפה ביומני הודעות SMS',
      path: '/admin/sms-logs',
      color: 'from-indigo-500/20 to-indigo-600/10 text-indigo-700 dark:text-indigo-300',
    },
    {
      icon: Activity,
      label: 'בריאות מערכת',
      description: 'סטטוס שירותים ותקינות',
      path: '/admin/system-health',
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-700 dark:text-emerald-300',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען נתוני ניהול...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30" dir="rtl">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                לוח בקרה - ניהול מערכת
              </h1>
              <p className="text-sm text-muted-foreground">סקירה כללית וניהול המערכת</p>
            </div>
          </div>
          <Button
            onClick={loadDashboardData}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            רענן נתונים
          </Button>
        </div>

        {/* Key Metrics - Top Row */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in [animation-delay:200ms]">
          <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs text-muted-foreground">סה"כ</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">משפחות רשומות</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{stats.totalMembers} משתמשים</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-xs text-muted-foreground">חודשי</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600">₪{stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">הכנסות מנויים</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{stats.activeTenants} משלמים</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <span className="text-xs text-muted-foreground">ניסיון</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.trialTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">בתקופת ניסיון</p>
              {stats.expiringTrial > 0 && (
                <Badge variant="destructive" className="text-xs mt-2">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  {stats.expiringTrial} פג תוקף השבוע
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-xs text-muted-foreground">דורש טיפול</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-red-600">{stats.expiredTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">פג תוקף</p>
              {stats.canceledTenants > 0 && (
                <Badge variant="outline" className="text-xs mt-2">{stats.canceledTenants} בוטלו</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Row */}
        <div className="grid gap-4 md:grid-cols-2 animate-fade-in [animation-delay:400ms]">
          {/* Status Breakdown */}
          <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                פילוח סטטוס
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">פעיל</span>
                </div>
                <span className="font-bold text-green-700 dark:text-green-300">{stats.activeTenants}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium">ניסיון</span>
                </div>
                <span className="font-bold text-amber-700 dark:text-amber-300">{stats.trialTenants}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">פג תוקף</span>
                </div>
                <span className="font-bold text-red-700 dark:text-red-300">{stats.expiredTenants}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium">בוטל</span>
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">{stats.canceledTenants}</span>
              </div>
            </CardContent>
          </Card>

          {/* Plans Breakdown */}
          <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-500" />
                פילוח תוכניות (פעילים)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/50">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">משפחתי</span>
                </div>
                <span className="font-bold text-purple-700 dark:text-purple-300">{stats.familyPlanCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">אישי</span>
                </div>
                <span className="font-bold text-blue-700 dark:text-blue-300">{stats.personalPlanCount}</span>
              </div>
              {stats.noPlanCount > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/50">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">ללא תוכנית</span>
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{stats.noPlanCount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>הוצאות החודש</span>
                  <span className="font-semibold text-foreground">{stats.totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="animate-fade-in [animation-delay:600ms]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            ניהול מהיר
          </h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.path}
                  className="bg-gradient-to-br from-card/90 to-card/80 border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(action.path)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm sm:text-base">{action.label}</h3>
                          {action.badge && (
                            <Badge variant="secondary" className="text-xs">{action.badge}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300 flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
