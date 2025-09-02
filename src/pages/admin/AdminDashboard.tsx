import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Calendar, AlertCircle, TrendingUp, Settings, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  expiredTenants: number;
  monthlyRevenue: number;
  expiringTrial: number;
}

const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    expiredTenants: 0,
    monthlyRevenue: 0,
    expiringTrial: 0
  });
  const [loading, setLoading] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState<string>('50');

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // קבלת סטטיסטיקות טננטים
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('accounts')
        .select('subscription_status, trial_ends_at, created_at');

      if (tenantsError) throw tenantsError;

      // קבלת מחיר נוכחי
      const { data: priceData, error: priceError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'monthly_price')
        .single();

      if (priceError) throw priceError;

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const stats = {
        totalTenants: tenantsData?.length || 0,
        activeTenants: tenantsData?.filter(t => t.subscription_status === 'active').length || 0,
        trialTenants: tenantsData?.filter(t => t.subscription_status === 'trial').length || 0,
        expiredTenants: tenantsData?.filter(t => t.subscription_status === 'expired').length || 0,
        monthlyRevenue: (tenantsData?.filter(t => t.subscription_status === 'active').length || 0) * parseFloat(priceData?.setting_value || '50'),
        expiringTrial: tenantsData?.filter(t => 
          t.subscription_status === 'trial' && 
          t.trial_ends_at && 
          new Date(t.trial_ends_at) <= nextWeek
        ).length || 0
      };

      setStats(stats);
      setMonthlyPrice(priceData?.setting_value || '50');
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
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">פנל ניהול מערכת</h1>
            <p className="text-muted-foreground">ברוך הבא למסך הניהול הראשי</p>
          </div>
          <Button
            onClick={loadDashboardData}
            variant="outline"
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            רענן נתונים
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ משפחות</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
              <p className="text-xs text-muted-foreground">משפחות רשומות במערכת</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">הכנסות חודשיות</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₪{stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.activeTenants} משפחות פעילות</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">בתקופת ניסיון</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trialTenants}</div>
              <p className="text-xs text-muted-foreground">משפחות בטריאל</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">פג תוקף השבוע</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.expiringTrial}</div>
              <p className="text-xs text-muted-foreground">דורשות תשומת לב</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>פילוח סטטוס משפחות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default">פעיל</Badge>
                  <span>משפחות עם מנוי פעיל</span>
                </div>
                <span className="font-semibold">{stats.activeTenants}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">ניסיון</Badge>
                  <span>בתקופת ניסיון</span>
                </div>
                <span className="font-semibold">{stats.trialTenants}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">פג תוקף</Badge>
                  <span>פג תוקף המנוי</span>
                </div>
                <span className="font-semibold">{stats.expiredTenants}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>הגדרות מחיר נוכחיות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>מחיר חודשי:</span>
                <span className="text-2xl font-bold">₪{monthlyPrice}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>תקופת ניסיון:</span>
                <span className="font-semibold">14 ימים</span>
              </div>

              <div className="flex items-center justify-between">
                <span>מטבע:</span>
                <span className="font-semibold">שקל חדש (ILS)</span>
              </div>

              <Button
                onClick={() => window.location.href = '/admin/pricing'}
                variant="outline"
                className="w-full gap-2"
              >
                <Settings className="h-4 w-4" />
                עדכן הגדרות מחיר
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>פעולות מהירות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button
                onClick={() => window.location.href = '/admin/tenants'}
                variant="outline"
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                ניהול משפחות
              </Button>

              <Button
                onClick={() => window.location.href = '/admin/pricing'}
                variant="outline"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                הגדרות מחיר
              </Button>

              <Button
                onClick={() => window.location.href = '/admin/billing'}
                variant="outline"
                className="gap-2"
              >
                <DollarSign className="h-4 w-4" />
                ניהול תשלומים
              </Button>

              <Button
                onClick={() => window.location.href = '/admin/email-settings'}
                variant="outline"
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                הגדרות אימייל
              </Button>

              <Button
                onClick={() => window.location.href = '/admin/sms-settings'}
                variant="outline"
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                הגדרות SMS
              </Button>

              <Button
                onClick={() => window.location.href = '/admin/settings'}
                variant="outline"
                className="gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                הגדרות מערכת
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;