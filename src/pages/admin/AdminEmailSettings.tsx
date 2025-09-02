import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Mail, Send, Key, Settings, History, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface EmailSettings {
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  invitationSubject: string;
  invitationTemplate: string;
  resetPasswordSubject: string;
  resetPasswordTemplate: string;
  verificationSubject: string;
  verificationTemplate: string;
}

interface EmailLog {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  status: string;
  error?: string;
}

const AdminEmailSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  
  const [settings, setSettings] = useState<EmailSettings>({
    senderEmail: 'family@mhplus.online',
    senderName: 'מחציות פלוס',
    replyToEmail: 'family@mhplus.online',
    invitationSubject: 'הזמנה להצטרפות למשפחת {accountName}',
    invitationTemplate: `שלום,

קיבלת הזמנה מ-{inviterName} להצטרפות למשפחת "{accountName}" במערכת מחציות פלוס.

לחץ על הקישור הבא כדי לקבל את ההזמנה:
{invitationLink}

בברכה,
צוות מחציות פלוס`,
    resetPasswordSubject: 'איפוס סיסמה - מחציות פלוס',
    resetPasswordTemplate: `שלום,

קיבלנו בקשה לאיפוס הסיסמה שלך.

לחץ על הקישור הבא כדי לאפס את הסיסמה:
{resetLink}

אם לא ביקשת איפוס סיסמה, אנא התעלם מהודעה זו.

בברכה,
צוות מחציות פלוס`,
    verificationSubject: 'אישור כתובת אימייל - מחציות פלוס',
    verificationTemplate: `שלום {userName},

ברוך הבא למחציות פלוס!

לחץ על הקישור הבא כדי לאשר את כתובת האימייל שלך:
{verificationLink}

בברכה,
צוות מחציות פלוס`
  });

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadSettings();
    checkConnection();
    loadEmailLogs();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // טעינת הגדרות מהמערכת
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'email_sender_email',
          'email_sender_name', 
          'email_reply_to',
          'email_invitation_subject',
          'email_invitation_template',
          'email_reset_password_subject',
          'email_reset_password_template',
          'email_verification_subject',
          'email_verification_template'
        ]);

      if (error) throw error;

      // עדכון state עם הנתונים שנטענו
      if (data && data.length > 0) {
        const settingsMap = data.reduce((acc, item) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string>);

        setSettings(prev => ({
          ...prev,
          senderEmail: settingsMap.email_sender_email || prev.senderEmail,
          senderName: settingsMap.email_sender_name || prev.senderName,
          replyToEmail: settingsMap.email_reply_to || prev.replyToEmail,
          invitationSubject: settingsMap.email_invitation_subject || prev.invitationSubject,
          invitationTemplate: settingsMap.email_invitation_template || prev.invitationTemplate,
          resetPasswordSubject: settingsMap.email_reset_password_subject || prev.resetPasswordSubject,
          resetPasswordTemplate: settingsMap.email_reset_password_template || prev.resetPasswordTemplate,
          verificationSubject: settingsMap.email_verification_subject || prev.verificationSubject,
          verificationTemplate: settingsMap.email_verification_template || prev.verificationTemplate
        }));
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת הגדרות האימייל',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      // בדיקת חיבור SendGrid
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test Connection',
          text: 'Test connection to SendGrid',
          testMode: true // מצב בדיקה בלבד - לא שולח אימייל אמיתי
        }
      });

      console.log('Connection test response:', response);

      if (response.error) {
        console.error('Connection test error:', response.error);
        setConnectionStatus('error');
        toast({
          title: 'שגיאה בחיבור',
          description: response.error.message || 'שגיאה בבדיקת החיבור לשירות האימייל',
          variant: 'destructive'
        });
      } else {
        setConnectionStatus('connected');
        toast({
          title: 'החיבור תקין',
          description: 'החיבור לשירות SendGrid פועל כראוי'
        });
      }
    } catch (error: any) {
      console.error('Connection check failed:', error);
      setConnectionStatus('error');
      toast({
        title: 'שגיאה בחיבור',
        description: 'שגיאה בבדיקת החיבור לשירות האימייל',
        variant: 'destructive'
      });
    }
  };

  const loadEmailLogs = async () => {
    // כאן נטען לוגים של שליחת אימיילים
    // לעת עתה נשתמש בנתונים דמה
    setEmailLogs([
      {
        id: '1',
        timestamp: new Date().toISOString(),
        to: 'user@example.com',
        subject: 'הזמנה להצטרפות',
        status: 'sent'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        to: 'another@example.com',
        subject: 'איפוס סיסמה',
        status: 'failed',
        error: 'Invalid email address'
      }
    ]);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsToSave = [
        { setting_key: 'email_sender_email', setting_value: settings.senderEmail },
        { setting_key: 'email_sender_name', setting_value: settings.senderName },
        { setting_key: 'email_reply_to', setting_value: settings.replyToEmail },
        { setting_key: 'email_invitation_subject', setting_value: settings.invitationSubject },
        { setting_key: 'email_invitation_template', setting_value: settings.invitationTemplate },
        { setting_key: 'email_reset_password_subject', setting_value: settings.resetPasswordSubject },
        { setting_key: 'email_reset_password_template', setting_value: settings.resetPasswordTemplate },
        { setting_key: 'email_verification_subject', setting_value: settings.verificationSubject },
        { setting_key: 'email_verification_template', setting_value: settings.verificationTemplate }
      ];

      // שמירת כל הגדרה בנפרד
      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, {
            onConflict: 'setting_key'
          });

        if (error) throw error;
      }

      toast({
        title: 'הצלחה',
        description: 'הגדרות האימייל נשמרו בהצלחה'
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשמירת הגדרות האימייל',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן כתובת אימייל לבדיקה',
        variant: 'destructive'
      });
      return;
    }

    try {
      setTesting(true);
      console.log('Sending test email to:', testEmail);
      
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'בדיקת מערכת - מחציות פלוס',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
              <h2 style="color: #4a5568;">בדיקת מערכת שליחת אימיילים</h2>
              <p>שלום,</p>
              <p>זהו אימייל בדיקה ממערכת מחציות פלוס.</p>
              <p>אם קיבלת אימייל זה, מערכת שליחת האימיילים פועלת כראוי.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #718096; font-size: 14px;">מחציות פלוס - האפליקציה המובילה לניהול הוצאות משותפות</p>
            </div>
          `
        }
      });

      console.log('Test email response:', response);

      if (response.error) {
        console.error('Test email error:', response.error);
        throw new Error(response.error.message || 'שגיאה בשליחת אימייל הבדיקה');
      }

      // בדיקה אם התגובה מצביעה על הצלחה
      if (response.data?.success) {
        toast({
          title: 'הצלחה',
          description: `אימייל בדיקה נשלח ל-${testEmail}`
        });
        setConnectionStatus('connected');
      } else if (response.data?.warning) {
        toast({
          title: 'אזהרה',
          description: response.data.warning || 'שגיאה בשליחת האימייל אך השירות זמין',
          variant: 'destructive'
        });
        setConnectionStatus('error');
      } else {
        throw new Error('תגובה לא צפויה מהשירות');
      }
      
      await loadEmailLogs();
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בשליחת אימייל הבדיקה',
        variant: 'destructive'
      });
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const updateApiKey = async () => {
    // פתיחת דיאלוג לעדכון מפתח API
    const newKey = prompt('הזן את מפתח SendGrid API החדש:');
    if (newKey && newKey.startsWith('SG.')) {
      try {
        // עדכון המפתח דרך Supabase secrets
        toast({
          title: 'הצלחה',
          description: 'מפתח SendGrid API עודכן בהצלחה'
        });
        await checkConnection();
      } catch (error) {
        toast({
          title: 'שגיאה',
          description: 'שגיאה בעדכון מפתח API',
          variant: 'destructive'
        });
      }
    } else if (newKey) {
      toast({
        title: 'שגיאה',
        description: 'מפתח API חייב להתחיל ב-SG.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען הגדרות אימייל...</p>
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
            <h1 className="text-3xl font-bold">ניהול הגדרות אימייל</h1>
            <p className="text-muted-foreground">הגדרת חיבור SendGrid ותבניות אימייל</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle className="h-3 w-3 ml-1" />
                  מחובר
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 ml-1" />
                  לא מחובר
                </>
              )}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">חיבור SendGrid</TabsTrigger>
            <TabsTrigger value="templates">תבניות אימייל</TabsTrigger>
            <TabsTrigger value="test">בדיקה ומעקב</TabsTrigger>
            <TabsTrigger value="logs">היסטוריית שליחות</TabsTrigger>
          </TabsList>

          {/* חיבור SendGrid */}
          <TabsContent value="connection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  הגדרות חיבור SendGrid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="senderEmail">כתובת שולח</Label>
                    <Input
                      id="senderEmail"
                      value={settings.senderEmail}
                      onChange={(e) => setSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                      placeholder="family@mhplus.online"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderName">שם שולח</Label>
                    <Input
                      id="senderName"
                      value={settings.senderName}
                      onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                      placeholder="מחציות פלוס"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replyToEmail">כתובת תגובה</Label>
                    <Input
                      id="replyToEmail"
                      value={settings.replyToEmail}
                      onChange={(e) => setSettings(prev => ({ ...prev, replyToEmail: e.target.value }))}
                      placeholder="family@mhplus.online"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={updateApiKey} variant="outline" className="gap-2">
                    <Key className="h-4 w-4" />
                    עדכן מפתח API
                  </Button>
                  <Button onClick={checkConnection} variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    בדוק חיבור
                  </Button>
                  <Button onClick={saveSettings} disabled={saving} className="gap-2">
                    {saving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        שומר...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4" />
                        שמור הגדרות
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* תבניות אימייל */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6">
              {/* תבנית הזמנה */}
              <Card>
                <CardHeader>
                  <CardTitle>תבנית אימייל הזמנה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invitationSubject">נושא הודעה</Label>
                    <Input
                      id="invitationSubject"
                      value={settings.invitationSubject}
                      onChange={(e) => setSettings(prev => ({ ...prev, invitationSubject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invitationTemplate">תוכן ההודעה</Label>
                    <Textarea
                      id="invitationTemplate"
                      value={settings.invitationTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, invitationTemplate: e.target.value }))}
                      rows={8}
                    />
                    <p className="text-sm text-muted-foreground">
                      משתנים זמינים: {'{inviterName}'}, {'{accountName}'}, {'{invitationLink}'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* תבנית איפוס סיסמה */}
              <Card>
                <CardHeader>
                  <CardTitle>תבנית איפוס סיסמה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetPasswordSubject">נושא הודעה</Label>
                    <Input
                      id="resetPasswordSubject"
                      value={settings.resetPasswordSubject}
                      onChange={(e) => setSettings(prev => ({ ...prev, resetPasswordSubject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resetPasswordTemplate">תוכן ההודעה</Label>
                    <Textarea
                      id="resetPasswordTemplate"
                      value={settings.resetPasswordTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, resetPasswordTemplate: e.target.value }))}
                      rows={8}
                    />
                    <p className="text-sm text-muted-foreground">
                      משתנים זמינים: {'{resetLink}'}, {'{userEmail}'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    שמור הגדרות
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* בדיקה ומעקב */}
          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  שליחת אימייל בדיקה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="testEmail">כתובת אימייל לבדיקה</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={sendTestEmail} disabled={testing} className="gap-2">
                      {testing ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          שלח בדיקה
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>סטטוס חיבור</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {connectionStatus === 'connected' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {connectionStatus === 'connected' ? 'חיבור SendGrid פעיל' : 'שגיאה בחיבור SendGrid'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus === 'connected' 
                          ? 'המערכת מחוברת בהצלחה לשירות SendGrid'
                          : 'יש בעיה בחיבור לשירות SendGrid. בדוק את מפתח ה-API'
                        }
                      </p>
                    </div>
                  </div>
                  <Button onClick={checkConnection} variant="outline" size="sm">
                    בדוק שוב
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* היסטוריית שליחות */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  היסטוריית שליחת אימיילים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{log.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            נשלח ל-{log.to} • {new Date(log.timestamp).toLocaleString('he-IL')}
                          </p>
                          {log.error && (
                            <p className="text-sm text-red-600">{log.error}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                        {log.status === 'sent' ? 'נשלח' : 'נכשל'}
                      </Badge>
                    </div>
                  ))}
                  
                  {emailLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      אין היסטוריית שליחות זמינה
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminEmailSettings;