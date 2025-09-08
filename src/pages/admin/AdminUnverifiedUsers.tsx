import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Mail, Trash2, Clock, UserX, RefreshCw, Users, ShieldAlert, UserCog, Edit3 } from 'lucide-react';
import EmailChangeHistory from '@/components/admin/EmailChangeHistory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface UnverifiedUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  raw_user_meta_data: any;
}

interface OrphanedUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string;
  last_sign_in_at: string | null;
  raw_user_meta_data: any;
  has_profile: boolean;
  profile_name: string | null;
}

interface UserStats {
  total: number;
  lastDay: number;
  lastWeek: number;
  lastMonth: number;
}

interface OrphanedStats {
  total: number;
  withProfiles: number;
  withoutProfiles: number;
}

const AdminUnverifiedUsers: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [unverifiedUsers, setUnverifiedUsers] = useState<UnverifiedUser[]>([]);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UnverifiedUser[]>([]);
  const [filteredOrphaned, setFilteredOrphaned] = useState<OrphanedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({ total: 0, lastDay: 0, lastWeek: 0, lastMonth: 0 });
  const [orphanedStats, setOrphanedStats] = useState<OrphanedStats>({ total: 0, withProfiles: 0, withoutProfiles: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [activeTab, setActiveTab] = useState('unverified');
  
  // States for email change functionality
  const [emailChangeUser, setEmailChangeUser] = useState({ id: '', currentEmail: '', newEmail: '', confirmEmail: '' });
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadUnverifiedUsers();
    loadOrphanedUsers();
    loadAllUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    filterOrphanedUsers();
  }, [unverifiedUsers, orphanedUsers, searchTerm, timeFilter]);

  const calculateStats = (users: UnverifiedUser[]): UserStats => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: users.length,
      lastDay: users.filter(u => new Date(u.created_at) > dayAgo).length,
      lastWeek: users.filter(u => new Date(u.created_at) > weekAgo).length,
      lastMonth: users.filter(u => new Date(u.created_at) > monthAgo).length,
    };
  };

  const calculateOrphanedStats = (users: OrphanedUser[]): OrphanedStats => ({
    total: users.length,
    withProfiles: users.filter(u => u.has_profile).length,
    withoutProfiles: users.filter(u => !u.has_profile).length,
  });

  const filterUsers = () => {
    let filtered = unverifiedUsers;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.raw_user_meta_data?.name && user.raw_user_meta_data.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    const now = new Date();
    if (timeFilter === 'day') {
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(user => new Date(user.created_at) > dayAgo);
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(user => new Date(user.created_at) > weekAgo);
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(user => new Date(user.created_at) > monthAgo);
    }

    setFilteredUsers(filtered);
  };

  const filterOrphanedUsers = () => {
    let filtered = orphanedUsers;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.profile_name && user.profile_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    const now = new Date();
    if (timeFilter === 'day') {
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(user => new Date(user.created_at) > dayAgo);
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(user => new Date(user.created_at) > weekAgo);
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(user => new Date(user.created_at) > monthAgo);
    }

    setFilteredOrphaned(filtered);
  };

  const loadUnverifiedUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_unverified_users');

      if (error) throw error;

      setUnverifiedUsers(data || []);
      setStats(calculateStats(data || []));
    } catch (error) {
      console.error('Error loading unverified users:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת משתמשים לא מאומתים',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrphanedUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_orphaned_verified_users');

      if (error) throw error;

      setOrphanedUsers(data || []);
      setOrphanedStats(calculateOrphanedStats(data || []));
    } catch (error) {
      console.error('Error loading orphaned users:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת משתמשים מאומתים ללא חשבון',
        variant: 'destructive'
      });
    }
  };

  const loadAllUsers = async () => {
    try {
      // טוען משתמשים מאומתים עם פרופילים
      const { data: verifiedUsers, error: verifiedError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          created_at,
          updated_at,
          phone_number,
          is_super_admin
        `);

      if (verifiedError) throw verifiedError;

      // מוסיף אימיילים מטבלת auth.users (דרך edge function)
      const { data: usersEmails, error: emailError } = await supabase.functions.invoke('get-user-emails');
      
      if (emailError) {
        console.error('Could not fetch user emails:', emailError);
        // ממשיכים בלי האימיילים אם יש שגיאה
      }

      const userEmailMap = usersEmails?.userEmails || {};
      
      const allUsersWithEmails = verifiedUsers?.map(user => ({
        ...user,
        email: userEmailMap[user.id] || 'לא נמצא'
      })) || [];

      setAllUsers(allUsersWithEmails);
    } catch (error) {
      console.error('Error loading all users:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת רשימת המשתמשים',
        variant: 'destructive'
      });
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (error) throw error;

      toast({
        title: 'נשלח בהצלחה',
        description: `אימייל אימות נשלח מחדש ל-${email}`,
      });
    } catch (error) {
      console.error('Error resending verification email:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשליחת אימייל האימות',
        variant: 'destructive'
      });
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${email}?`)) {
      return;
    }

    try {
      console.log('Deleting user:', { userId, email });
      
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });

      if (error) {
        console.error('Delete user error:', error);
        throw error;
      }

      console.log('Delete user response:', data);

      toast({
        title: 'נמחק בהצלחה',
        description: `המשתמש ${email} נמחק מהמערכת`,
      });

      // רענן את שני הטאבים
      await loadUnverifiedUsers();
      await loadOrphanedUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'שגיאה',
        description: `שגיאה במחיקת המשתמש: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
        variant: 'destructive'
      });
    }
  };

  const deleteOldUsers = async (days: number, userType: 'unverified' | 'orphaned') => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const usersToDelete = userType === 'unverified' 
      ? unverifiedUsers.filter(user => new Date(user.created_at) < cutoffDate)
      : orphanedUsers.filter(user => new Date(user.created_at) < cutoffDate);

    if (usersToDelete.length === 0) {
      toast({
        title: 'אין משתמשים למחיקה',
        description: `לא נמצאו משתמשים ישנים מ-${days} ימים`,
      });
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${usersToDelete.length} משתמשים ישנים מ-${days} ימים?`)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToDelete) {
      try {
        const { error } = await supabase.functions.invoke('delete-user', {
          body: { user_id: user.id }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error deleting user ${user.email}:`, error);
        errorCount++;
      }
    }

    toast({
      title: 'סיים מחיקה',
      description: `נמחקו ${successCount} משתמשים בהצלחה${errorCount > 0 ? `, ${errorCount} שגיאות` : ''}`,
      variant: errorCount > 0 ? 'destructive' : 'default'
    });

    loadUnverifiedUsers();
    loadOrphanedUsers();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'לפני פחות משעה';
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  };

  const changeUserEmail = async () => {
    if (!emailChangeUser.newEmail || !emailChangeUser.confirmEmail) {
      toast({
        title: 'שגיאה',
        description: 'יש למלא את כל השדות',
        variant: 'destructive'
      });
      return;
    }

    if (emailChangeUser.newEmail !== emailChangeUser.confirmEmail) {
      toast({
        title: 'שגיאה',
        description: 'האימיילים החדשים אינם תואמים',
        variant: 'destructive'
      });
      return;
    }

    if (emailChangeUser.newEmail === emailChangeUser.currentEmail) {
      toast({
        title: 'שגיאה',
        description: 'האימייל החדש זהה לקיים',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך לשנות את האימייל מ-${emailChangeUser.currentEmail} ל-${emailChangeUser.newEmail}?`)) {
      return;
    }

    setEmailChangeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-user-email', {
        body: {
          userId: emailChangeUser.id,
          newEmail: emailChangeUser.newEmail,
          oldEmail: emailChangeUser.currentEmail
        }
      });

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: `האימייל שונה בהצלחה ל-${emailChangeUser.newEmail}`,
      });

      // איפוס הטופס
      setEmailChangeUser({ id: '', currentEmail: '', newEmail: '', confirmEmail: '' });
      
      // רענון הנתונים
      await loadAllUsers();
      await loadUnverifiedUsers();
      await loadOrphanedUsers();
    } catch (error) {
      console.error('Error changing email:', error);
      toast({
        title: 'שגיאה',
        description: `שגיאה בשינוי האימייל: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
        variant: 'destructive'
      });
    } finally {
      setEmailChangeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען נתוני משתמשים...</p>
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
            <h1 className="text-3xl font-bold">ניהול משתמשים בעייתיים</h1>
            <p className="text-muted-foreground">
              ניהול משתמשים לא מאומתים ומשתמשים מאומתים ללא חשבון
            </p>
          </div>
          <Button
            onClick={() => {
              loadUnverifiedUsers();
              loadOrphanedUsers();
            }}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן נתונים
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unverified" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              לא מאומתים ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="orphaned" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              מאומתים ללא חשבון ({orphanedStats.total})
            </TabsTrigger>
            <TabsTrigger value="email-change" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              שינוי מייל לקוח
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unverified" className="space-y-6">
            {/* Stats Cards for Unverified */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">סה"כ לא מאומתים</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">משתמשים שעדיין לא אימתו אימייל</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">השבוע</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.lastWeek}</div>
                  <p className="text-xs text-muted-foreground">נרשמו השבוע</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">היום</CardTitle>
                  <Clock className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.lastDay}</div>
                  <p className="text-xs text-muted-foreground">נרשמו היום</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">החודש</CardTitle>
                  <Clock className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.lastMonth}</div>
                  <p className="text-xs text-muted-foreground">נרשמו החודש</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions for Unverified */}
            <Card>
              <CardHeader>
                <CardTitle>סינון ופעולות - משתמשים לא מאומתים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="חפש לפי אימייל או שם..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">כל הזמנים</option>
                      <option value="day">היום</option>
                      <option value="week">השבוע</option>
                      <option value="month">החודש</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => deleteOldUsers(7, 'unverified')}
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    מחק ישנים מ-7 ימים
                  </Button>
                  <Button
                    onClick={() => deleteOldUsers(30, 'unverified')}
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    מחק ישנים מ-30 ימים
                  </Button>
                  <Button
                    onClick={() => deleteOldUsers(90, 'unverified')}
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    מחק ישנים מ-90 ימים
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Unverified Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  רשימת משתמשים לא מאומתים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm || timeFilter !== 'all' ? 'אין תוצאות' : 'אין משתמשים לא מאומתים'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || timeFilter !== 'all' 
                        ? 'נסה לשנות את החיפוש או הסינון'
                        : 'כל המשתמשים במערכת אימתו את כתובת האימייל שלהם'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>אימייל</TableHead>
                          <TableHead>שם</TableHead>
                          <TableHead>תאריך רישום</TableHead>
                          <TableHead>זמן שעבר</TableHead>
                          <TableHead>סטטוס</TableHead>
                          <TableHead>פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              {user.raw_user_meta_data?.name || 'לא צוין'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {getTimeAgo(user.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                לא מאומת
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resendVerificationEmail(user.email)}
                                  className="gap-1"
                                >
                                  <Mail className="h-3 w-3" />
                                  שלח אימות מחדש
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteUser(user.id, user.email)}
                                  className="gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  מחק
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orphaned" className="space-y-6">
            {/* Stats Cards for Orphaned */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">סה"כ ללא חשבון</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orphanedStats.total}</div>
                  <p className="text-xs text-muted-foreground">משתמשים מאומתים ללא חשבון</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">עם פרופיל</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orphanedStats.withProfiles}</div>
                  <p className="text-xs text-muted-foreground">יש להם פרופיל</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ללא פרופיל</CardTitle>
                  <UserX className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orphanedStats.withoutProfiles}</div>
                  <p className="text-xs text-muted-foreground">אין להם פרופיל</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions for Orphaned */}
            <Card>
              <CardHeader>
                <CardTitle>סינון ופעולות - משתמשים מאומתים ללא חשבון</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="חפש לפי אימייל או שם..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">כל הזמנים</option>
                      <option value="day">היום</option>
                      <option value="week">השבוע</option>
                      <option value="month">החודש</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => deleteOldUsers(7, 'orphaned')}
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    מחק ישנים מ-7 ימים
                  </Button>
                  <Button
                    onClick={() => deleteOldUsers(30, 'orphaned')}
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    מחק ישנים מ-30 ימים
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orphaned Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  רשימת משתמשים מאומתים ללא חשבון
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredOrphaned.length === 0 ? (
                  <div className="text-center py-8">
                    <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm || timeFilter !== 'all' ? 'אין תוצאות' : 'אין משתמשים מאומתים ללא חשבון'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || timeFilter !== 'all' 
                        ? 'נסה לשנות את החיפוש או הסינון'
                        : 'כל המשתמשים המאומתים שייכים לחשבון'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>אימייל</TableHead>
                          <TableHead>שם בפרופיל</TableHead>
                          <TableHead>תאריך אימות</TableHead>
                          <TableHead>זמן שעבר</TableHead>
                          <TableHead>סטטוס פרופיל</TableHead>
                          <TableHead>פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrphaned.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              {user.profile_name || user.raw_user_meta_data?.name || 'לא צוין'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.email_confirmed_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {getTimeAgo(user.email_confirmed_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.has_profile ? "default" : "secondary"} 
                                     className={user.has_profile ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                {user.has_profile ? 'יש פרופיל' : 'אין פרופיל'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteUser(user.id, user.email)}
                                className="gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                מחק משתמש
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-change" className="space-y-6">
            {/* Email Change Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  שינוי כתובת מייל לקוח
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  אפשרות לשנות כתובת מייל של לקוח תוך שמירה על כל הנתונים וההעדפות
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Select User */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">בחירת משתמש</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">בחר משתמש מהרשימה:</label>
                      <select
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={emailChangeUser.id}
                        onChange={(e) => {
                          const selectedUser = allUsers.find(u => u.id === e.target.value);
                          if (selectedUser) {
                            setEmailChangeUser({
                              id: selectedUser.id,
                              currentEmail: selectedUser.email,
                              newEmail: '',
                              confirmEmail: ''
                            });
                          } else {
                            setEmailChangeUser({ id: '', currentEmail: '', newEmail: '', confirmEmail: '' });
                          }
                        }}
                      >
                        <option value="">בחר משתמש...</option>
                        {allUsers
                          .filter(user => !user.is_super_admin) // מסנן סופר אדמינים
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>

                {/* Email Change Form */}
                {emailChangeUser.id && (
                  <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                    <h3 className="text-lg font-medium">פרטי שינוי המייל</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">מייל נוכחי:</label>
                        <input
                          type="email"
                          value={emailChangeUser.currentEmail}
                          disabled
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">מייל חדש: <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          value={emailChangeUser.newEmail}
                          onChange={(e) => setEmailChangeUser(prev => ({ ...prev, newEmail: e.target.value }))}
                          placeholder="הכנס מייל חדש..."
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">אישור מייל חדש: <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          value={emailChangeUser.confirmEmail}
                          onChange={(e) => setEmailChangeUser(prev => ({ ...prev, confirmEmail: e.target.value }))}
                          placeholder="הכנס שוב את המייל החדש..."
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Warnings */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div className="space-y-2">
                          <h4 className="font-medium text-orange-800">אזהרות חשובות:</h4>
                          <ul className="text-sm text-orange-700 space-y-1">
                            <li>• השינוי יתבצע מיידית ולא ניתן לביטול</li>
                            <li>• כל הנתונים, הגדרות וחברויות יישמרו</li>
                            <li>• המשתמש יקבל הודעה למייל החדש על השינוי</li>
                            <li>• וודא שהמייל החדש נכון ונגיש למשתמש</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={changeUserEmail}
                        disabled={emailChangeLoading || !emailChangeUser.newEmail || !emailChangeUser.confirmEmail}
                        className="gap-2"
                      >
                        {emailChangeLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            מעדכן מייל...
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4 w-4" />
                            שנה מייל
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => setEmailChangeUser({ id: '', currentEmail: '', newEmail: '', confirmEmail: '' })}
                        disabled={emailChangeLoading}
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-800">הוראות שימוש:</h4>
                      <ol className="text-sm text-blue-700 space-y-1">
                        <li>1. בחר משתמש מהרשימה (סופר אדמינים מוסתרים)</li>
                        <li>2. הכנס את כתובת המייל החדשה</li>
                        <li>3. אשר את כתובת המייל החדשה</li>
                        <li>4. לחץ על "שנה מייל" ואשר את הפעולה</li>
                        <li>5. המערכת תעדכן את המייל ותשלח הודעה אוטומטית</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Change History */}
            <EmailChangeHistory />
          </TabsContent>
        </Tabs>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>הסבר על הבעיות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <UserX className="h-4 w-4 text-orange-500" />
                  משתמשים לא מאומתים
                </h4>
                <p className="text-sm text-muted-foreground">
                  אנשים שהתחילו רישום אבל לא לחצו על לינק האימות באימייל. 
                  הם לא יכולים להתחבר למערכת עד שיאמתו.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  מאומתים ללא חשבון
                </h4>
                <p className="text-sm text-muted-foreground">
                  משתמשים שאימתו את האימייל אבל לא שויכו לאף חשבון משפחה. 
                  זה יכול לקרות בגלל בעיות ברישום או הזמנות שלא עבדו.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>המלצות:</strong> מחק משתמשים ישנים שלא פעילים כדי לנקות את המערכת. 
                לפני מחיקה של משתמשים מאומתים, וודא שהם באמת לא אמורים להיות במערכת.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUnverifiedUsers;