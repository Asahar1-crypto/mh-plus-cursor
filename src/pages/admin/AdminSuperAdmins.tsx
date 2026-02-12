import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Crown, Shield, UserPlus, Trash2, RefreshCw, Search, AlertCircle, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
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

interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  last_login: string | null;
  created_at: string;
  accounts_count: number;
}

const AdminSuperAdmins: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; email: string; is_super_admin: boolean } | null>(null);
  const [searching, setSearching] = useState(false);
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; admin: SuperAdmin | null }>({
    open: false,
    admin: null
  });

  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  const loadSuperAdmins = async () => {
    try {
      setLoading(true);

      // Get all super admin profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, last_login, created_at')
        .eq('is_super_admin', true)
        .order('created_at');

      if (error) throw error;

      // Get emails via edge function
      let emailMap: Record<string, string> = {};
      try {
        const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });
        if (emailData?.success) {
          emailMap = emailData.userEmails;
        }
      } catch {
        // Could not fetch user emails - continue without
      }

      // Get account counts for each super admin
      const adminsWithDetails: SuperAdmin[] = await Promise.all(
        (profiles || []).map(async (p) => {
          const { count } = await supabase
            .from('account_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.id);

          return {
            id: p.id,
            name: p.name || 'ללא שם',
            email: emailMap[p.id] || 'לא ידוע',
            last_login: p.last_login,
            created_at: p.created_at,
            accounts_count: count || 0,
          };
        })
      );

      setSuperAdmins(adminsWithDetails);
    } catch (error) {
      console.error('Error loading super admins:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת רשימת הסופר אדמינים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    setSearchResult(null);

    try {
      // Search by email using edge function
      const { data, error } = await supabase.functions.invoke('get-user-emails', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        const emails: Record<string, string> = data.userEmails;
        const foundEntry = Object.entries(emails).find(
          ([, email]) => (email as string).toLowerCase() === searchEmail.trim().toLowerCase()
        );

        if (foundEntry) {
          const [userId, email] = foundEntry;
          // Get profile info
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, is_super_admin')
            .eq('id', userId)
            .single();

          setSearchResult({
            id: userId,
            name: profileData?.name || 'ללא שם',
            email: email as string,
            is_super_admin: profileData?.is_super_admin || false,
          });
        } else {
          toast({
            title: 'לא נמצא',
            description: 'לא נמצא משתמש עם כתובת אימייל זו',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error searching user:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בחיפוש המשתמש',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const grantSuperAdmin = async (userId: string) => {
    try {
      setActionLoading(`grant-${userId}`);

      const { error } = await supabase
        .from('profiles')
        .update({ is_super_admin: true })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הרשאות סופר אדמין הוענקו בהצלחה',
      });

      setSearchResult(null);
      setSearchEmail('');
      await loadSuperAdmins();
    } catch (error) {
      console.error('Error granting super admin:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהענקת הרשאות סופר אדמין',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const revokeSuperAdmin = async (userId: string) => {
    try {
      setActionLoading(`revoke-${userId}`);

      // Don't allow revoking yourself
      if (userId === user?.id) {
        toast({
          title: 'שגיאה',
          description: 'לא ניתן להסיר את הרשאות הסופר אדמין של עצמך',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_super_admin: false })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הרשאות סופר אדמין הוסרו',
      });

      setRemoveDialog({ open: false, admin: null });
      await loadSuperAdmins();
    } catch (error) {
      console.error('Error revoking super admin:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהסרת הרשאות סופר אדמין',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען רשימת סופר אדמינים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">חזור</span>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">ניהול סופר אדמינים</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">הענק או הסר הרשאות מנהל מערכת</p>
              </div>
            </div>
          </div>
          <Button onClick={loadSuperAdmins} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">רענן</span>
          </Button>
        </div>

        {/* Add Super Admin */}
        <Card className="animate-fade-in [animation-delay:200ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              הוסף סופר אדמין חדש
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              חפש משתמש לפי כתובת אימייל והענק לו הרשאות מנהל מערכת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value);
                    setSearchResult(null);
                  }}
                  placeholder="הכנס כתובת אימייל של המשתמש"
                  className="pr-10"
                  dir="ltr"
                  onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                />
              </div>
              <Button onClick={searchUser} disabled={searching || !searchEmail.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'חפש'}
              </Button>
            </div>

            {searchResult && (
              <div className={`p-4 rounded-lg border ${
                searchResult.is_super_admin 
                  ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' 
                  : 'bg-muted/50 border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      searchResult.is_super_admin ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {searchResult.is_super_admin ? <Crown className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm sm:text-base">{searchResult.name}</div>
                      <div className="text-xs text-muted-foreground">{searchResult.email}</div>
                    </div>
                  </div>
                  {searchResult.is_super_admin ? (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                      <Crown className="h-3 w-3 ml-1" />
                      כבר סופר אדמין
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => grantSuperAdmin(searchResult.id)}
                      disabled={actionLoading === `grant-${searchResult.id}`}
                      className="gap-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      {actionLoading === `grant-${searchResult.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Crown className="h-4 w-4" />
                          הענק הרשאות
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Super Admins List */}
        <Card className="animate-fade-in [animation-delay:400ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              סופר אדמינים פעילים ({superAdmins.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              משתמשים עם גישה מלאה לניהול המערכת
            </CardDescription>
          </CardHeader>
          <CardContent>
            {superAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Crown className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>לא נמצאו סופר אדמינים</p>
              </div>
            ) : (
              <div className="space-y-3">
                {superAdmins.map((admin) => {
                  const isCurrentUser = admin.id === user?.id;
                  return (
                    <div
                      key={admin.id}
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${
                        isCurrentUser 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          isCurrentUser ? 'bg-primary/10 text-primary' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          <Crown className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm sm:text-base truncate">{admin.name}</span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">את/ה</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{admin.email}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{admin.accounts_count} חשבונות</span>
                            <span>
                              כניסה אחרונה: {admin.last_login 
                                ? new Date(admin.last_login).toLocaleDateString('he-IL')
                                : 'מעולם לא'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => setRemoveDialog({ open: true, admin })}
                          disabled={actionLoading === `revoke-${admin.id}`}
                        >
                          {actionLoading === `revoke-${admin.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50 animate-fade-in [animation-delay:600ms]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">מידע על סופר אדמינים</p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-400 text-xs">
                  <li>• סופר אדמין יכול לגשת לכל דפי הניהול ולראות נתונים של כל המשפחות</li>
                  <li>• סופר אדמין יכול לנהל מנויים, קופונים, ומשתמשים</li>
                  <li>• לא ניתן להסיר את ההרשאות של עצמך (למניעת נעילה)</li>
                  <li>• מומלץ לשמור מינימום 2 סופר אדמינים למקרה חירום</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remove Super Admin Dialog */}
        <AlertDialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ open, admin: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                הסרת הרשאות סופר אדמין
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    האם אתה בטוח שברצונך להסיר את הרשאות הסופר אדמין של{' '}
                    <strong>{removeDialog.admin?.name}</strong> ({removeDialog.admin?.email})?
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
                    <strong>שים לב:</strong> המשתמש יאבד גישה לכל דפי הניהול ולנתוני המערכת.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  if (removeDialog.admin) {
                    revokeSuperAdmin(removeDialog.admin.id);
                  }
                }}
                disabled={actionLoading === `revoke-${removeDialog.admin?.id}`}
              >
                {actionLoading === `revoke-${removeDialog.admin?.id}` ? 'מסיר...' : 'הסר הרשאות'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminSuperAdmins;
