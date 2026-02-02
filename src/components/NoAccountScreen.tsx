import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus, Mail, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const NoAccountScreen = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accountName, setAccountName] = useState(`משפחת ${user?.name || 'המשתמש'}`);

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

      // רענון נתוני המשתמש
      await refreshProfile();
      
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
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Users className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">ברוך הבא, {user?.name}!</h1>
          <p className="text-muted-foreground text-lg">
            נראה שאתה לא משויך כרגע לאף משפחה במערכת
          </p>
        </div>


        {/* Options */}
        <div className="grid gap-6 md:grid-cols-2">
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
              
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-800">איך זה עובד?</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>פנה למנהל המשפחה הרצויה</li>
                  <li>בקש ממנו לשלוח לך הזמנה לכתובת:</li>
                  <li className="font-mono bg-white px-2 py-1 rounded text-xs break-all">
                    {user?.email}
                  </li>
                  <li>קבל את ההזמנה והתחבר שוב</li>
                </ol>
              </div>
              
              <Button variant="outline" className="w-full" disabled>
                <Mail className="h-4 w-4 ml-2" />
                המתן להזמנה
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