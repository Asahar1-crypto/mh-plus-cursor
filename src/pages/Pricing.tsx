import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, X, ArrowLeft, Crown, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
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

  const getPrice = (plan: PricingPlan) => {
    if (isYearly) {
      return plan.yearly_price;
    }
    return plan.monthly_price;
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

  const isPopular = (slug: string) => slug === 'family';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">טוען תוכניות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-brand-500 flex items-center justify-center">
              <span className="font-bold text-white text-sm">מ+</span>
            </div>
            <span className="text-xl font-bold">מחציות פלוס</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 ml-1" />
              חזרה
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              התחברות
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="py-12 sm:py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
            בחר את התוכנית <span className="text-primary">המתאימה לך</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            30 יום ניסיון חינם לכל התוכניות. ללא התחייבות.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              חודשי
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              שנתי
            </span>
            {isYearly && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                חיסכון עד {Math.max(...plans.map(getSavingsPercent))}%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16 sm:pb-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => {
              const popular = isPopular(plan.slug);
              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    popular ? 'border-primary border-2 shadow-md' : 'border'
                  }`}
                >
                  {popular && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1.5">
                      הכי פופולרי
                    </div>
                  )}

                  <CardHeader className={`text-center ${popular ? 'pt-10' : 'pt-6'} pb-2`}>
                    <div className={`mx-auto mb-3 h-14 w-14 rounded-full flex items-center justify-center ${
                      popular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {getPlanIcon(plan.slug)}
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="text-center pb-6">
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl sm:text-5xl font-extrabold">
                          ₪{getPrice(plan)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /{isYearly ? 'שנה' : 'חודש'}
                        </span>
                      </div>
                      {isYearly && (
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            ₪{getMonthlyEquivalent(plan)} לחודש
                          </p>
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            חיסכון {getSavingsPercent(plan)}%
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-8 text-right">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground/60 line-through'}`}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={() => navigate('/register')}
                      className="w-full"
                      variant={popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      התחל ניסיון חינם - 30 יום
                    </Button>

                    <p className="text-xs text-muted-foreground mt-3">
                      ללא כרטיס אשראי • ביטול בכל עת
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ / Bottom CTA */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">שאלות נפוצות</h2>
          <div className="max-w-2xl mx-auto space-y-4 text-right">
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-1">מה קורה אחרי תקופת הניסיון?</h3>
              <p className="text-sm text-muted-foreground">
                לאחר 30 ימי הניסיון תצטרך לבחור תוכנית. עד אז כל הפיצ'רים פתוחים כולל שיתוף עם בן/בת זוג.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-1">מה ההבדל בין Personal ל-Family?</h3>
              <p className="text-sm text-muted-foreground">
                תוכנית Personal מיועדת לשימוש של הורה יחיד. תוכנית Family מאפשרת שיתוף עם בן/בת הזוג, אישור הוצאות דו-צדדי והתראות משותפות.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-1">האם אפשר לשדרג מ-Personal ל-Family?</h3>
              <p className="text-sm text-muted-foreground">
                כן! אפשר לשדרג בכל עת מהגדרות החשבון. ההפרש יחושב באופן יחסי.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-1">יש לי קוד קופון, איפה מזינים?</h3>
              <p className="text-sm text-muted-foreground">
                קוד קופון ניתן להזין בעמוד בחירת התוכנית לאחר סיום תקופת הניסיון.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-right">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-brand-500 flex items-center justify-center">
                  <span className="font-bold text-white text-xs sm:text-sm">מ+</span>
                </div>
                <span className="text-lg sm:text-xl font-bold">מחציות פלוס</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">© 2025 כל הזכויות שמורות</p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <a href="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">תנאי שימוש</a>
              <a href="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">פרטיות</a>
              <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">צור קשר</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
