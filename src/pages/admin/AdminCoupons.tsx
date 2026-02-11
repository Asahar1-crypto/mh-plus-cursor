import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Tag, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
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

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  applicable_plans: string;
  applicable_billing: string;
  max_redemptions: number | null;
  current_redemptions: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminCoupons: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as string,
    discount_value: '',
    applicable_plans: 'all' as string,
    applicable_billing: 'all' as string,
    max_redemptions: '',
    valid_until: '',
  });
  const [saving, setSaving] = useState(false);

  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast({ title: 'שגיאה', description: 'שגיאה בטעינת קופונים', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) {
      toast({ title: 'שגיאה', description: 'יש למלא קוד קופון וערך הנחה', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('coupons').insert({
        code: newCoupon.code.toUpperCase().trim(),
        description: newCoupon.description || null,
        discount_type: newCoupon.discount_type,
        discount_value: parseFloat(newCoupon.discount_value),
        applicable_plans: newCoupon.applicable_plans,
        applicable_billing: newCoupon.applicable_billing,
        max_redemptions: newCoupon.max_redemptions ? parseInt(newCoupon.max_redemptions) : null,
        valid_until: newCoupon.valid_until || null,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: 'הצלחה', description: 'קופון נוצר בהצלחה' });
      setCreateDialog(false);
      setNewCoupon({
        code: '', description: '', discount_type: 'percentage', discount_value: '',
        applicable_plans: 'all', applicable_billing: 'all', max_redemptions: '', valid_until: '',
      });
      await loadCoupons();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast({
        title: 'שגיאה',
        description: error.message?.includes('duplicate') ? 'קוד קופון כבר קיים' : 'שגיאה ביצירת קופון',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('id', couponId);

      if (error) throw error;
      toast({ title: 'הצלחה', description: `קופון ${!isActive ? 'הופעל' : 'הושבת'}` });
      await loadCoupons();
    } catch (error) {
      toast({ title: 'שגיאה', description: 'שגיאה בעדכון קופון', variant: 'destructive' });
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', couponId);
      if (error) throw error;
      toast({ title: 'הצלחה', description: 'קופון נמחק' });
      await loadCoupons();
    } catch (error) {
      toast({ title: 'שגיאה', description: 'שגיאה במחיקת קופון', variant: 'destructive' });
    }
  };

  const getDiscountLabel = (type: string, value: number) => {
    switch (type) {
      case 'percentage': return `${value}%`;
      case 'fixed': return `₪${value}`;
      case 'free_months': return `${value} חודשים חינם`;
      default: return String(value);
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'all': return 'הכל';
      case 'personal': return 'Personal';
      case 'family': return 'Family';
      default: return plan;
    }
  };

  const getBillingLabel = (billing: string) => {
    switch (billing) {
      case 'all': return 'הכל';
      case 'monthly': return 'חודשי';
      case 'yearly': return 'שנתי';
      default: return billing;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p>טוען קופונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button onClick={() => window.history.back()} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline mr-1">חזור</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">ניהול קופונים</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">יצירה וניהול קופוני הנחה</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadCoupons} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCreateDialog(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">קופון חדש</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">סה"כ קופונים</div>
              <div className="text-xl sm:text-2xl font-bold">{coupons.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">פעילים</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {coupons.filter(c => c.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">מומשו</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {coupons.reduce((sum, c) => sum + c.current_redemptions, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">לא פעילים</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-500">
                {coupons.filter(c => !c.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons List */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">רשימת קופונים ({coupons.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4 md:p-6 sm:pt-0 md:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2 sm:p-3">קוד</th>
                    <th className="text-right p-2 sm:p-3">הנחה</th>
                    <th className="text-right p-2 sm:p-3 hidden sm:table-cell">תוכנית</th>
                    <th className="text-right p-2 sm:p-3 hidden md:table-cell">חיוב</th>
                    <th className="text-right p-2 sm:p-3">שימושים</th>
                    <th className="text-right p-2 sm:p-3 hidden lg:table-cell">תוקף</th>
                    <th className="text-right p-2 sm:p-3">סטטוס</th>
                    <th className="text-right p-2 sm:p-3">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 sm:p-3">
                        <div className="font-mono font-bold text-xs sm:text-sm">{coupon.code}</div>
                        {coupon.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{coupon.description}</div>
                        )}
                      </td>
                      <td className="p-2 sm:p-3">
                        <Badge variant="secondary">{getDiscountLabel(coupon.discount_type, coupon.discount_value)}</Badge>
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell text-xs sm:text-sm">
                        {getPlanLabel(coupon.applicable_plans)}
                      </td>
                      <td className="p-2 sm:p-3 hidden md:table-cell text-xs sm:text-sm">
                        {getBillingLabel(coupon.applicable_billing)}
                      </td>
                      <td className="p-2 sm:p-3 text-xs sm:text-sm">
                        {coupon.current_redemptions}
                        {coupon.max_redemptions && `/${coupon.max_redemptions}`}
                      </td>
                      <td className="p-2 sm:p-3 hidden lg:table-cell text-xs sm:text-sm">
                        {coupon.valid_until
                          ? new Date(coupon.valid_until).toLocaleDateString('he-IL')
                          : 'ללא הגבלה'}
                      </td>
                      <td className="p-2 sm:p-3">
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                          {coupon.is_active ? 'פעיל' : 'מושבת'}
                        </Badge>
                      </td>
                      <td className="p-2 sm:p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleCoupon(coupon.id, coupon.is_active)}
                          >
                            {coupon.is_active
                              ? <ToggleRight className="h-4 w-4 text-green-500" />
                              : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => {
                              if (confirm('האם למחוק את הקופון?')) {
                                deleteCoupon(coupon.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>אין קופונים. צור קופון חדש כדי להתחיל.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Coupon Dialog */}
        <AlertDialog open={createDialog} onOpenChange={setCreateDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>יצירת קופון חדש</AlertDialogTitle>
              <AlertDialogDescription>הגדר את פרטי הקופון</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>קוד קופון</Label>
                  <Input
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>תיאור</Label>
                  <Input
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    placeholder="הנחת השקה"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>סוג הנחה</Label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="percentage">אחוזים (%)</option>
                    <option value="fixed">סכום קבוע (₪)</option>
                    <option value="free_months">חודשים חינם</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {newCoupon.discount_type === 'percentage' ? 'אחוז הנחה'
                      : newCoupon.discount_type === 'fixed' ? 'סכום הנחה (₪)'
                      : 'מספר חודשים'}
                  </Label>
                  <Input
                    type="number"
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                    placeholder={newCoupon.discount_type === 'percentage' ? '20' : '10'}
                    min="1"
                    max={newCoupon.discount_type === 'percentage' ? '100' : '9999'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>תוכנית</Label>
                  <select
                    value={newCoupon.applicable_plans}
                    onChange={(e) => setNewCoupon({ ...newCoupon, applicable_plans: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">כל התוכניות</option>
                    <option value="personal">Personal בלבד</option>
                    <option value="family">Family בלבד</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>תקופת חיוב</Label>
                  <select
                    value={newCoupon.applicable_billing}
                    onChange={(e) => setNewCoupon({ ...newCoupon, applicable_billing: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">הכל</option>
                    <option value="monthly">חודשי בלבד</option>
                    <option value="yearly">שנתי בלבד</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>מקסימום שימושים</Label>
                  <Input
                    type="number"
                    value={newCoupon.max_redemptions}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_redemptions: e.target.value })}
                    placeholder="ללא הגבלה"
                    min="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>תוקף עד</Label>
                  <Input
                    type="date"
                    value={newCoupon.valid_until}
                    onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={createCoupon} disabled={saving}>
                {saving ? 'יוצר...' : 'צור קופון'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminCoupons;
