import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
}

interface EmailChangeFormProps {
  className?: string;
  onEmailChanged?: () => void;
}

const EmailChangeForm: React.FC<EmailChangeFormProps> = ({ className, onEmailChanged }) => {
  const { toast } = useToast();
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);

  // חיפוש משתמש לפי מייל
  const handleSearchUser = async () => {
    if (!oldEmail.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן כתובת מייל לחיפוש',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSearchLoading(true);
      
      // קריאה ל-Edge Function לקבלת רשימת כל המשתמשים
      const { data: usersData, error } = await supabase.functions.invoke('get-user-emails');
      
      if (error) throw error;

      // חיפוש המשתמש לפי מייל
      const userEmails = usersData?.userEmails || {};
      const foundUserId = Object.keys(userEmails).find(
        id => userEmails[id].toLowerCase() === oldEmail.toLowerCase()
      );

      if (foundUserId) {
        setFoundUser({
          id: foundUserId,
          email: userEmails[foundUserId]
        });
        setUserId(foundUserId);
        toast({
          title: 'משתמש נמצא',
          description: `נמצא משתמש עם המייל ${userEmails[foundUserId]}`
        });
      } else {
        setFoundUser(null);
        setUserId('');
        toast({
          title: 'משתמש לא נמצא',
          description: 'לא נמצא משתמש עם כתובת מייל זו',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error searching user:', error);
      toast({
        title: 'שגיאה בחיפוש',
        description: error.message || 'שגיאה בחיפוש משתמש',
        variant: 'destructive'
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!userId || !oldEmail || !newEmail) {
      toast({
        title: 'שגיאה',
        description: 'אנא מלא את כל השדות',
        variant: 'destructive'
      });
      return;
    }

    // בדיקת פורמט מייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'שגיאה',
        description: 'פורמט המייל החדש אינו תקין',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // קריאה ל-Edge Function לשינוי המייל
      const { data, error } = await supabase.functions.invoke('change-user-email', {
        body: {
          userId,
          oldEmail,
          newEmail
        }
      });

      if (error) throw error;

      toast({
        title: 'המייל שונה בהצלחה',
        description: `המייל שונה מ-${oldEmail} ל-${newEmail}`,
      });

      // איפוס הטופס
      setOldEmail('');
      setNewEmail('');
      setUserId('');
      setFoundUser(null);

      // קריאה ל-callback אם קיים
      if (onEmailChanged) {
        onEmailChanged();
      }
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast({
        title: 'שגיאה בשינוי מייל',
        description: error.message || 'שגיאה בשינוי כתובת המייל',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          שינוי כתובת מייל למשתמש
        </CardTitle>
        <CardDescription>
          שנה את כתובת המייל של משתמש קיים במערכת. פעולה זו דורשת הרשאות סופר אדמין.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* שדה מייל ישן + כפתור חיפוש */}
        <div className="space-y-2">
          <Label htmlFor="oldEmail">כתובת מייל נוכחית</Label>
          <div className="flex gap-2">
            <Input
              id="oldEmail"
              type="email"
              placeholder="user@example.com"
              value={oldEmail}
              onChange={(e) => setOldEmail(e.target.value)}
              disabled={loading}
              dir="ltr"
              className="text-left"
            />
            <Button
              onClick={handleSearchUser}
              disabled={loading || searchLoading || !oldEmail.trim()}
              variant="outline"
            >
              {searchLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  מחפש...
                </>
              ) : (
                'חפש משתמש'
              )}
            </Button>
          </div>
        </div>

        {/* הצגת משתמש שנמצא */}
        {foundUser && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">משתמש נמצא:</p>
                <p className="text-sm">מייל: {foundUser.email}</p>
                <p className="text-sm font-mono text-muted-foreground">ID: {foundUser.id}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* שדה מייל חדש */}
        <div className="space-y-2">
          <Label htmlFor="newEmail">כתובת מייל חדשה</Label>
          <Input
            id="newEmail"
            type="email"
            placeholder="newuser@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={loading || !foundUser}
            dir="ltr"
            className="text-left"
          />
        </div>

        {/* אזהרה */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">שים לב:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>המייל החדש לא יכול להיות קיים במערכת</li>
              <li>המשתמש יצטרך להתחבר עם המייל החדש</li>
              <li>פעולה זו תירשם ב-audit log</li>
              <li>המשתמש יקבל הודעת מייל על השינוי</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* כפתור שינוי */}
        <Button
          onClick={handleChangeEmail}
          disabled={loading || !foundUser || !newEmail.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              משנה מייל...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 ml-2" />
              שנה כתובת מייל
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailChangeForm;
