import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Users, Calendar, DollarSign, MoreHorizontal, RefreshCw, Eye, Activity, Database, Trash2, UserMinus, UserPlus } from 'lucide-react';
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
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null
  });

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);

      // קבלת מחיר חודשי מההגדרות
      const { data: priceData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'monthly_price')
        .single();

      const monthlyPrice = parseFloat(priceData?.setting_value || '50');

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
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails');
      let userEmailMap = new Map<string, string>();
      
      if (!emailError && emailData?.success) {
        Object.entries(emailData.userEmails).forEach(([userId, email]) => {
          userEmailMap.set(userId, email as string);
        });
      } else {
        console.error('Failed to fetch user emails:', emailError);
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
          const memberDetails = (tenant.account_members || []).map((member: any) => ({
            name: member.profiles?.name || 'לא ידוע',
            email: userEmailMap.get(member.user_id) || 'לא ידוע',
            role: member.role,
            user_id: member.user_id,
            last_login: member.profiles?.last_login,
            joined_at: member.joined_at
          }));

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
            monthly_price: tenant.subscription_status === 'active' ? monthlyPrice : 0,
            last_activity: lastActivity?.[0]?.created_at || null,
            monthly_expenses_count: monthlyExpenses?.length || 0,
            data_size_mb: parseFloat(estimatedDataSize.toFixed(2)),
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

  const extendTrial = async (tenantId: string) => {
    try {
      setActionLoading(tenantId);

      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 14);

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
        description: 'תקופת הניסיון הוארכה ב-14 ימים',
      });

      await loadTenants();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהארכת תקופת הניסיון',
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
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            חזור
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">ניהול משפחות</h1>
            <p className="text-muted-foreground">נהל את כל המשפחות במערכת</p>
          </div>
          <Button
            onClick={loadTenants}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
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
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">סה"כ משפחות</span>
              </div>
              <div className="text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">פעילות</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {tenants.filter(t => t.subscription_status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">ניסיון</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {tenants.filter(t => t.subscription_status === 'trial').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">פג תוקף</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {tenants.filter(t => t.subscription_status === 'expired').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle>רשימת משפחות ({filteredTenants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-4">שם המשפחה</th>
                    <th className="text-right p-4">בעלים</th>
                    <th className="text-right p-4">סטטוס</th>
                    <th className="text-right p-4">מחיר חודשי</th>
                    <th className="text-right p-4">חברים</th>
                    <th className="text-right p-4">כניסה אחרונה</th>
                    <th className="text-right p-4">פעילות חודשית</th>
                    <th className="text-right p-4">גודל נתונים</th>
                    <th className="text-right p-4">נרשם</th>
                    <th className="text-right p-4">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{tenant.name}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{tenant.owner_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {tenant.total_members} חברים במשפחה
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(tenant.subscription_status, tenant.trial_ends_at)}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">
                          {tenant.monthly_price > 0 ? `₪${tenant.monthly_price}` : 'חינם'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tenant.subscription_status === 'trial' ? 'תקופת ניסיון' : 
                           tenant.subscription_status === 'active' ? 'משלם' : 'לא פעיל'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="font-medium">{tenant.total_members}</span>
                        </div>
                      </td>
                      <td className="p-4">
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
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span className="font-medium">{tenant.monthly_expenses_count}</span>
                          <span className="text-xs text-muted-foreground">הוצאות</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          <span className="text-sm">{tenant.data_size_mb}MB</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {new Date(tenant.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="p-4">
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
                            {tenant.subscription_status === 'trial' && (
                              <DropdownMenuItem
                                onClick={() => extendTrial(tenant.id)}
                              >
                                הארך ניסיון (+14 ימים)
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

        {/* Delete Tenant Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
          setDeleteDialog({ open, tenant: null });
          setConfirmationInput('');
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">⚠️ מחיקת משפחה - פעולה בלתי הפיכה</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
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

        {/* View Details Dialog */}
        <AlertDialog open={viewDetailsDialog.open} onOpenChange={(open) => setViewDetailsDialog({ open, tenant: null })}>
          <AlertDialogContent className="max-w-4xl">
            <AlertDialogHeader>
              <AlertDialogTitle>פרטי משפחת {viewDetailsDialog.tenant?.name}</AlertDialogTitle>
            </AlertDialogHeader>
            
            {viewDetailsDialog.tenant && (
              <div className="space-y-6">
                {/* סטטיסטיקות כלליות */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{viewDetailsDialog.tenant.total_members}</div>
                    <div className="text-sm text-muted-foreground">חברים</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₪{viewDetailsDialog.tenant.monthly_price}</div>
                    <div className="text-sm text-muted-foreground">מחיר חודשי</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{viewDetailsDialog.tenant.monthly_expenses_count}</div>
                    <div className="text-sm text-muted-foreground">הוצאות חודש זה</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{viewDetailsDialog.tenant.data_size_mb}MB</div>
                    <div className="text-sm text-muted-foreground">גודל נתונים</div>
                  </div>
                </div>

                {/* רשימת חברים */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">חברי המשפחה</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAddMemberDialog({ open: true, tenant: viewDetailsDialog.tenant });
                        setNewMemberEmail('');
                        setNewMemberRole('member');
                      }}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      הוסף חבר
                    </Button>
                  </div>
                  <div className="border rounded-lg">
                    <table className="w-full">
                       <thead>
                         <tr className="border-b bg-muted/50">
                           <th className="text-right p-3">שם</th>
                           <th className="text-right p-3">תפקיד</th>
                           <th className="text-right p-3">כניסה אחרונה</th>
                           <th className="text-right p-3">הצטרף</th>
                           <th className="text-right p-3">פעולות</th>
                         </tr>
                       </thead>
                      <tbody>
                        {viewDetailsDialog.tenant.member_details.map((member, index) => (
                          <tr key={index} className="border-b last:border-b-0">
                            <td className="p-3">
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </td>
                            <td className="p-3">
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                {member.role === 'admin' ? 'מנהל' : 'חבר'}
                              </Badge>
                            </td>
                            <td className="p-3">
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
                             <td className="p-3">
                               {new Date(member.joined_at).toLocaleDateString('he-IL')}
                             </td>
                             <td className="p-3">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="text-destructive hover:text-destructive"
                                 disabled={actionLoading === `${viewDetailsDialog.tenant.id}-${member.user_id}`}
                                 onClick={() => {
                                   setDeleteMemberDialog({ 
                                     open: true, 
                                     tenant: viewDetailsDialog.tenant, 
                                     member: member
                                   });
                                 }}
                               >
                                 <UserMinus className="h-4 w-4" />
                               </Button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* מידע נוסף */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">מידע כללי</h4>
                    <div className="space-y-2 text-sm">
                      <div>תאריך הקמה: {new Date(viewDetailsDialog.tenant.created_at).toLocaleDateString('he-IL')}</div>
                      <div>סטטוס: {getStatusBadge(viewDetailsDialog.tenant.subscription_status, viewDetailsDialog.tenant.trial_ends_at)}</div>
                      {viewDetailsDialog.tenant.trial_ends_at && (
                        <div>תוקף ניסיון: {getTrialStatus(viewDetailsDialog.tenant.trial_ends_at)}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">פעילות</h4>
                    <div className="space-y-2 text-sm">
                      <div>סה"כ הוצאות: {viewDetailsDialog.tenant.total_expenses}</div>
                      <div>הוצאות חודש זה: {viewDetailsDialog.tenant.monthly_expenses_count}</div>
                      {viewDetailsDialog.tenant.last_activity && (
                        <div>פעילות אחרונה: {new Date(viewDetailsDialog.tenant.last_activity).toLocaleDateString('he-IL')}</div>
                      )}
                    </div>
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