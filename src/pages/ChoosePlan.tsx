import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Check, X, Crown, User, Users, Tag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

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
  sort_order: number;
}

interface CouponResult {
  is_valid: boolean;
  coupon_id: string | null;
  discount_type: string | null;
  discount_value: number | null;
  error_message: string | null;
}

const ChoosePlan: React.FC = () => {
  const navigate = useNavigate();
  const { account, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  // Detect if this is an upgrade flow (user already has an active plan)
  const isUpgrade = account?.subscription_status === 'active' && !!account?.plan_slug;
  const currentPlanSlug = account?.plan_slug;

  useEffect(() => {
    loadPlans();
    loadMemberCount();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
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
    } finally {
      setLoading(false);
    }
  };

  const loadMemberCount = async () => {
    if (!account) return;
    const { data } = await supabase
      .from('account_members')
      .select('id')
      .eq('account_id', account.id);
    setMemberCount(data?.length || 0);
  };

  const getPrice = (plan: PricingPlan) => {
    return isYearly ? plan.yearly_price : plan.monthly_price;
  };

  const getMonthlyEquivalent = (plan: PricingPlan) => {
    if (isYearly) {
      return (plan.yearly_price / 12).toFixed(2);
    }
    return null;
  };

  const getSavingsPercent = (plan: PricingPlan) => {
    const monthlyCost = plan.monthly_price * 12;
    const yearlyCost = plan.yearly_price;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  const calculateDiscount = (price: number): number => {
    if (!couponResult?.is_valid) return 0;
    switch (couponResult.discount_type) {
      case 'percentage':
        return price * ((couponResult.discount_value || 0) / 100);
      case 'fixed':
        return Math.min(couponResult.discount_value || 0, price);
      case 'free_months':
        // For free months, discount = monthly_price * free_months (only for monthly billing)
        if (!isYearly && selectedPlan) {
          const plan = plans.find(p => p.slug === selectedPlan);
          if (plan) {
            return plan.monthly_price * (couponResult.discount_value || 0);
          }
        }
        return 0;
      default:
        return 0;
    }
  };

  const getFinalPrice = (plan: PricingPlan): number => {
    const basePrice = getPrice(plan);
    if (!couponResult?.is_valid || selectedPlan !== plan.slug) return basePrice;
    const discount = calculateDiscount(basePrice);
    return Math.max(0, basePrice - discount);
  };

  const validateCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan || !account) return;

    setCouponLoading(true);
    setCouponResult(null);

    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.trim(),
        p_plan_slug: selectedPlan,
        p_billing_period: isYearly ? 'yearly' : 'monthly',
        p_account_id: account.id,
      });

      if (error) throw error;

      const result = data?.[0] || { is_valid: false, error_message: 'שגיאה לא צפויה' };
      setCouponResult(result);

      if (!result.is_valid) {
        toast({
          title: 'קופון לא תקף',
          description: result.error_message || 'קוד קופון לא תקף',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'קופון הופעל',
          description: getDiscountDescription(result),
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בבדיקת הקופון',
        variant: 'destructive',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const getDiscountDescription = (result: CouponResult): string => {
    if (!result.is_valid) return '';
    switch (result.discount_type) {
      case 'percentage':
        return `הנחה של ${result.discount_value}%`;
      case 'fixed':
        return `הנחה של ₪${result.discount_value}`;
      case 'free_months':
        return `${result.discount_value} חודשים חינם`;
      default:
        return 'הנחה הופעלה';
    }
  };

  // Check if personal plan is blocked (account has partner)
  const isPersonalBlocked = (planSlug: string) => {
    return planSlug === 'personal' && memberCount > 1;
  };

  const activatePlan = async () => {
    if (!selectedPlan || !account) return;

    setActivating(true);
    try {
      const plan = plans.find(p => p.slug === selectedPlan);
      if (!plan) throw new Error('Plan not found');

      const billingPeriod = isYearly ? 'yearly' : 'monthly';
      const basePrice = getPrice(plan);
      const finalPrice = getFinalPrice(plan);

      // Update account with plan info
      const { error: accountError } = await supabase
        .from('accounts')
        .update({
          subscription_status: 'active',
          plan_slug: selectedPlan,
          billing_period: billingPeriod,
        })
        .eq('id', account.id);

      if (accountError) throw accountError;

      // Create/update subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          tenant_id: account.id,
          status: 'active',
          plan_id: plan.id,
          plan_slug: selectedPlan,
          billing_period: billingPeriod,
          amount_paid: finalPrice,
          coupon_id: couponResult?.is_valid ? couponResult.coupon_id : null,
          subscription_starts_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: isYearly
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_provider: 'manual',
        }, {
          onConflict: 'tenant_id',
        });

      if (subError) throw subError;

      // Redeem coupon if used
      if (couponResult?.is_valid && couponResult.coupon_id) {
        const discount = calculateDiscount(basePrice);

        await supabase.from('coupon_redemptions').insert({
          coupon_id: couponResult.coupon_id,
          account_id: account.id,
          redeemed_by: (await supabase.auth.getUser()).data.user?.id,
          plan_slug: selectedPlan,
          billing_period: billingPeriod,
          discount_applied: discount,
        });

        // Increment coupon usage
        await supabase.rpc('increment_coupon_usage' as any, {
          p_coupon_id: couponResult.coupon_id,
        }).catch(() => {
          // Fallback: update directly
          supabase
            .from('coupons')
            .update({ current_redemptions: (couponResult as any).current_redemptions + 1 })
            .eq('id', couponResult.coupon_id!);
        });
      }

      toast({
        title: 'תוכנית הופעלה בהצלחה!',
        description: `תוכנית ${plan.name} - ${billingPeriod === 'yearly' ? 'שנתי' : 'חודשי'}`,
      });

      // Refresh the auth context to pick up new subscription status
      await refreshProfile();

      navigate('/dashboard');
    } catch (error) {
      console.error('Error activating plan:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהפעלת התוכנית. נסה שוב.',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'personal':
        return <User className="h-6 w-6" />;
      case 'family':
        return <Users className="h-6 w-6" />;
      default:
        return <Crown className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">טוען תוכניות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          {isUpgrade ? 'שדרג את התוכנית שלך' : 'בחר את התוכנית שלך'}
        </h1>
        <p className="text-muted-foreground">
          {isUpgrade
            ? `אתה כרגע בתוכנית ${currentPlanSlug === 'personal' ? 'אישית' : 'משפחתית'}. בחר תוכנית חדשה.`
            : account?.subscription_status === 'expired'
              ? 'תקופת הניסיון שלך הסתיימה. בחר תוכנית כדי להמשיך.'
              : 'בחר את התוכנית המתאימה לצרכים שלך.'}
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          חודשי
        </span>
        <Switch checked={isYearly} onCheckedChange={(val) => {
          setIsYearly(val);
          setCouponResult(null); // Reset coupon when changing billing
        }} />
        <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          שנתי
        </span>
        {isYearly && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
            חיסכון עד {Math.max(...plans.map(getSavingsPercent))}%
          </Badge>
        )}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan) => {
          const blocked = isPersonalBlocked(plan.slug);
          const isSelected = selectedPlan === plan.slug;
          const isPopular = plan.slug === 'family';

          const isCurrent = isUpgrade && plan.slug === currentPlanSlug;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all cursor-pointer ${
                blocked || isCurrent ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'
              } ${isSelected ? 'border-primary border-2 shadow-md ring-2 ring-primary/20' : 'border'} ${
                isPopular && !isSelected ? 'border-primary/50' : ''
              }`}
              onClick={() => {
                if (!blocked && !isCurrent) {
                  setSelectedPlan(plan.slug);
                  setCouponResult(null);
                }
              }}
            >
              {isCurrent && (
                <div className="absolute top-0 left-0 right-0 bg-muted text-muted-foreground text-center text-xs font-bold py-1.5 z-20">
                  התוכנית הנוכחית שלך
                </div>
              )}
              {isPopular && !isCurrent && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1.5">
                  {isUpgrade && currentPlanSlug === 'personal' ? 'מומלץ לשדרוג' : 'מומלץ'}
                </div>
              )}

              {blocked && !isCurrent && (
                <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
                  <div className="text-center p-4">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">לא זמין</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      יש לך שותף בחשבון. נדרשת תוכנית Family.
                    </p>
                  </div>
                </div>
              )}

              <CardHeader className={`text-center ${isPopular || isCurrent ? 'pt-10' : 'pt-6'} pb-2`}>
                <div className={`mx-auto mb-3 h-14 w-14 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {getPlanIcon(plan.slug)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="text-center pb-6">
                <div className="mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    {couponResult?.is_valid && isSelected ? (
                      <>
                        <span className="text-2xl font-bold line-through text-muted-foreground">
                          ₪{getPrice(plan)}
                        </span>
                        <span className="text-3xl sm:text-4xl font-extrabold text-green-600">
                          ₪{getFinalPrice(plan).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl sm:text-4xl font-extrabold">
                        ₪{getPrice(plan)}
                      </span>
                    )}
                    <span className="text-muted-foreground text-sm">
                      /{isYearly ? 'שנה' : 'חודש'}
                    </span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ₪{getMonthlyEquivalent(plan)} לחודש
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-right">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${feature.included ? '' : 'text-muted-foreground/60 line-through'}`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Coupon Section */}
      {selectedPlan && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">יש לך קוד קופון?</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponResult(null);
                }}
                placeholder="הכנס קוד קופון"
                className="flex-1"
                dir="ltr"
              />
              <Button
                onClick={validateCoupon}
                disabled={!couponCode.trim() || couponLoading}
                variant="outline"
              >
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'החל'}
              </Button>
            </div>
            {couponResult?.is_valid && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                {getDiscountDescription(couponResult)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Summary & CTA */}
      {selectedPlan && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold mb-3">סיכום הזמנה</h3>
            {(() => {
              const plan = plans.find(p => p.slug === selectedPlan);
              if (!plan) return null;
              const basePrice = getPrice(plan);
              const finalPrice = getFinalPrice(plan);
              const hasDiscount = couponResult?.is_valid && finalPrice < basePrice;

              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>תוכנית {plan.name}</span>
                    <span>{isYearly ? 'שנתי' : 'חודשי'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>מחיר</span>
                    <span className={hasDiscount ? 'line-through text-muted-foreground' : 'font-semibold'}>
                      ₪{basePrice}
                    </span>
                  </div>
                  {hasDiscount && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>הנחה ({getDiscountDescription(couponResult!)})</span>
                        <span>-₪{(basePrice - finalPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2">
                        <span>סה"כ לתשלום</span>
                        <span>₪{finalPrice.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                    <p className="text-xs text-blue-700">
                      כרגע התשלום מתבצע בתיאום עם צוות התמיכה. לאחר בחירת התוכנית, נציג יצור איתך קשר לביצוע התשלום.
                    </p>
                  </div>
                </div>
              );
            })()}

            <Button
              onClick={activatePlan}
              disabled={activating || !selectedPlan}
              className={`w-full mt-4 ${isUpgrade ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' : ''}`}
              size="lg"
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  {isUpgrade ? 'משדרג תוכנית...' : 'מפעיל תוכנית...'}
                </>
              ) : isUpgrade ? (
                'שדרג תוכנית'
              ) : (
                'בחר תוכנית והמשך'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChoosePlan;
