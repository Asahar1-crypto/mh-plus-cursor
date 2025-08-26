import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, DollarSign, Calendar, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';

interface PricingSettings {
  monthly_price: string;
  currency: string;
  trial_days: string;
  app_name: string;
  support_email: string;
}

const AdminPricing: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PricingSettings>({
    monthly_price: '50',
    currency: 'ILS',
    trial_days: '14',
    app_name: 'Family Budget',
    support_email: 'support@familybudget.co.il'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, updated_at');

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSettings({
        monthly_price: settingsMap.monthly_price || '50',
        currency: settingsMap.currency || 'ILS',
        trial_days: settingsMap.trial_days || '14',
        app_name: settingsMap.app_name || 'Family Budget',
        support_email: settingsMap.support_email || 'support@familybudget.co.il'
      });

      // קבלת היסטוריית שינויים (5 אחרונים)
      const historyData = data
        ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
      
      setChangeHistory(historyData || []);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת הגדרות המערכת',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // עדכון כל ההגדרות
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { 
            onConflict: 'setting_key',
            ignoreDuplicates: false 
          });

        if (error) throw error;
      }

      toast({
        title: 'הצלחה',
        description: 'הגדרות המחיר נשמרו בהצלחה',
      });

      // רענון רשימת השינויים
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשמירת ההגדרות',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof PricingSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען הגדרות מחיר...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
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
          <div>
            <h1 className="text-3xl font-bold">ניהול מחירים והגדרות</h1>
            <p className="text-muted-foreground">עדכן מחירים ותנאי השירות</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* הגדרות מחיר */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                הגדרות תמחור
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_price">מחיר חודשי</Label>
                <div className="relative">
                  <Input
                    id="monthly_price"
                    type="number"
                    value={settings.monthly_price}
                    onChange={(e) => handleInputChange('monthly_price', e.target.value)}
                    className="pl-8"
                  />
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">₪</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">מטבע</Label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="ILS">שקל חדש (ILS)</option>
                  <option value="USD">דולר אמריקאי (USD)</option>
                  <option value="EUR">יורו (EUR)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial_days">ימי ניסיון חינם</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="trial_days"
                    type="number"
                    value={settings.trial_days}
                    onChange={(e) => handleInputChange('trial_days', e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">ימים</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* הגדרות כלליות */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                הגדרות כלליות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app_name">שם האפליקציה</Label>
                <Input
                  id="app_name"
                  value={settings.app_name}
                  onChange={(e) => handleInputChange('app_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_email">מייל תמיכה</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => handleInputChange('support_email', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* תצוגה מקדימה */}
        <Card>
          <CardHeader>
            <CardTitle>תצוגה מקדימה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">{settings.app_name}</h3>
              <div className="text-3xl font-bold text-primary mb-2">
                ₪{settings.monthly_price}/חודש
              </div>
              <p className="text-sm text-muted-foreground">
                {settings.trial_days} ימי ניסיון חינם • ללא התחייבות
              </p>
            </div>
          </CardContent>
        </Card>

        {/* פעולות */}
        <div className="flex gap-4">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>

          <Button
            onClick={loadSettings}
            variant="outline"
          >
            בטל שינויים
          </Button>
        </div>

        {/* היסטוריית שינויים */}
        {changeHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                שינויים אחרונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {changeHistory.map((change, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <span className="font-medium">{change.setting_key}</span>
                    <div className="text-left">
                      <div className="text-sm">{change.setting_value}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(change.updated_at).toLocaleDateString('he-IL')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminPricing;