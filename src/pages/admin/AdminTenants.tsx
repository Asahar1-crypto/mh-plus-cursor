import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Users, Calendar, DollarSign, MoreHorizontal, RefreshCw, Eye, Activity, Database, Trash2, UserMinus, UserPlus, MessageSquare, Crown, CreditCard } from 'lucide-react';
import { InvitationsSection } from '@/components/admin/InvitationsSection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Tenant {
  id: string;
  name: string;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  owner_name: string;
  owner_email: string;
  owner_last_login: string | null;
  total_members: number;
  total_expenses: number;
  monthly_price: number;
  last_activity: string | null;
  monthly_expenses_count: number;
  data_size_mb: number;
  sms_notifications_enabled: boolean;
  plan_slug: string | null;
  billing_period: string | null;
  member_details: Array<{
    name: string;
    email: string;
    role: string;
    user_id: string;
    last_login: string | null;
    joined_at: string;
  }>;
}

const AdminTenants: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null
  });
  const [deleteMemberDialog, setDeleteMemberDialog] = useState<{ 
    open: boolean; 
    tenant: Tenant | null; 
    member: { name: string; email: string; role: string; user_id?: string } | null 
  }>({
    open: false,
    tenant: null,
    member: null
  });
  const [addMemberDialog, setAddMemberDialog] = useState<{ 
    open: boolean; 
    tenant: Tenant | null; 
  }>({
    open: false,
    tenant: null
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [adminPromotionDialog, setAdminPromotionDialog] = useState<{
    open: boolean;
    userToDelete: string;
    adminAccounts: any[];
    promotions: Record<string, string>;
  }>({
    open: false,
    userToDelete: '',
    adminAccounts: [],
    promotions: {}
  });
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null
  });
  const [trialDialog, setTrialDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null
  });
  const [customTrialDays, setCustomTrialDays] = useState<string>('30');
  const [subscriptionDialog, setSubscriptionDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null
  });
  const [subscriptionForm, setSubscriptionForm] = useState<{
    plan_slug: string;
    billing_period: string;
    status: string;
  }>({ plan_slug: '', billing_period: 'monthly', status: 'active' });
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [availablePlans, setAvailablePlans] = useState<{ slug: string; name: string; monthly_price: number; yearly_price: number; max_members: number }[]>([]);

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadTenants();
    loadDeletedUsers();
  }, []);

  const loadTenants = async () => {
    console.log('🚀 loadTenants function called');
    try {
      setLoading(true);

      // קבלת מחירים מטבלת תוכניות
      const { data: pricingPlansData } = await supabase
        .from('pricing_plans')
        .select('slug, name, monthly_price, yearly_price, max_members')
        .eq('is_active', true)
        .order('sort_order');

      const planPriceMap: Record<string, { monthly: number; yearly: number }> = {};
      (pricingPlansData || []).forEach((p) => {
        planPriceMap[p.slug] = { monthly: p.monthly_price, yearly: p.yearly_price };
      });

      setAvailablePlans(
        (pricingPlansData || []).map((p: any) => ({
          slug: p.slug,
          name: p.slug === 'personal' ? 'אישי' : p.slug === 'family' ? 'משפחתי' : p.slug,
          monthly_price: p.monthly_price,
          yearly_price: p.yearly_price,
          max_members: p.max_members || 1,
        }))
      );

      // שאילתה מורכבת לקבלת כל הנתונים הנדרשים
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          subscription_status,
          trial_ends_at,
          created_at,
          owner_id,
          sms_notifications_enabled,
          plan_slug,
          billing_period,
          profiles!accounts_owner_id_fkey(name, last_login),
          account_members(
            user_id,
            role,
            joined_at,
            profiles!account_members_user_id_fkey(name, last_login)
          ),
          expenses(count)
        `);

      if (error) throw error;

      // קבלת רשימת כל המשתמשים עם האימיילים שלהם
      console.log('Attempting to fetch user emails...');
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      let userEmailMap = new Map<string, string>();
      
      console.log('Email fetch result:', { emailData, emailError });
      
      if (!emailError && emailData?.success) {
        Object.entries(emailData.userEmails).forEach(([userId, email]) => {
          userEmailMap.set(userId, email as string);
        });
        setUserEmails(emailData.userEmails);
        console.log('Successfully loaded user emails:', Object.keys(emailData.userEmails).length);
      } else {
        console.error('Failed to fetch user emails:', emailError);
        console.log('Using fallback: getting current user email from session');
        
        // Fallback: לפחות לאפשר את המייל של המשתמש הנוכחי
        const currentSession = await supabase.auth.getSession();
        if (currentSession.data.session?.user?.email) {
          userEmailMap.set(
            currentSession.data.session.user.id, 
            currentSession.data.session.user.email
          );
          console.log('Added current user email:', currentSession.data.session.user.email);
        }
      }

      // קבלת פעילות אחרונה ונתונים נוספים
      const tenantsWithDetails = await Promise.all(
        (data || []).map(async (tenant) => {
          // קבלת הוצאות מהחודש הנוכחי
          const currentMonth = new Date();
          const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          
          const { data: monthlyExpenses } = await supabase
            .from('expenses')
            .select('id')
            .eq('account_id', tenant.id)
            .gte('created_at', firstDay.toISOString());

          // קבלת פעילות אחרונה
          const { data: lastActivity } = await supabase
            .from('expenses')
            .select('created_at')
            .eq('account_id', tenant.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // הכנת רשימת חברים מפורטת עם האימיילים הנכונים
          const memberDetails = (tenant.account_members || []).map((member: any) => {
            const email = userEmailMap.get(member.user_id) || 'לא ידוע';
            console.log(`Member ${member.user_id}: name=${member.profiles?.name}, email=${email}`);
            return {
              name: member.profiles?.name || 'לא ידוע',
              email: email,
              role: member.role,
              user_id: member.user_id,
              last_login: member.profiles?.last_login,
              joined_at: member.joined_at
            };
          });

          // חישוב גודל נתונים משוער (MB)
          const expenseCount = (tenant.expenses as any)?.length || 0;
          const memberCount = (tenant.account_members as any)?.length || 0;
          const estimatedDataSize = (expenseCount * 0.5) + (memberCount * 0.1); // הערכה גסה

          return {
            id: tenant.id,
            name: tenant.name,
            subscription_status: tenant.subscription_status || 'trial',
            trial_ends_at: tenant.trial_ends_at,
            created_at: tenant.created_at,
            owner_name: (tenant.profiles as any)?.name || 'לא ידוע',
            owner_email: userEmailMap.get(tenant.owner_id) || 'לא ידוע',
            owner_last_login: (tenant.profiles as any)?.last_login,
            total_members: (tenant.account_members as any)?.length || 0,
            total_expenses: expenseCount,
            monthly_price: tenant.subscription_status === 'active' && (tenant as any).plan_slug
              ? ((tenant as any).billing_period === 'yearly'
                ? (planPriceMap[(tenant as any).plan_slug]?.yearly || 0) / 12
                : (planPriceMap[(tenant as any).plan_slug]?.monthly || 0))
              : 0,
            last_activity: lastActivity?.[0]?.created_at || null,
            monthly_expenses_count: monthlyExpenses?.length || 0,
            data_size_mb: parseFloat(estimatedDataSize.toFixed(2)),
            sms_notifications_enabled: (tenant as any).sms_notifications_enabled || false,
            plan_slug: (tenant as any).plan_slug || null,
            billing_period: (tenant as any).billing_period || null,
            member_details: memberDetails
          };
        })
      );

      setTenants(tenantsWithDetails);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת רשימת המשפחות',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('deleted_users')
        .select(`
          *,
          deleted_by_profile:profiles!deleted_users_deleted_by_fkey(name)
        `)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUsers(data || []);
    } catch (error) {
      console.error('Error loading deleted users:', error);
    }
  };

  const getStatusBadge = (status: string, trialEndsAt: string | null) => {
    const now = new Date();
    const isTrialExpiring = trialEndsAt && new Date(trialEndsAt) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    switch (status) {
      case 'active':
        return <Badge variant="default">פעיל</Badge>;
      case 'trial':
        return (
          <Badge variant={isTrialExpiring ? "destructive" : "secondary"}>
            {isTrialExpiring ? 'ניסיון - פג תוקף בקרוב' : 'תקופת ניסיון'}
          </Badge>
        );
      case 'expired':
        return <Badge variant="destructive">פג תוקף</Badge>;
      case 'canceled':
        return <Badge variant="outline">בוטל</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTrialStatus = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    
    const now = new Date();
    const endDate = new Date(trialEndsAt);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'פג תוקף';
    if (daysLeft <= 3) return `${daysLeft} ימים נותרו`;
    return `עוד ${daysLeft} ימים`;
  };

  const updateTenantStatus = async (tenantId: string, newStatus: string) => {
    try {
      setActionLoading(tenantId);

      const { error } = await supabase
        .from('accounts')
        .update({ subscription_status: newStatus })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: `סטטוס המשפחה עודכן ל-${newStatus}`,
      });

      await loadTenants();
    } catch (error) {
      console.error('Error updating tenant status:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בעדכון סטטוס המשפחה',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSmsNotifications = async (tenantId: string, currentValue: boolean) => {
    try {
      setActionLoading(`sms-${tenantId}`);

      const { error } = await supabase
        .from('accounts')
        .update({ sms_notifications_enabled: !currentValue })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: !currentValue ? 'התראות SMS הופעלו למשפחה' : 'התראות SMS בוטלו למשפחה',
      });

      await loadTenants();
      
      // Update viewDetailsDialog if it's open for this tenant
      if (viewDetailsDialog.tenant?.id === tenantId) {
        setViewDetailsDialog({
          open: true,
          tenant: { ...viewDetailsDialog.tenant, sms_notifications_enabled: !currentValue }
        });
      }
    } catch (error) {
      console.error('Error toggling SMS notifications:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בעדכון הגדרות SMS',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getPlanBadge = (planSlug: string | null, billingPeriod: string | null) => {
    if (!planSlug) {
      return <Badge variant="outline" className="text-xs">ללא תוכנית</Badge>;
    }
    const planName = planSlug === 'personal' ? 'אישי' : planSlug === 'family' ? 'משפחתי' : planSlug;
    const billingLabel = billingPeriod === 'yearly' ? 'שנתי' : 'חודשי';
    const variant = planSlug === 'family' ? 'default' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs gap-1">
        {planSlug === 'family' && <Crown className="h-3 w-3" />}
        {planName} ({billingLabel})
      </Badge>
    );
  };

  const updateTenantSubscription = async (tenantId: string, planSlug: string, billingPeriod: string, status: string) => {
    try {
      setActionLoading(`sub-${tenantId}`);

      const updateData: any = {
        subscription_status: status,
        plan_slug: planSlug || null,
        billing_period: billingPeriod || null,
      };

      // If activating, clear trial_ends_at
      if (status === 'active') {
        updateData.trial_ends_at = null;
      }

      const { error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', tenantId);

      if (error) throw error;

      // Also create/update subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          account_id: tenantId,
          status: status,
          plan_slug: planSlug || null,
          billing_period: billingPeriod || null,
          payment_provider: 'manual',
          started_at: new Date().toISOString(),
        }, {
          onConflict: 'account_id'
        });

      if (subError) {
        console.warn('Warning: Could not update subscription record:', subError);
      }

      toast({
        title: 'הצלחה',
        description: `מנוי המשפחה עודכן בהצלחה`,
      });

      await loadTenants();
      setSubscriptionDialog({ open: false, tenant: null });
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בעדכון מנוי המשפחה',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const extendTrial = async (tenantId: string, days: number = 30) => {
    try {
      setActionLoading(tenantId);

      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + days);

      const { error } = await supabase
        .from('accounts')
        .update({ 
          trial_ends_at: newTrialEnd.toISOString(),
          subscription_status: 'trial'
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: `תקופת הניסיון הוגדרה ל-${days} ימים מהיום`,
      });

      await loadTenants();
      setTrialDialog({ open: false, tenant: null });
    } catch (error) {
      console.error('Error extending trial:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בעדכון תקופת הניסיון',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTenant = async (tenantId: string, tenantName: string) => {
    try {
      setActionLoading(tenantId);
      
      const { data, error } = await supabase.functions.invoke('delete-tenant', {
        body: {
          tenant_id: tenantId,
          confirmation_name: tenantName
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'הצלחה',
        description: `המשפחה "${tenantName}" נמחקה בהצלחה`,
      });

      await loadTenants();
      setDeleteDialog({ open: false, tenant: null });
      setConfirmationInput('');
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה במחיקת המשפחה',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const addTenantMember = async (tenantId: string, userEmail: string, role: 'admin' | 'member') => {
    try {
      setActionLoading(`add-${tenantId}`);
      
      const { data, error } = await supabase.functions.invoke('add-tenant-member', {
        body: {
          tenant_id: tenantId,
          user_email: userEmail,
          role: role
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'הצלחה',
        description: `המשתמש "${userEmail}" נוסף למשפחה בהצלחה`,
      });

      await loadTenants();
      setAddMemberDialog({ open: false, tenant: null });
      setNewMemberEmail('');
      setNewMemberRole('member');
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בהוספת המשתמש',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const removeTenantMember = async (tenantId: string, userId: string, memberName: string) => {
    try {
      setActionLoading(`${tenantId}-${userId}`);
      
      const { data, error } = await supabase.functions.invoke('remove-tenant-member', {
        body: {
          tenant_id: tenantId,
          user_id: userId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'הצלחה',
        description: `המשתמש "${memberName}" הוסר מהמשפחה בהצלחה`,
      });

      await loadTenants();
      setDeleteMemberDialog({ open: false, tenant: null, member: null });
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בהסרת המשתמש',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, adminPromotions?: Record<string, string>) => {
    if (!userId) return;
    
    const userEmail = userEmails[userId] || 'משתמש לא ידוע';
    
    // First attempt - check if user is admin and needs promotions
    if (!adminPromotions) {
      if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail} לגמרי מהמערכת?\n\nפעולה זו תמחק את המשתמש מכל המשפחות ותמנע ממנו להתחבר עד שיעשה רישום מחדש.`)) {
        return;
      }

      // אישור נוסף
      if (!confirm("זאת אזהרה אחרונה! המחיקה היא בלתי הפיכה. האם להמשיך?")) {
        return;
      }
    }

    try {
      setActionLoading(`delete-user-${userId}`);
      
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { 
          user_id: userId,
          admin_promotions: adminPromotions 
        }
      });

      if (error) throw error;

      // Check if admin promotion is required
      if (data.requires_admin_promotion) {
        setAdminPromotionDialog({
          open: true,
          userToDelete: userId,
          adminAccounts: data.admin_accounts,
          promotions: {}
        });
        setActionLoading(null);
        return;
      }

      if (data.success) {
        toast({
          title: 'הצלחה',
          description: data.message,
        });
        // רענן את הנתונים
        await loadTenants();
        await loadDeletedUsers();
        // סגור דיאלוגים פתוחים
        setViewDetailsDialog({ open: false, tenant: null });
        setDeleteMemberDialog({ open: false, tenant: null, member: null });
        setAdminPromotionDialog({ open: false, userToDelete: '', adminAccounts: [], promotions: {} });
      } else {
        toast({
          title: 'שגיאה',
          description: data.error || "שגיאה במחיקת המשתמש",
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'שגיאה',
        description: "שגיאה במחיקת המשתמש: " + error.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || tenant.subscription_status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען רשימת משפחות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">חזור</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">ניהול משפחות</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">נהל את כל המשפחות במערכת</p>
          </div>
          <Button
            onClick={loadTenants}
            variant="outline"
            size="sm"
            className="gap-1 sm:gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">רענן</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש משפחה או בעלים..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="trial">תקופת ניסיון</option>
                <option value="active">פעיל</option>
                <option value="expired">פג תוקף</option>
                <option value="canceled">בוטל</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">סה"כ משפחות</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-xs sm:text-sm text-muted-foreground">פעילות</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {tenants.filter(t => t.subscription_status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                <span className="text-xs sm:text-sm text-muted-foreground">ניסיון</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {tenants.filter(t => t.subscription_status === 'trial').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                <span className="text-xs sm:text-sm text-muted-foreground">פג תוקף</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {tenants.filter(t => t.subscription_status === 'expired').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <UserMinus className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                <span className="text-xs sm:text-sm text-muted-foreground">נמחקו</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-600">
                {deletedUsers.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">רשימת משפחות ({filteredTenants.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4 md:p-6 sm:pt-0 md:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2 sm:p-3 md:p-4">שם המשפחה</th>
                    <th className="text-right p-2 sm:p-3 md:p-4">בעלים</th>
                    <th className="text-right p-2 sm:p-3 md:p-4">סטטוס</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 hidden sm:table-cell">תוכנית</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 hidden sm:table-cell">חברים</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 hidden lg:table-cell">כניסה אחרונה</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 hidden lg:table-cell">פעילות חודשית</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 hidden xl:table-cell">גודל נתונים</th>
                    <th className="text-right p-2 sm:p-3 md:p-4 hidden md:table-cell">נרשם</th>
                    <th className="text-right p-2 sm:p-3 md:p-4">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 sm:p-3 md:p-4 font-medium">{tenant.name}</td>
                      <td className="p-2 sm:p-3 md:p-4">
                        <div>
                          <div className="font-medium text-xs sm:text-sm">{tenant.owner_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {tenant.total_members} חברים במשפחה
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4">
                        {getStatusBadge(tenant.subscription_status, tenant.trial_ends_at)}
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell">
                        {getPlanBadge(tenant.plan_slug, tenant.billing_period)}
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="font-medium">{tenant.total_members}</span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden lg:table-cell">
                        {tenant.owner_last_login ? (
                          <div>
                            <div className="text-sm">
                              {new Date(tenant.owner_last_login).toLocaleDateString('he-IL')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.ceil((Date.now() - new Date(tenant.owner_last_login).getTime()) / (1000 * 60 * 60 * 24))} ימים
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">מעולם לא נכנס</span>
                        )}
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span className="font-medium">{tenant.monthly_expenses_count}</span>
                          <span className="text-xs text-muted-foreground">הוצאות</span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          <span className="text-sm">{tenant.data_size_mb}MB</span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 md:p-4 hidden md:table-cell">
                        {new Date(tenant.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="p-2 sm:p-3 md:p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === tenant.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setViewDetailsDialog({ open: true, tenant });
                              }}
                            >
                              <Eye className="h-4 w-4 ml-2" />
                              פרטי משפחה
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSubscriptionForm({
                                  plan_slug: tenant.plan_slug || '',
                                  billing_period: tenant.billing_period || 'monthly',
                                  status: tenant.subscription_status || 'trial',
                                });
                                setSubscriptionDialog({ open: true, tenant });
                              }}
                            >
                              <CreditCard className="h-4 w-4 ml-2" />
                              ניהול מנוי
                            </DropdownMenuItem>
                            {(tenant.subscription_status === 'trial' || tenant.subscription_status === 'expired') && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setCustomTrialDays('30');
                                  setTrialDialog({ open: true, tenant });
                                }}
                              >
                                <Calendar className="h-4 w-4 ml-2" />
                                {tenant.subscription_status === 'trial' ? 'שנה תקופת ניסיון' : 'חדש תקופת ניסיון'}
                              </DropdownMenuItem>
                            )}
                            
                            {tenant.subscription_status !== 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateTenantStatus(tenant.id, 'active')}
                              >
                                הפעל מנוי
                              </DropdownMenuItem>
                            )}
                            
                            {tenant.subscription_status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateTenantStatus(tenant.id, 'canceled')}
                              >
                                בטל מנוי
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => updateTenantStatus(tenant.id, 'expired')}
                              className="text-red-600"
                            >
                              הפסק גישה
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => {
                                setDeleteDialog({ open: true, tenant });
                                setConfirmationInput('');
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              מחק משפחה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredTenants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  לא נמצאו משפחות התואמות לחיפוש
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deleted Users Section */}
        {deletedUsers.length > 0 && (
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">משתמשים שנמחקו על ידי אדמין ({deletedUsers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4 md:p-6 sm:pt-0 md:pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-2 sm:p-3 md:p-4">שם</th>
                      <th className="text-right p-2 sm:p-3 md:p-4">אימייל</th>
                      <th className="text-right p-2 sm:p-3 md:p-4 hidden sm:table-cell">נמחק על ידי</th>
                      <th className="text-right p-2 sm:p-3 md:p-4 hidden md:table-cell">תאריך מחיקה</th>
                      <th className="text-right p-2 sm:p-3 md:p-4 hidden lg:table-cell">משפחות שנמחקו</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedUsers.map((deletedUser) => (
                      <tr key={deletedUser.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 sm:p-3 md:p-4">
                          <div className="font-medium text-xs sm:text-sm">{deletedUser.name || 'לא ידוע'}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">ID: {deletedUser.original_user_id}</div>
                        </td>
                        <td className="p-2 sm:p-3 md:p-4 text-xs sm:text-sm break-all">{deletedUser.email}</td>
                        <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell">
                          {deletedUser.deleted_by_profile?.name || 'לא ידוע'}
                        </td>
                        <td className="p-2 sm:p-3 md:p-4 hidden md:table-cell">
                          {new Date(deletedUser.deleted_at).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2 sm:p-3 md:p-4 hidden lg:table-cell">
                          {deletedUser.accounts_deleted && deletedUser.accounts_deleted.length > 0 ? (
                            <div className="text-sm">
                              {deletedUser.accounts_deleted.map((accountName: string, index: number) => (
                                <Badge key={index} variant="outline" className="mr-1 mb-1">
                                  {accountName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">אין משפחות</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invitations Section */}
        <InvitationsSection />

        {/* Delete Tenant Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
          setDeleteDialog({ open, tenant: null });
          setConfirmationInput('');
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">⚠️ מחיקת משפחה - פעולה בלתי הפיכה</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div>
                    אתה עומד למחוק את משפחת <strong>"{deleteDialog.tenant?.name}"</strong> לצמיתות.
                  </div>
                  <div className="bg-destructive/10 p-3 rounded border-r-4 border-destructive">
                    <strong>פעולה זו תמחק:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>את כל החברים במשפחה</li>
                      <li>את כל ההוצאות והנתונים</li>
                      <li>את כל הילדים והקשורים</li>
                      <li>את כל ההזמנות וההגדרות</li>
                    </ul>
                  </div>
                  <div>
                    <strong>אישור:</strong> הקלד את שם המשפחה בדיוק כדי לאשר את המחיקה:
                  </div>
                  <Input
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder={`הקלד: ${deleteDialog.tenant?.name}`}
                    className="mt-2"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                disabled={confirmationInput !== deleteDialog.tenant?.name || actionLoading === deleteDialog.tenant?.id}
                onClick={() => {
                  if (deleteDialog.tenant && confirmationInput === deleteDialog.tenant.name) {
                    deleteTenant(deleteDialog.tenant.id, deleteDialog.tenant.name);
                  }
                }}
              >
                {actionLoading === deleteDialog.tenant?.id ? 'מוחק...' : 'מחק לצמיתות'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Member Dialog */}
        <AlertDialog open={addMemberDialog.open} onOpenChange={(open) => {
          setAddMemberDialog({ open, tenant: null });
          setNewMemberEmail('');
          setNewMemberRole('member');
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>הוספת משתמש למשפחה</AlertDialogTitle>
              <AlertDialogDescription>
                הוסף משתמש קיים במערכת למשפחת "{addMemberDialog.tenant?.name}"
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">כתובת אימייל</label>
                <Input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="הכנס כתובת אימייל של המשתמש"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">תפקיד</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="member">חבר</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded border-r-4 border-blue-500">
                <p className="text-sm text-blue-800">
                  <strong>שים לב:</strong> המשתמש חייב להיות כבר רשום במערכת. 
                  אם הוא לא רשום, הוא צריך להירשם קודם.
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                disabled={!newMemberEmail.trim() || actionLoading === `add-${addMemberDialog.tenant?.id}`}
                onClick={() => {
                  if (addMemberDialog.tenant && newMemberEmail.trim()) {
                    addTenantMember(addMemberDialog.tenant.id, newMemberEmail.trim(), newMemberRole);
                  }
                }}
              >
                {actionLoading === `add-${addMemberDialog.tenant?.id}` ? 'מוסיף...' : 'הוסף למשפחה'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Member Dialog */}
        <AlertDialog open={deleteMemberDialog.open} onOpenChange={(open) => 
          setDeleteMemberDialog({ open, tenant: null, member: null })
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>הסרת משתמש מהמשפחה</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך להסיר את <strong>{deleteMemberDialog.member?.name}</strong> 
                ממשפחת "{deleteMemberDialog.tenant?.name}"?
                
                <div className="mt-3 p-2 bg-muted rounded">
                  <strong>תפקיד:</strong> {deleteMemberDialog.member?.role === 'admin' ? 'מנהל' : 'חבר'}
                </div>

                {/* אזהרה מיוחדת למנהל אחרון */}
                {deleteMemberDialog.member?.role === 'admin' && 
                 deleteMemberDialog.tenant?.member_details?.filter(m => m.role === 'admin').length === 1 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <span className="text-yellow-600">⚠️</span>
                      <strong>אזהרה:</strong>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      זהו המנהל האחרון במשפחה זו. הסרתו תשאיר את המשפחה ללא מנהל.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                disabled={actionLoading === `${deleteMemberDialog.tenant?.id}-${deleteMemberDialog.member?.user_id}`}
                onClick={() => {
                  if (deleteMemberDialog.tenant && deleteMemberDialog.member?.user_id) {
                    removeTenantMember(
                      deleteMemberDialog.tenant.id, 
                      deleteMemberDialog.member.user_id, 
                      deleteMemberDialog.member.name
                    );
                  }
                }}
              >
                {actionLoading === `${deleteMemberDialog.tenant?.id}-${deleteMemberDialog.member?.user_id}` ? 'מסיר...' : 'הסר מהמשפחה'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Admin Promotion Dialog */}
        <AlertDialog open={adminPromotionDialog.open} onOpenChange={(open) => {
          if (!open) {
            setAdminPromotionDialog({ open: false, userToDelete: '', adminAccounts: [], promotions: {} });
          }
        }}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>בחירת אדמין חדש</AlertDialogTitle>
              <AlertDialogDescription>
                המשתמש שאתה מוחק הוא אדמין במשפחות הבאות. יש לבחור מי יהפוך לאדמין במקומו או להשאיר ללא אדמין.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {adminPromotionDialog.adminAccounts.map((account) => (
                <div key={account.account_id} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">משפחת {account.account_name}</h4>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">בחר מנהל חדש:</label>
                    <select
                      value={adminPromotionDialog.promotions[account.account_id] || ''}
                      onChange={(e) => {
                        setAdminPromotionDialog(prev => ({
                          ...prev,
                          promotions: {
                            ...prev.promotions,
                            [account.account_id]: e.target.value
                          }
                        }));
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">השאר ללא מנהל</option>
                      {account.other_members.map((member: any) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name} ({member.role === 'admin' ? 'מנהל' : 'חבר'})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mt-3 p-2 bg-muted rounded text-sm">
                    <strong>חברים במשפחה:</strong>
                    {account.other_members.map((member: any, index: number) => (
                      <div key={member.user_id} className="text-xs text-muted-foreground">
                        • {member.name} ({member.role === 'admin' ? 'מנהל' : 'חבר'})
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleDeleteUser(adminPromotionDialog.userToDelete, adminPromotionDialog.promotions);
                }}
                disabled={actionLoading === `delete-user-${adminPromotionDialog.userToDelete}`}
                className="bg-destructive hover:bg-destructive/90"
              >
                {actionLoading === `delete-user-${adminPromotionDialog.userToDelete}` ? 'מוחק...' : 'המשך במחיקה'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Trial Period Dialog */}
        <AlertDialog open={trialDialog.open} onOpenChange={(open) => {
          setTrialDialog({ open, tenant: null });
          setCustomTrialDays('30');
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>הגדרת תקופת ניסיון</AlertDialogTitle>
              <AlertDialogDescription>
                הגדר תקופת ניסיון מותאמת אישית למשפחת "{trialDialog.tenant?.name}"
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">מספר ימים מהיום</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={customTrialDays}
                    onChange={(e) => setCustomTrialDays(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">ימים</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    variant={customTrialDays === String(days) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCustomTrialDays(String(days))}
                  >
                    {days} ימים
                  </Button>
                ))}
              </div>

              {trialDialog.tenant?.trial_ends_at && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <div className="font-medium mb-1">מצב נוכחי:</div>
                  <div>סטטוס: {trialDialog.tenant.subscription_status === 'trial' ? 'תקופת ניסיון' : 'פג תוקף'}</div>
                  <div>תאריך תפוגה נוכחי: {new Date(trialDialog.tenant.trial_ends_at).toLocaleDateString('he-IL')}</div>
                  {customTrialDays && (
                    <div className="mt-2 text-primary font-medium">
                      תאריך תפוגה חדש: {(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + parseInt(customTrialDays || '0'));
                        return d.toLocaleDateString('he-IL');
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                disabled={!customTrialDays || parseInt(customTrialDays) < 1 || actionLoading === trialDialog.tenant?.id}
                onClick={() => {
                  if (trialDialog.tenant && customTrialDays) {
                    extendTrial(trialDialog.tenant.id, parseInt(customTrialDays));
                  }
                }}
              >
                {actionLoading === trialDialog.tenant?.id ? 'מעדכן...' : 'עדכן תקופת ניסיון'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Subscription Management Dialog */}
        <AlertDialog open={subscriptionDialog.open} onOpenChange={(open) => {
          setSubscriptionDialog({ open, tenant: null });
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                ניהול מנוי - {subscriptionDialog.tenant?.name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                עדכן את תוכנית המנוי, תקופת החיוב וסטטוס המשפחה
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              {/* Plan Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">תוכנית</label>
                <select
                  value={subscriptionForm.plan_slug}
                  onChange={(e) => setSubscriptionForm(prev => ({ ...prev, plan_slug: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">ללא תוכנית</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.slug} value={plan.slug}>
                      {plan.name} - {plan.max_members} משתמשים (₪{plan.monthly_price}/חודש, ₪{plan.yearly_price}/שנה)
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Period */}
              <div className="space-y-2">
                <label className="text-sm font-medium">תקופת חיוב</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={subscriptionForm.billing_period === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSubscriptionForm(prev => ({ ...prev, billing_period: 'monthly' }))}
                  >
                    חודשי
                  </Button>
                  <Button
                    type="button"
                    variant={subscriptionForm.billing_period === 'yearly' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSubscriptionForm(prev => ({ ...prev, billing_period: 'yearly' }))}
                  >
                    שנתי
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">סטטוס מנוי</label>
                <select
                  value={subscriptionForm.status}
                  onChange={(e) => setSubscriptionForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="trial">תקופת ניסיון</option>
                  <option value="active">פעיל</option>
                  <option value="expired">פג תוקף</option>
                  <option value="canceled">בוטל</option>
                </select>
              </div>

              {/* Current state info */}
              {subscriptionDialog.tenant && (
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <div className="font-medium mb-2">מצב נוכחי:</div>
                  <div>סטטוס: <Badge variant="secondary" className="text-xs">{subscriptionDialog.tenant.subscription_status}</Badge></div>
                  <div>תוכנית: {getPlanBadge(subscriptionDialog.tenant.plan_slug, subscriptionDialog.tenant.billing_period)}</div>
                  <div>חברים: {subscriptionDialog.tenant.total_members}</div>
                  {subscriptionForm.plan_slug === 'personal' && subscriptionDialog.tenant.total_members > 1 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                      <strong>שים לב:</strong> למשפחה זו יש {subscriptionDialog.tenant.total_members} חברים. 
                      תוכנית אישית מאפשרת רק משתמש אחד.
                    </div>
                  )}
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                disabled={actionLoading === `sub-${subscriptionDialog.tenant?.id}`}
                onClick={() => {
                  if (subscriptionDialog.tenant) {
                    updateTenantSubscription(
                      subscriptionDialog.tenant.id,
                      subscriptionForm.plan_slug,
                      subscriptionForm.billing_period,
                      subscriptionForm.status
                    );
                  }
                }}
              >
                {actionLoading === `sub-${subscriptionDialog.tenant?.id}` ? 'מעדכן...' : 'עדכן מנוי'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Details Dialog */}
        <AlertDialog open={viewDetailsDialog.open} onOpenChange={(open) => setViewDetailsDialog({ open, tenant: null })}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg">פרטי משפחת {viewDetailsDialog.tenant?.name}</AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                מידע מפורט על המשפחה, חברים, הוצאות ופעילות.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {viewDetailsDialog.tenant && (
              <div className="space-y-4 sm:space-y-6">
                {/* סטטיסטיקות כלליות */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold">{viewDetailsDialog.tenant.total_members}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">חברים</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold">₪{viewDetailsDialog.tenant.monthly_price}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">מחיר חודשי</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold">{viewDetailsDialog.tenant.monthly_expenses_count}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">הוצאות חודש זה</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold">{viewDetailsDialog.tenant.data_size_mb}MB</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">גודל נתונים</div>
                  </div>
                </div>

                {/* רשימת חברים */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-lg font-semibold">חברי המשפחה</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAddMemberDialog({ open: true, tenant: viewDetailsDialog.tenant });
                        setNewMemberEmail('');
                        setNewMemberRole('member');
                      }}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                      הוסף חבר
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead>
                         <tr className="border-b bg-muted/50">
                           <th className="text-right p-2 sm:p-3">שם</th>
                           <th className="text-right p-2 sm:p-3">תפקיד</th>
                           <th className="text-right p-2 sm:p-3 hidden sm:table-cell">כניסה אחרונה</th>
                           <th className="text-right p-2 sm:p-3 hidden md:table-cell">הצטרף</th>
                           <th className="text-right p-2 sm:p-3">פעולות</th>
                         </tr>
                       </thead>
                      <tbody>
                        {viewDetailsDialog.tenant.member_details.map((member, index) => (
                          <tr key={index} className="border-b last:border-b-0">
                            <td className="p-2 sm:p-3">
                              <div className="font-medium text-xs sm:text-sm">{member.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{member.email}</div>
                            </td>
                            <td className="p-2 sm:p-3">
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {member.role === 'admin' ? 'מנהל' : 'חבר'}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 hidden sm:table-cell">
                              {member.last_login ? (
                                <div>
                                  <div className="text-sm">
                                    {new Date(member.last_login).toLocaleDateString('he-IL')}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {Math.ceil((Date.now() - new Date(member.last_login).getTime()) / (1000 * 60 * 60 * 24))} ימים
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">מעולם לא נכנס</span>
                              )}
                            </td>
                             <td className="p-2 sm:p-3 hidden md:table-cell">
                               {new Date(member.joined_at).toLocaleDateString('he-IL')}
                             </td>
                             <td className="p-2 sm:p-3">
                               <div className="flex gap-1">
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8 p-0"
                                   disabled={actionLoading === `${viewDetailsDialog.tenant.id}-${member.user_id}`}
                                   onClick={() => {
                                     setDeleteMemberDialog({ 
                                       open: true, 
                                       tenant: viewDetailsDialog.tenant, 
                                       member: member
                                     });
                                   }}
                                 >
                                   <UserMinus className="h-3 w-3 sm:h-4 sm:w-4" />
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8 p-0"
                                   disabled={actionLoading === `delete-user-${member.user_id}`}
                                   onClick={() => handleDeleteUser(member.user_id || '')}
                                 >
                                   <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                 </Button>
                               </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* מידע נוסף */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">מידע כללי</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>תאריך הקמה: {new Date(viewDetailsDialog.tenant.created_at).toLocaleDateString('he-IL')}</div>
                      <div>סטטוס: {getStatusBadge(viewDetailsDialog.tenant.subscription_status, viewDetailsDialog.tenant.trial_ends_at)}</div>
                      {viewDetailsDialog.tenant.trial_ends_at && (
                        <div>תוקף ניסיון: {getTrialStatus(viewDetailsDialog.tenant.trial_ends_at)}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">פעילות</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>סה"כ הוצאות: {viewDetailsDialog.tenant.total_expenses}</div>
                      <div>הוצאות חודש זה: {viewDetailsDialog.tenant.monthly_expenses_count}</div>
                      {viewDetailsDialog.tenant.last_activity && (
                        <div>פעילות אחרונה: {new Date(viewDetailsDialog.tenant.last_activity).toLocaleDateString('he-IL')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* הגדרת תקופת ניסיון */}
                {(viewDetailsDialog.tenant.subscription_status === 'trial' || viewDetailsDialog.tenant.subscription_status === 'expired') && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Calendar className="h-4 w-4" />
                      ניהול תקופת ניסיון
                    </h4>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-muted rounded-lg gap-3">
                      <div>
                        <div className="font-medium text-sm sm:text-base">
                          {viewDetailsDialog.tenant.subscription_status === 'trial' ? 'תקופת ניסיון פעילה' : 'תקופת ניסיון פגה'}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {viewDetailsDialog.tenant.trial_ends_at 
                            ? `תוקף: ${new Date(viewDetailsDialog.tenant.trial_ends_at).toLocaleDateString('he-IL')} (${getTrialStatus(viewDetailsDialog.tenant.trial_ends_at)})`
                            : 'לא הוגדר'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCustomTrialDays('30');
                          setTrialDialog({ open: true, tenant: viewDetailsDialog.tenant });
                        }}
                        className="gap-1 sm:gap-2"
                      >
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        שנה תקופה
                      </Button>
                    </div>
                  </div>
                )}

                {/* ניהול מנוי */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <CreditCard className="h-4 w-4" />
                    ניהול מנוי
                  </h4>
                  <div className="p-3 bg-muted rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm sm:text-base">תוכנית נוכחית</div>
                        <div className="flex items-center gap-2 mt-1">
                          {getPlanBadge(viewDetailsDialog.tenant.plan_slug, viewDetailsDialog.tenant.billing_period)}
                          <span className="text-xs text-muted-foreground">
                            | סטטוס: {viewDetailsDialog.tenant.subscription_status === 'active' ? 'פעיל' :
                              viewDetailsDialog.tenant.subscription_status === 'trial' ? 'ניסיון' :
                              viewDetailsDialog.tenant.subscription_status === 'expired' ? 'פג תוקף' :
                              viewDetailsDialog.tenant.subscription_status === 'canceled' ? 'בוטל' : viewDetailsDialog.tenant.subscription_status}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSubscriptionForm({
                            plan_slug: viewDetailsDialog.tenant!.plan_slug || '',
                            billing_period: viewDetailsDialog.tenant!.billing_period || 'monthly',
                            status: viewDetailsDialog.tenant!.subscription_status || 'trial',
                          });
                          setSubscriptionDialog({ open: true, tenant: viewDetailsDialog.tenant });
                        }}
                        className="gap-1 sm:gap-2"
                      >
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                        שנה מנוי
                      </Button>
                    </div>
                  </div>
                </div>

                {/* הגדרות SMS */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <MessageSquare className="h-4 w-4" />
                    הגדרות SMS
                  </h4>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-muted rounded-lg gap-3">
                    <div>
                      <div className="font-medium text-sm sm:text-base">התראות SMS על הוצאות</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        שליחת SMS לצד השני כשנוצרת הוצאה לאישור
                      </div>
                    </div>
                    <Button
                      variant={viewDetailsDialog.tenant.sms_notifications_enabled ? "default" : "outline"}
                      size="sm"
                      disabled={actionLoading === `sms-${viewDetailsDialog.tenant.id}`}
                      onClick={() => toggleSmsNotifications(
                        viewDetailsDialog.tenant!.id,
                        viewDetailsDialog.tenant!.sms_notifications_enabled
                      )}
                    >
                      {actionLoading === `sms-${viewDetailsDialog.tenant.id}` ? (
                        'מעדכן...'
                      ) : viewDetailsDialog.tenant.sms_notifications_enabled ? (
                        <>
                          <MessageSquare className="h-4 w-4 ml-1" />
                          מופעל
                        </>
                      ) : (
                        'כבוי'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel>סגור</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminTenants;