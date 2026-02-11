import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, Database, Server, Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle, Zap, Users, CreditCard, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

interface ServiceStatus {
  name: string;
  icon: React.ElementType;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  message: string;
  lastChecked: Date | null;
  details?: string;
}

interface SystemStats {
  totalAccounts: number;
  totalMembers: number;
  totalExpenses: number;
  totalChildren: number;
  activeSubscriptions: number;
  cronJobs: { jobname: string; schedule: string; active: boolean }[];
  recentActivity: { table: string; count: number }[];
}

const AdminSystemHealth: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    setLoading(true);

    // Initialize services as checking
    const initialServices: ServiceStatus[] = [
      { name: 'בסיס נתונים (Supabase)', icon: Database, status: 'checking', message: 'בודק...', lastChecked: null },
      { name: 'אימות משתמשים (Auth)', icon: Users, status: 'checking', message: 'בודק...', lastChecked: null },
      { name: 'Edge Functions', icon: Zap, status: 'checking', message: 'בודק...', lastChecked: null },
      { name: 'Cron Jobs', icon: Clock, status: 'checking', message: 'בודק...', lastChecked: null },
      { name: 'מנויים ותשלומים', icon: CreditCard, status: 'checking', message: 'בודק...', lastChecked: null },
    ];
    setServices(initialServices);

    const updatedServices: ServiceStatus[] = [...initialServices];

    // Check 1: Database connectivity
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true });
      const latency = Date.now() - start;

      if (error) throw error;
      updatedServices[0] = {
        ...updatedServices[0],
        status: latency > 3000 ? 'warning' : 'healthy',
        message: latency > 3000 ? `תגובה איטית (${latency}ms)` : `תקין (${latency}ms)`,
        lastChecked: new Date(),
        details: `${count} חשבונות בבסיס הנתונים`,
      };
    } catch (error: any) {
      updatedServices[0] = {
        ...updatedServices[0],
        status: 'error',
        message: `שגיאה: ${error.message}`,
        lastChecked: new Date(),
      };
    }

    // Check 2: Auth service
    try {
      const start = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const latency = Date.now() - start;

      if (error) throw error;
      updatedServices[1] = {
        ...updatedServices[1],
        status: data.session ? 'healthy' : 'warning',
        message: data.session ? `תקין (${latency}ms)` : 'אין session פעיל',
        lastChecked: new Date(),
        details: data.session ? `משתמש: ${data.session.user.email}` : undefined,
      };
    } catch (error: any) {
      updatedServices[1] = {
        ...updatedServices[1],
        status: 'error',
        message: `שגיאה: ${error.message}`,
        lastChecked: new Date(),
      };
    }

    // Check 3: Edge Functions
    try {
      const start = Date.now();
      // Try to invoke a simple function
      const { data, error } = await supabase.functions.invoke('get-user-emails', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const latency = Date.now() - start;

      updatedServices[2] = {
        ...updatedServices[2],
        status: error ? 'warning' : 'healthy',
        message: error ? `אזהרה: ${error.message}` : `תקין (${latency}ms)`,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      updatedServices[2] = {
        ...updatedServices[2],
        status: 'warning',
        message: 'לא ניתן לבדוק (אין פונקציה לבדיקה)',
        lastChecked: new Date(),
      };
    }

    // Check 4: Cron jobs
    try {
      const { data, error } = await supabase
        .from('cron.job' as any)
        .select('jobname, schedule, active');

      if (error) {
        // cron.job might not be directly accessible via API
        updatedServices[3] = {
          ...updatedServices[3],
          status: 'warning',
          message: 'לא ניתן לגשת לטבלת cron ישירות',
          lastChecked: new Date(),
          details: 'יש לבדוק ב-Supabase Dashboard',
        };
      } else {
        const activeJobs = (data || []).filter((j: any) => j.active);
        updatedServices[3] = {
          ...updatedServices[3],
          status: activeJobs.length > 0 ? 'healthy' : 'warning',
          message: `${activeJobs.length} jobs פעילים`,
          lastChecked: new Date(),
          details: (data || []).map((j: any) => `${j.jobname}: ${j.schedule}`).join(', '),
        };
      }
    } catch {
      updatedServices[3] = {
        ...updatedServices[3],
        status: 'warning',
        message: 'לא ניתן לבדוק cron jobs',
        lastChecked: new Date(),
      };
    }

    // Check 5: Subscriptions system
    try {
      const { count: expiredCount } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'expired');

      const { count: trialCount } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trial');

      updatedServices[4] = {
        ...updatedServices[4],
        status: 'healthy',
        message: `${trialCount || 0} trials, ${expiredCount || 0} expired`,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      updatedServices[4] = {
        ...updatedServices[4],
        status: 'error',
        message: `שגיאה: ${error.message}`,
        lastChecked: new Date(),
      };
    }

    setServices(updatedServices);

    // Load system stats
    try {
      const [accounts, members, expenses, children, activeSubscriptions] = await Promise.all([
        supabase.from('accounts').select('*', { count: 'exact', head: true }),
        supabase.from('account_members').select('*', { count: 'exact', head: true }),
        supabase.from('expenses').select('*', { count: 'exact', head: true }),
        supabase.from('children').select('*', { count: 'exact', head: true }),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      ]);

      // Recent activity (last 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [recentExpenses, recentMembers] = await Promise.all([
        supabase.from('expenses').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
        supabase.from('account_members').select('*', { count: 'exact', head: true }).gte('joined_at', yesterday),
      ]);

      setSystemStats({
        totalAccounts: accounts.count || 0,
        totalMembers: members.count || 0,
        totalExpenses: expenses.count || 0,
        totalChildren: children.count || 0,
        activeSubscriptions: activeSubscriptions.count || 0,
        cronJobs: [],
        recentActivity: [
          { table: 'הוצאות חדשות (24 שעות)', count: recentExpenses.count || 0 },
          { table: 'חברים חדשים (24 שעות)', count: recentMembers.count || 0 },
        ],
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }

    setLastRefresh(new Date());
    setLoading(false);
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking': return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50';
      case 'warning': return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50';
      case 'error': return 'bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50';
      case 'checking': return 'bg-muted/50 border-border/50';
    }
  };

  const overallStatus = services.some(s => s.status === 'error') ? 'error'
    : services.some(s => s.status === 'warning') ? 'warning'
    : services.some(s => s.status === 'checking') ? 'checking'
    : 'healthy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in">
          <Button onClick={() => window.history.back()} variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">חזור</span>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">בריאות מערכת</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  עדכון אחרון: {lastRefresh.toLocaleTimeString('he-IL')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            <Badge variant={overallStatus === 'healthy' ? 'default' : overallStatus === 'warning' ? 'secondary' : 'destructive'}>
              {overallStatus === 'healthy' ? 'תקין' : overallStatus === 'warning' ? 'אזהרות' : overallStatus === 'error' ? 'שגיאות' : 'בודק...'}
            </Badge>
          </div>
          <Button onClick={runHealthChecks} variant="outline" size="sm" className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">בדוק שוב</span>
          </Button>
        </div>

        {/* Services Status */}
        <Card className="animate-fade-in [animation-delay:200ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              סטטוס שירותים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${getStatusColor(service.status)}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{service.name}</div>
                      {service.details && (
                        <div className="text-xs text-muted-foreground truncate">{service.details}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{service.message}</span>
                    {getStatusIcon(service.status)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* System Stats */}
        {systemStats && (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 animate-fade-in [animation-delay:400ms]">
            <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <Database className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <div className="text-xl sm:text-2xl font-bold">{systemStats.totalAccounts}</div>
                <div className="text-xs text-muted-foreground">חשבונות</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <div className="text-xl sm:text-2xl font-bold">{systemStats.totalMembers}</div>
                <div className="text-xs text-muted-foreground">משתמשים</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <CreditCard className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                <div className="text-xl sm:text-2xl font-bold">{systemStats.totalExpenses.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">הוצאות</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-pink-500" />
                <div className="text-xl sm:text-2xl font-bold">{systemStats.totalChildren}</div>
                <div className="text-xs text-muted-foreground">ילדים</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-card/90 to-card/80 border-border/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                <div className="text-xl sm:text-2xl font-bold">{systemStats.activeSubscriptions}</div>
                <div className="text-xs text-muted-foreground">מנויים פעילים</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        {systemStats && systemStats.recentActivity.length > 0 && (
          <Card className="animate-fade-in [animation-delay:600ms]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                פעילות אחרונה (24 שעות)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {systemStats.recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm">{item.table}</span>
                    <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSystemHealth;
