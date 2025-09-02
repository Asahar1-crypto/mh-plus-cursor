import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, MessageSquare, Send, Key, Settings, History, TestTube, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SMSSettings {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  invitationTemplate: string;
  verificationTemplate: string;
  passwordResetTemplate: string;
  twoFactorTemplate: string;
}

interface SMSLog {
  id: string;
  timestamp: string;
  to: string;
  message: string;
  status: string;
  error?: string;
}

const AdminSMSSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  
  const [settings, setSettings] = useState<SMSSettings>({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '+972',
    invitationTemplate: 'שלום! קיבלת הזמנה להצטרפות למשפחת {accountName} במערכת מחציות פלוס. קישור הרשמה: {invitationLink}',
    verificationTemplate: 'קוד האימות שלך במחציות פלוס: {verificationCode}. הקוד תקף ל-10 דקות.',
    passwordResetTemplate: 'קוד איפוס הסיסמה שלך במחציות פלוס: {resetCode}. הקוד תקף ל-10 דקות.',
    twoFactorTemplate: 'קוד האימות הדו-שלבי שלך במחציות פלוס: {verificationCode}'
  });

  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadSettings();
    checkConnection();
    loadSMSLogs();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // טעינת הגדרות מהמערכת
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'sms_twilio_phone_number',
          'sms_invitation_template',
          'sms_verification_template',
          'sms_password_reset_template',
          'sms_two_factor_template'
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
          twilioPhoneNumber: settingsMap.sms_twilio_phone_number || prev.twilioPhoneNumber,
          invitationTemplate: settingsMap.sms_invitation_template || prev.invitationTemplate,
          verificationTemplate: settingsMap.sms_verification_template || prev.verificationTemplate,
          passwordResetTemplate: settingsMap.sms_password_reset_template || prev.passwordResetTemplate,
          twoFactorTemplate: settingsMap.sms_two_factor_template || prev.twoFactorTemplate
        }));
      }
    } catch (error) {
      console.error('Error loading SMS settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת הגדרות SMS',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      // בדיקת חיבור Twilio
      const response = await supabase.functions.invoke('send-sms', {
        body: {
          to: '+972500000000',
          message: 'Test connection to Twilio',
          testMode: true // מצב בדיקה בלבד - לא שולח SMS אמיתי
        }
      });

      console.log('SMS Connection test response:', response);

      if (response.error) {
        console.error('SMS Connection test error:', response.error);
        
        // בדיקה אם השגיאה היא Unauthorized - זה אומר שחסרים סודות
        if (response.error.message === 'Unauthorized') {
          setConnectionStatus('error');
          toast({
            title: 'נדרשת הגדרת סודות Twilio',
            description: 'עליך להגדיר TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ו-TWILIO_PHONE_NUMBER בהגדרות הפונקציות של Supabase',
            variant: 'destructive'
          });
        } else {
          setConnectionStatus('error');
          toast({
            title: 'שגיאה בחיבור',
            description: response.error.message || 'שגיאה בבדיקת החיבור לשירות SMS',
            variant: 'destructive'
          });
        }
      } else {
        setConnectionStatus('connected');
        toast({
          title: 'החיבור תקין',
          description: 'החיבור לשירות Twilio פועל כראוי'
        });
      }
    } catch (error: any) {
      console.error('SMS Connection check failed:', error);
      setConnectionStatus('error');
      toast({
        title: 'שגיאה בחיבור',
        description: 'שגיאה בבדיקת החיבור לשירות SMS',
        variant: 'destructive'
      });
    }
  };

  const loadSMSLogs = async () => {
    // כאן נטען לוגים של שליחת SMS
    // לעת עתה נשתמש בנתונים דמה
    setSmsLogs([
      {
        id: '1',
        timestamp: new Date().toISOString(),
        to: '+972501234567',
        message: 'קוד האימות שלך: 123456',
        status: 'sent'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        to: '+972502345678',
        message: 'הזמנה להצטרפות למשפחה',
        status: 'failed',
        error: 'Invalid phone number'
      }
    ]);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsToSave = [
        { setting_key: 'sms_twilio_phone_number', setting_value: settings.twilioPhoneNumber },
        { setting_key: 'sms_invitation_template', setting_value: settings.invitationTemplate },
        { setting_key: 'sms_verification_template', setting_value: settings.verificationTemplate },
        { setting_key: 'sms_password_reset_template', setting_value: settings.passwordResetTemplate },
        { setting_key: 'sms_two_factor_template', setting_value: settings.twoFactorTemplate }
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
        description: 'הגדרות SMS נשמרו בהצלחה'
      });
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשמירת הגדרות SMS',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestSMS = async () => {
    if (!testPhoneNumber) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן מספר טלפון לבדיקה',
        variant: 'destructive'
      });
      return;
    }

    // בדיקת פורמט מספר טלפון
    if (!testPhoneNumber.startsWith('+972') && !testPhoneNumber.startsWith('05')) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן מספר טלפון תקף (052xxxxxxx או +972xxxxxxxxx)',
        variant: 'destructive'
      });
      return;
    }

    try {
      setTesting(true);
      console.log('Sending test SMS to:', testPhoneNumber);
      
      // תיקון פורמט המספר
      let formattedNumber = testPhoneNumber;
      if (testPhoneNumber.startsWith('05')) {
        formattedNumber = '+972' + testPhoneNumber.substring(1);
      }
      
      const response = await supabase.functions.invoke('send-sms', {
        body: {
          to: formattedNumber,
          message: 'זהו SMS בדיקה ממערכת מחציות פלוס. אם קיבלת הודעה זו, המערכת פועלת כראוי.',
          purpose: 'test'
        }
      });

      console.log('Test SMS response:', response);

      if (response.error) {
        console.error('Test SMS error:', response.error);
        throw new Error(response.error.message || 'שגיאה בשליחת SMS הבדיקה');
      }

      // בדיקה אם התגובה מצביעה על הצלחה
      if (response.data?.success) {
        toast({
          title: 'הצלחה',
          description: `SMS בדיקה נשלח ל-${testPhoneNumber}`
        });
        setConnectionStatus('connected');
      } else if (response.data?.warning) {
        toast({
          title: 'אזהרה',
          description: response.data.warning || 'שגיאה בשליחת ה-SMS אך השירות זמין',
          variant: 'destructive'
        });
        setConnectionStatus('error');
      } else {
        throw new Error('תגובה לא צפויה מהשירות');
      }
      
      await loadSMSLogs();
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בשליחת SMS הבדיקה',
        variant: 'destructive'
      });
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const updateTwilioCredentials = async () => {
    // הפניה להגדרות הפונקציות של Supabase
    window.open('https://supabase.com/dashboard/project/hchmfsilgfrzhenafbzi/settings/functions', '_blank');
    toast({
      title: 'הגדרת פרטי Twilio',
      description: 'עבור להגדרות הפונקציות של Supabase והגדר את TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ו-TWILIO_PHONE_NUMBER'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען הגדרות SMS...</p>
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
            <h1 className="text-3xl font-bold">ניהול הגדרות SMS</h1>
            <p className="text-muted-foreground">הגדרת חיבור Twilio ותבניות הודעות SMS</p>
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
            <TabsTrigger value="connection">חיבור Twilio</TabsTrigger>
            <TabsTrigger value="templates">תבניות SMS</TabsTrigger>
            <TabsTrigger value="test">בדיקה ומעקב</TabsTrigger>
            <TabsTrigger value="logs">היסטוריית שליחות</TabsTrigger>
          </TabsList>

          {/* חיבור Twilio */}
          <TabsContent value="connection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  הגדרות חיבור Twilio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="twilioPhoneNumber">מספר טלפון Twilio</Label>
                    <Input
                      id="twilioPhoneNumber"
                      value={settings.twilioPhoneNumber}
                      onChange={(e) => setSettings(prev => ({ ...prev, twilioPhoneNumber: e.target.value }))}
                      placeholder="+972501234567"
                      dir="ltr"
                    />
                    <p className="text-sm text-muted-foreground">
                      מספר הטלפון של Twilio ששולח את ההודעות (כולל קוד מדינה)
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    פרטי חיבור Twilio
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Account SID, Auth Token ומפתחות נוספים מוגדרים בהגדרות הפונקציות של Supabase
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button onClick={updateTwilioCredentials} variant="outline" className="gap-2">
                    <Key className="h-4 w-4" />
                    עדכן פרטי Twilio
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

          {/* תבניות SMS */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6">
              {/* תבנית הזמנה */}
              <Card>
                <CardHeader>
                  <CardTitle>תבנית SMS הזמנה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invitationTemplate">תוכן הודעת הזמנה</Label>
                    <Textarea
                      id="invitationTemplate"
                      value={settings.invitationTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, invitationTemplate: e.target.value }))}
                      rows={4}
                      placeholder="שלום! קיבלת הזמנה להצטרפות למשפחת {accountName}..."
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>משתנים זמינים:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code>{'{accountName}'}</code> - שם המשפחה</li>
                        <li><code>{'{inviterName}'}</code> - שם המזמין</li>
                        <li><code>{'{invitationLink}'}</code> - קישור להזמנה</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* תבנית אימות */}
              <Card>
                <CardHeader>
                  <CardTitle>תבנית SMS אימות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verificationTemplate">תוכן הודעת אימות</Label>
                    <Textarea
                      id="verificationTemplate"
                      value={settings.verificationTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, verificationTemplate: e.target.value }))}
                      rows={3}
                      placeholder="קוד האימות שלך במחציות פלוס: {verificationCode}"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>משתנים זמינים:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code>{'{verificationCode}'}</code> - קוד האימות</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* תבנית איפוס סיסמה */}
              <Card>
                <CardHeader>
                  <CardTitle>תבנית SMS איפוס סיסמה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordResetTemplate">תוכן הודעת איפוס סיסמה</Label>
                    <Textarea
                      id="passwordResetTemplate"
                      value={settings.passwordResetTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, passwordResetTemplate: e.target.value }))}
                      rows={3}
                      placeholder="קוד איפוס הסיסמה שלך במחציות פלוס: {resetCode}"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>משתנים זמינים:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code>{'{resetCode}'}</code> - קוד איפוס הסיסמה</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* תבנית אימות דו-שלבי */}
              <Card>
                <CardHeader>
                  <CardTitle>תבנית SMS אימות דו-שלבי</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="twoFactorTemplate">תוכן הודעת אימות דו-שלבי</Label>
                    <Textarea
                      id="twoFactorTemplate"
                      value={settings.twoFactorTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, twoFactorTemplate: e.target.value }))}
                      rows={3}
                      placeholder="קוד האימות הדו-שלבי שלך במחציות פלוס: {verificationCode}"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>משתנים זמינים:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code>{'{verificationCode}'}</code> - קוד אימות דו-שלבי</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      שומר תבניות...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      שמור תבניות
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* בדיקה ומעקב */}
          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  בדיקת שליחת SMS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="testPhoneNumber">מספר טלפון לבדיקה</Label>
                    <Input
                      id="testPhoneNumber"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="0521234567 או +972521234567"
                      dir="ltr"
                    />
                    <p className="text-sm text-muted-foreground">
                      הזן מספר טלפון תקף לבדיקת המערכת
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={sendTestSMS} 
                  disabled={testing || !testPhoneNumber}
                  className="gap-2"
                >
                  {testing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      שולח SMS...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      שלח SMS בדיקה
                    </>
                  )}
                </Button>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">מידע על בדיקת SMS</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• הודעת בדיקה תישלח למספר שהוזן</li>
                    <li>• הבדיקה מאמתת את תקינות החיבור לTwilio</li>
                    <li>• עלות ההודעה תחויב בחשבון Twilio שלך</li>
                    <li>• ודא שהמספר תקין וזמין לקבלת הודעות</li>
                  </ul>
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
                  היסטוריית שליחת SMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {smsLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.to}</span>
                          <Badge 
                            variant={log.status === 'sent' ? 'default' : 'destructive'}
                          >
                            {log.status === 'sent' ? 'נשלח' : 'נכשל'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {log.message.length > 50 
                            ? `${log.message.substring(0, 50)}...` 
                            : log.message}
                        </p>
                        {log.error && (
                          <p className="text-sm text-red-600">{log.error}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('he-IL')}
                      </div>
                    </div>
                  ))}
                  
                  {smsLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>אין היסטוריית שליחות זמינה</p>
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

export default AdminSMSSettings;