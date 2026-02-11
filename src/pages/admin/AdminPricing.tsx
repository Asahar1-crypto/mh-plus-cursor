import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Save, DollarSign, Calendar, Globe, Crown, User, Users, 
  Plus, Trash2, RefreshCw, Check, X, Loader2, AlertCircle, Settings2, Edit2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  max_members: number;
  features: PlanFeature[];
  is_active: boolean;
  sort_order: number;
}

interface SystemSettings {
  trial_days: string;
  app_name: string;
  support_email: string;
  currency: string;
}

const AdminPricing: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    trial_days: '30',
    app_name: 'מחציות פלוס',
    support_email: 'support@familybudget.co.il',
    currency: 'ILS',
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; plan: PricingPlan | null }>({
    open: false,
    plan: null,
  });
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    monthly_price: string;
    yearly_price: string;
    max_members: string;
    is_active: boolean;
    sort_order: string;
    features: PlanFeature[];
  }>({
    name: '',
    description: '',
    monthly_price: '',
    yearly_price: '',
    max_members: '',
    is_active: true,
    sort_order: '',
    features: [],
  });
  const [newFeatureText, setNewFeatureText] = useState('');

  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPlans(), loadSettings()]);
    setLoading(false);
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      setPlans(
        (data || []).map((plan) => ({
          ...plan,
          features: (plan.features as unknown as PlanFeature[]) || [],
        }))
      );
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת התוכניות',
        variant: 'destructive',
      });
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((item) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSettings({
        trial_days: settingsMap.trial_days || '30',
        app_name: settingsMap.app_name || 'מחציות פלוס',
        support_email: settingsMap.support_email || 'support@familybudget.co.il',
        currency: settingsMap.currency || 'ILS',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);

      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'setting_key', ignoreDuplicates: false });

        if (error) throw error;
      }

      toast({ title: 'הצלחה', description: 'הגדרות המערכת נשמרו בהצלחה' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשמירת ההגדרות',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const openEditDialog = (plan: PricingPlan) => {
    setEditForm({
      name: plan.name,
      description: plan.description || '',
      monthly_price: plan.monthly_price.toString(),
      yearly_price: plan.yearly_price.toString(),
      max_members: plan.max_members.toString(),
      is_active: plan.is_active,
      sort_order: plan.sort_order.toString(),
      features: [...plan.features],
    });
    setNewFeatureText('');
    setEditDialog({ open: true, plan });
  };

  const savePlan = async () => {
    if (!editDialog.plan) return;

    try {
      setSavingPlan(editDialog.plan.id);

      const { error } = await supabase
        .from('pricing_plans')
        .update({
          name: editForm.name,
          description: editForm.description || null,
          monthly_price: parseFloat(editForm.monthly_price),
          yearly_price: parseFloat(editForm.yearly_price),
          max_members: parseInt(editForm.max_members),
          is_active: editForm.is_active,
          sort_order: parseInt(editForm.sort_order),
          features: editForm.features as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editDialog.plan.id);

      if (error) throw error;

      toast({ title: 'הצלחה', description: `תוכנית "${editForm.name}" עודכנה בהצלחה` });
      setEditDialog({ open: false, plan: null });
      await loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשמירת התוכנית',
        variant: 'destructive',
      });
    } finally {
      setSavingPlan(null);
    }
  };

  const addFeature = () => {
    if (!newFeatureText.trim()) return;
    setEditForm((prev) => ({
      ...prev,
      features: [...prev.features, { text: newFeatureText.trim(), included: true }],
    }));
    setNewFeatureText('');
  };

  const removeFeature = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const toggleFeatureIncluded = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      features: prev.features.map((f, i) =>
        i === index ? { ...f, included: !f.included } : f
      ),
    }));
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'personal': return <User className="h-5 w-5" />;
      case 'family': return <Crown className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  const getSavingsPercent = (plan: PricingPlan) => {
    const monthlyCost = plan.monthly_price * 12;
    const yearlyCost = plan.yearly_price;
    if (monthlyCost === 0) return 0;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p>טוען הגדרות תמחור...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in">
          <Button onClick={() => window.history.back()} variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">חזור</span>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl border border-green-200/50 dark:border-green-800/50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">ניהול תמחור והגדרות</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">עדכן מחירים, תוכניות ותנאים</p>
              </div>
            </div>
          </div>
          <Button onClick={loadAll} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">רענן</span>
          </Button>
        </div>

        {/* Pricing Plans Section */}
        <div className="animate-fade-in [animation-delay:200ms]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            תוכניות מחירים
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {plans.map((plan) => {
              const savings = getSavingsPercent(plan);
              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    !plan.is_active ? 'opacity-60' : ''
                  } ${plan.slug === 'family' ? 'border-purple-300 dark:border-purple-700' : 'border-border/50'}`}
                >
                  {!plan.is_active && (
                    <div className="absolute top-0 left-0 right-0 bg-muted text-muted-foreground text-center text-xs font-bold py-1 z-10">
                      לא פעיל
                    </div>
                  )}

                  <CardHeader className={`pb-3 ${!plan.is_active ? 'pt-8' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${
                          plan.slug === 'family' 
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {getPlanIcon(plan.slug)}
                        </div>
                        <div>
                          <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                          <CardDescription className="text-xs">{plan.description}</CardDescription>
                        </div>
                      </div>
                      <Button
                        onClick={() => openEditDialog(plan)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">ערוך</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg border border-border/30 text-center">
                        <div className="text-xs text-muted-foreground mb-1">חודשי</div>
                        <div className="text-xl sm:text-2xl font-bold text-primary">₪{plan.monthly_price}</div>
                        <div className="text-xs text-muted-foreground">לחודש</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border/30 text-center">
                        <div className="text-xs text-muted-foreground mb-1">שנתי</div>
                        <div className="text-xl sm:text-2xl font-bold text-primary">₪{plan.yearly_price}</div>
                        <div className="text-xs text-muted-foreground">
                          לשנה (₪{(plan.yearly_price / 12).toFixed(2)}/חודש)
                        </div>
                        {savings > 0 && (
                          <Badge variant="secondary" className="mt-1 text-xs bg-green-100 text-green-700 border-green-200">
                            חיסכון {savings}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        מקס׳ משתמשים
                      </span>
                      <Badge variant="outline">{plan.max_members}</Badge>
                    </div>

                    {/* Features Preview */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">תכונות ({plan.features.length})</div>
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          {feature.included ? (
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span className={feature.included ? '' : 'text-muted-foreground/60 line-through'}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <div className="text-xs text-muted-foreground">
                          +{plan.features.length - 4} תכונות נוספות
                        </div>
                      )}
                    </div>

                    {/* Slug info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <span>Slug: <code className="bg-muted px-1 rounded">{plan.slug}</code></span>
                      <span>סדר: {plan.sort_order}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Settings */}
        <div className="animate-fade-in [animation-delay:400ms]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            הגדרות מערכת
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  תקופת ניסיון
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="trial_days">ימי ניסיון חינם (לחשבונות חדשים)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="trial_days"
                      type="number"
                      value={settings.trial_days}
                      onChange={(e) => setSettings((p) => ({ ...p, trial_days: e.target.value }))}
                      className="flex-1"
                      min="0"
                    />
                    <span className="text-sm text-muted-foreground">ימים</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ברירת מחדל לכל חשבון חדש. ניתן לשנות למשפחה ספציפית בדף ניהול משפחות.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  הגדרות כלליות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="app_name">שם האפליקציה</Label>
                  <Input
                    id="app_name"
                    value={settings.app_name}
                    onChange={(e) => setSettings((p) => ({ ...p, app_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_email">מייל תמיכה</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings((p) => ({ ...p, support_email: e.target.value }))}
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button onClick={saveSettings} disabled={savingSettings} className="gap-2 w-full sm:w-auto">
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingSettings ? 'שומר...' : 'שמור הגדרות מערכת'}
            </Button>
          </div>
        </div>

        {/* Preview Section */}
        <Card className="animate-fade-in [animation-delay:600ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">תצוגה מקדימה - כפי שנראה לעמוד Pricing</CardTitle>
            <CardDescription className="text-xs">כך המשתמשים רואים את התוכניות בעמוד התמחור הציבורי</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {plans.filter(p => p.is_active).map((plan) => {
                const isPopular = plan.slug === 'family';
                return (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-4 text-center ${
                      isPopular ? 'border-primary border-2 bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    {isPopular && (
                      <Badge className="mb-2" variant="default">הכי פופולרי</Badge>
                    )}
                    <div className={`mx-auto mb-2 h-10 w-10 rounded-full flex items-center justify-center ${
                      isPopular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {getPlanIcon(plan.slug)}
                    </div>
                    <h3 className="font-bold text-base">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                    <div className="text-2xl font-extrabold text-primary">₪{plan.monthly_price}</div>
                    <div className="text-xs text-muted-foreground">לחודש</div>
                    <div className="text-xs text-muted-foreground mt-1">או ₪{plan.yearly_price}/שנה</div>
                    <div className="mt-3 space-y-1">
                      {plan.features.filter(f => f.included).slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs justify-center">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50 animate-fade-in [animation-delay:800ms]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">איפה המחירים משפיעים?</p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-400 text-xs">
                  <li>• <strong>עמוד תמחור ציבורי</strong> (/pricing) - מציג את התוכניות למשתמשים חדשים</li>
                  <li>• <strong>עמוד בחירת תוכנית</strong> (/choose-plan) - עמוד תשלום לאחר ניסיון</li>
                  <li>• <strong>כרטיס מנוי</strong> בהגדרות חשבון - מציג מחיר נוכחי</li>
                  <li>• <strong>חישוב הכנסות</strong> בלוח הבקרה של האדמין</li>
                  <li>• <strong>ניהול משפחות</strong> - מציג מחיר תוכנית לכל משפחה</li>
                  <li>• <strong>ימי ניסיון</strong> - משפיעים רק על חשבונות חדשים שנרשמים</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Plan Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, plan: null })}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                עריכת תוכנית - {editForm.name}
              </DialogTitle>
              <DialogDescription>
                שנה מחירים, תכונות והגדרות של התוכנית
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">שם התוכנית</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">מקס׳ משתמשים</Label>
                  <Input
                    type="number"
                    value={editForm.max_members}
                    onChange={(e) => setEditForm((p) => ({ ...p, max_members: e.target.value }))}
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">תיאור</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="resize-none h-16"
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">מחיר חודשי (₪)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.monthly_price}
                    onChange={(e) => setEditForm((p) => ({ ...p, monthly_price: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">מחיר שנתי (₪)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.yearly_price}
                    onChange={(e) => setEditForm((p) => ({ ...p, yearly_price: e.target.value }))}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Savings preview */}
              {editForm.monthly_price && editForm.yearly_price && (
                <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
                  חיסכון שנתי: {(() => {
                    const monthly = parseFloat(editForm.monthly_price) * 12;
                    const yearly = parseFloat(editForm.yearly_price);
                    if (monthly === 0) return '0%';
                    return `${Math.round(((monthly - yearly) / monthly) * 100)}%`;
                  })()} (₪{(parseFloat(editForm.yearly_price) / 12).toFixed(2)}/חודש בתשלום שנתי)
                </div>
              )}

              {/* Active + Sort */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(val) => setEditForm((p) => ({ ...p, is_active: val }))}
                  />
                  <Label className="text-sm">{editForm.is_active ? 'פעילה' : 'לא פעילה'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">סדר</Label>
                  <Input
                    type="number"
                    value={editForm.sort_order}
                    onChange={(e) => setEditForm((p) => ({ ...p, sort_order: e.target.value }))}
                    className="w-16 text-center"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">תכונות</Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {editForm.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 border border-border/30">
                      <button
                        type="button"
                        onClick={() => toggleFeatureIncluded(index)}
                        className={`p-1 rounded transition-colors ${
                          feature.included
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-400 hover:bg-red-200'
                        }`}
                      >
                        {feature.included ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </button>
                      <span className={`flex-1 text-xs ${!feature.included ? 'line-through text-muted-foreground' : ''}`}>
                        {feature.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="הוסף תכונה חדשה..."
                    className="text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature} size="sm" variant="outline" className="gap-1 flex-shrink-0">
                    <Plus className="h-3 w-3" />
                    הוסף
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, plan: null })}>
                ביטול
              </Button>
              <Button onClick={savePlan} disabled={!!savingPlan} className="gap-2">
                {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingPlan ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPricing;
