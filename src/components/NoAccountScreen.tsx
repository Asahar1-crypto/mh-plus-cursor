import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus, Mail, ArrowRight, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import PendingInvitationAlert from '@/components/invitation/PendingInvitationAlert';

const NoAccountScreen = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingInvitations, setIsCheckingInvitations] = useState(false);
  const [accountName, setAccountName] = useState(`משפחת ${user?.name || 'המשתמש'}`);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAndRefresh = useCallback(async () => {
    if (!user) return;
    setIsCheckingInvitations(true);
    try {
      await refreshProfile();
      // After refreshProfile, if user now has an account_id the parent component
      // will re-render and stop showing NoAccountScreen. As a fallback, reload.
      window.location.reload();
    } catch (error) {
      console.error('Error checking invitations:', error);
    } finally {
      setIsCheckingInvitations(false);
    }
  }, [user, refreshProfile]);

  // Auto-check every 10 seconds for accepted invitations
  useEffect(() => {
    if (!user) return;

    intervalRef.current = setInterval(async () => {
      try {
        await refreshProfile();
      } catch (error) {
        console.error('Auto-check invitations error:', error);
      }
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, refreshProfile]);

  const createNewFamily = async () => {
    if (!user || !accountName.trim()) return;

    try {
      setIsCreating(true);
      
      // יצירת חשבון חדש
      const { data, error } = await supabase.rpc(
        'create_account_with_admin',
        { 
          account_name: accountName.trim(),
          admin_user_id: user.id
        }
      );

      if (error) throw error;

      toast({
        title: 'הצלחה! 🎉',
        description: `המשפחה "${accountName}" נוצרה בהצלחה`,
      });

      // רענון נתוני המשתמש ומעבר לדשבורד
      await refreshProfile();
      
      // Navigate to dashboard after successful family creation
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Error creating family:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה ביצירת המשפחה החדשה',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      toast({
        title: 'התנתקת בהצלחה',
        description: 'להתראות!',
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהתנתקות',
        variant: 'destructive'
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="max-w-2xl w-full space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 sm:p-4 bg-primary/10 rounded-full">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold">ברוך הבא, {user?.name}!</h1>
          <p className="text-muted-foreground text-sm sm:text-lg px-2">
            נראה שאתה לא משויך כרגע לאף משפחה במערכת
          </p>
        </div>


        {/* Pending invitation check */}
        <PendingInvitationAlert />

        {/* Options */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Create new family */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-700">צור משפחה חדשה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                התחל מחדש עם משפחה חדשה שלך
              </p>
              
              <div className="space-y-3">
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="שם המשפחה החדשה"
                  className="text-center"
                />
                
                <Button 
                  onClick={createNewFamily}
                  disabled={isCreating || !accountName.trim()}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent ml-2" />
                      יוצר משפחה...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 ml-2" />
                      צור משפחה חדשה
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Request to join */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-blue-700">הצטרף למשפחה קיימת</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                בקש ממנהל משפחה אחרת להזמין אותך
              </p>
              
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-800 text-sm sm:text-base">איך זה עובד?</h4>
                <ol className="text-xs sm:text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>פנה למנהל המשפחה הרצויה</li>
                  <li>בקש ממנו לשלוח לך הזמנה לכתובת:</li>
                  <li className="font-mono bg-white px-2 py-1 rounded text-[10px] sm:text-xs break-all">
                    {user?.email}
                  </li>
                  <li>קבל את ההזמנה והתחבר שוב</li>
                </ol>
              </div>
              
              <Button
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={checkAndRefresh}
                disabled={isCheckingInvitations}
              >
                {isCheckingInvitations ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent ml-2" />
                    בודק הזמנות...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 ml-2" />
                    בדוק הזמנות
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logout button */}
        <div className="text-center space-y-3">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-muted-foreground hover:text-foreground"
          >
            {isLoggingOut ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ml-2" />
                מתנתק...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 ml-2" />
                התנתק והתחבר עם משתמש אחר
              </>
            )}
          </Button>
          <div className="text-sm text-muted-foreground">
            זקוק לעזרה? צור קשר עם מנהל המערכת
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAccountScreen;