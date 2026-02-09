import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Users, UserPlus, Settings, BarChart3, Mail, Calendar, Crown, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface AccountMember {
  user_id: string;
  user_name: string;
  role: 'admin' | 'member';
  joined_at: string;
  email?: string;
}

interface Account {
  id: string;
  name: string;
  owner_id: string;
  subscription_status: string;
  trial_ends_at: string;
  created_at: string;
}

interface AccountStats {
  totalMembers: number;
  totalExpenses: number;
  monthlyExpenses: number;
  pendingInvitations: number;
}

const AccountManagement = () => {
  const { user, account, userAccounts, profile } = useAuth();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [stats, setStats] = useState<AccountStats>({
    totalMembers: 0,
    totalExpenses: 0,
    monthlyExpenses: 0,
    pendingInvitations: 0
  });
  const [loading, setLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    if (account?.id) {
      loadAccountData();
    }
  }, [account?.id]);

  const loadAccountData = async () => {
    if (!account?.id) return;

    try {
      setLoading(true);

      // טען פרטי החשבון
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', account.id)
        .single();

      if (accountError) throw accountError;
      setCurrentAccount(accountData);
      setAccountName(accountData.name);

      // טען חברי החשבון
      const { data: membersData, error: membersError } = await supabase
        .rpc('get_account_members_with_details', { account_uuid: account.id });

      if (membersError) {
        console.error('Error loading members:', membersError);
      } else {
        setMembers(membersData || []);
      }

      // טען סטטיסטיקות
      await loadStats();

    } catch (error) {
      console.error('Error loading account data:', error);
      toast.error('שגיאה בטעינת נתוני החשבון');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!account?.id) return;

    try {
      // ספור הוצאות
      const { count: expensesCount } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id);

      // הוצאות החודש הנוכחי
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: monthlyExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('account_id', account.id)
        .gte('date', `${currentMonth}-01`)
        .lt('date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);

      const monthlyTotal = monthlyExpensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

      // הזמנות ממתינות
      const { count: pendingInvitations } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      setStats({
        totalMembers: members.length,
        totalExpenses: expensesCount || 0,
        monthlyExpenses: monthlyTotal,
        pendingInvitations: pendingInvitations || 0
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateAccountName = async () => {
    if (!account?.id || !accountName.trim()) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ name: accountName.trim() })
        .eq('id', account.id);

      if (error) throw error;

      toast.success('שם החשבון עודכן בהצלחה');
      setCurrentAccount(prev => prev ? { ...prev, name: accountName.trim() } : null);

    } catch (error) {
      console.error('Error updating account name:', error);
      toast.error('שגיאה בעדכון שם החשבון');
    }
  };

  const inviteMember = async () => {
    if (!account?.id || !newMemberEmail.trim()) {
      toast.error('אנא הזן כתובת אימייל');
      return;
    }

    try {
      // קרא לפונקציה לשליחת הזמנה (נניח שיש לנו edge function)
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: newMemberEmail.trim(),
          accountId: account.id
        }
      });

      if (error) throw error;

      toast.success('ההזמנה נשלחה בהצלחה');
      setNewMemberEmail('');
      loadStats(); // רענן סטטיסטיקות

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('שגיאה בשליחת ההזמנה');
    }
  };

  const updateMemberRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!account?.id) return;

    try {
      const { error } = await supabase
        .rpc('add_account_member', {
          account_uuid: account.id,
          user_uuid: userId,
          member_role: newRole
        });

      if (error) throw error;

      toast.success('הרשאות המשתמש עודכנו בהצלחה');
      loadAccountData(); // רענן נתונים

    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('שגיאה בעדכון הרשאות המשתמש');
    }
  };

  const removeMember = async (userId: string) => {
    if (!account?.id) return;

    try {
      const { error } = await supabase
        .rpc('remove_account_member', {
          account_uuid: account.id,
          user_uuid: userId
        });

      if (error) throw error;

      toast.success('המשתמש הוסר מהחשבון בהצלחה');
      loadAccountData(); // רענן נתונים

    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('שגיאה בהסרת המשתמש');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">לא נמצא חשבון פעיל</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* כותרת */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">ניהול חשבון</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">נהל את החשבון שלך ואת החברים בו</p>
        </div>
        <Badge variant={currentAccount.subscription_status === 'active' ? 'default' : 'secondary'} className="w-fit">
          {currentAccount.subscription_status === 'active' ? 'מנוי פעיל' : 'תקופת ניסיון'}
        </Badge>
      </div>

      {/* סטטיסטיקות */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">חברי החשבון</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">סך הוצאות</CardTitle>
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalExpenses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">הוצאות החודש</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">₪{stats.monthlyExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">הזמנות ממתינות</CardTitle>
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.pendingInvitations}</div>
          </CardContent>
        </Card>
      </div>

      {/* תוכן עיקרי */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="members" className="text-xs sm:text-sm flex-1 sm:flex-none">חברי החשבון</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm flex-1 sm:flex-none">הגדרות החשבון</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm flex-1 sm:flex-none">דוחות</TabsTrigger>
        </TabsList>

        {/* חברי החשבון */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                הזמן חבר חדש
              </CardTitle>
              <CardDescription>
                הזמן משתמש חדש להצטרף לחשבון שלך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Input
                  type="email"
                  placeholder="כתובת אימייל"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={inviteMember} className="w-full sm:w-auto">שלח הזמנה</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>חברי החשבון הנוכחיים</CardTitle>
              <CardDescription>
                נהל את החברים והרשאותיהם בחשבון
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user_name}`} />
                        <AvatarFallback className="text-xs sm:text-sm">{member.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm sm:text-base">{member.user_name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          הצטרף ב-{new Date(member.joined_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {member.role === 'admin' ? (
                          <>
                            <Crown className="h-3 w-3 mr-1" />
                            מנהל
                          </>
                        ) : (
                          'חבר'
                        )}
                      </Badge>
                      {member.user_id !== user?.id && (
                        <div className="flex gap-1">
                          <Select 
                            value={member.role} 
                            onValueChange={(value: 'admin' | 'member') => updateMemberRole(member.user_id, value)}
                          >
                            <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">חבר</SelectItem>
                              <SelectItem value="admin">מנהל</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="text-xs sm:text-sm"
                            onClick={() => removeMember(member.user_id)}
                          >
                            הסר
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* הגדרות החשבון */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                הגדרות בסיסיות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountName" className="text-sm">שם החשבון</Label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={updateAccountName} disabled={accountName === currentAccount.name} className="w-full sm:w-auto">
                    עדכן
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>מזהה חשבון</Label>
                <Input value={currentAccount.id} disabled />
              </div>

              <div className="space-y-2">
                <Label>תאריך יצירה</Label>
                <Input 
                  value={new Date(currentAccount.created_at).toLocaleDateString('he-IL')} 
                  disabled 
                />
              </div>

              <div className="space-y-2">
                <Label>סטטוס מנוי</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={currentAccount.subscription_status === 'active' ? 'default' : 'secondary'}>
                    {currentAccount.subscription_status === 'active' ? 'מנוי פעיל' : 'תקופת ניסיון'}
                  </Badge>
                  {currentAccount.trial_ends_at && (
                    <span className="text-sm text-muted-foreground">
                      עד {new Date(currentAccount.trial_ends_at).toLocaleDateString('he-IL')}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* דוחות */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                דוחות וסטטיסטיקות
              </CardTitle>
              <CardDescription>
                צפה בדוחות מתקדמים על השימוש בחשבון
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>דוחות מתקדמים יהיו זמינים בקרוב</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountManagement;