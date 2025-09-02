import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Mail, Trash2, Clock, UserX, RefreshCw } from 'lucide-react';
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

const AdminUnverifiedUsers: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [unverifiedUsers, setUnverifiedUsers] = useState<UnverifiedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadUnverifiedUsers();
  }, []);

  const loadUnverifiedUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_unverified_users');

      if (error) throw error;

      setUnverifiedUsers(data || []);
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

  const deleteUnverifiedUser = async (userId: string, email: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${email}?`)) {
      return;
    }

    try {
      // Call the edge function to delete user
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: 'נמחק בהצלחה',
        description: `המשתמש ${email} נמחק מהמערכת`,
      });

      // Refresh the list
      loadUnverifiedUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה במחיקת המשתמש',
        variant: 'destructive'
      });
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען משתמשים לא מאומתים...</p>
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
            <h1 className="text-3xl font-bold">משתמשים לא מאומתים</h1>
            <p className="text-muted-foreground">
              ניהול משתמשים שעדיין לא אימתו את כתובת האימייל שלהם
            </p>
          </div>
          <Button
            onClick={loadUnverifiedUsers}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן נתונים
          </Button>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ משתמשים לא מאומתים</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unverifiedUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              משתמשים שעדיין לא השלימו אימות אימייל
            </p>
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
            {unverifiedUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">אין משתמשים לא מאומתים</h3>
                <p className="text-muted-foreground">
                  כל המשתמשים במערכת אימתו את כתובת האימייל שלהם
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
                    {unverifiedUsers.map((user) => (
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
                              onClick={() => deleteUnverifiedUser(user.id, user.email)}
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

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>הוראות שימוש</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  שליחת אימות מחדש
                </h4>
                <p className="text-sm text-muted-foreground">
                  שלח מחדש אימייל אימות למשתמש שעדיין לא אימת את החשבון שלו
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  מחיקת משתמש
                </h4>
                <p className="text-sm text-muted-foreground">
                  מחק משתמש שלא השלים את תהליך האימות (פעולה בלתי הפיכה)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>הערה:</strong> משתמשים שלא מאמתים את האימייל שלהם לא יוכלו להתחבר למערכת.
                מומלץ לשלוח אימות מחדש לפני מחיקת המשתמש.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUnverifiedUsers;