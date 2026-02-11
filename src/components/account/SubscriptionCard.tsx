import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Account } from '@/contexts/auth/types';
import { Crown, User, Users, CreditCard, ArrowUpCircle, Calendar, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface PlanPrices {
  monthly_price: number;
  yearly_price: number;
}

interface SubscriptionCardProps {
  account: Account | null;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ account }) => {
  const navigate = useNavigate();
  const [planPrices, setPlanPrices] = useState<Record<string, PlanPrices>>({});

  useEffect(() => {
    const loadPrices = async () => {
      const { data } = await supabase
        .from('pricing_plans')
        .select('slug, monthly_price, yearly_price');
      const map: Record<string, PlanPrices> = {};
      (data || []).forEach((p) => {
        map[p.slug] = { monthly_price: p.monthly_price, yearly_price: p.yearly_price };
      });
      setPlanPrices(map);
    };
    loadPrices();
  }, []);

  if (!account) return null;

  const status = account.subscription_status || 'trial';
  const planSlug = account.plan_slug;
  const billingPeriod = account.billing_period;

  const getStatusLabel = () => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'trial': return 'תקופת ניסיון';
      case 'expired': return 'פג תוקף';
      case 'canceled': return 'בוטל';
      default: return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'trial': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'canceled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return '';
    }
  };

  const getPlanName = () => {
    if (!planSlug) return null;
    return planSlug === 'personal' ? 'אישי' : planSlug === 'family' ? 'משפחתי' : planSlug;
  };

  const getBillingLabel = () => {
    if (!billingPeriod) return null;
    return billingPeriod === 'yearly' ? 'שנתי' : 'חודשי';
  };

  const getPlanPrice = () => {
    if (!planSlug) return null;
    const prices = planPrices[planSlug];
    if (!prices) return null;
    if (billingPeriod === 'yearly') {
      return `₪${prices.yearly_price}/שנה`;
    }
    return `₪${prices.monthly_price}/חודש`;
  };

  const getTrialDaysLeft = () => {
    if (status !== 'trial' || !account.trial_ends_at) return null;
    const now = new Date();
    const end = new Date(account.trial_ends_at);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const trialDaysLeft = getTrialDaysLeft();
  const isPersonal = planSlug === 'personal';
  const isFamily = planSlug === 'family';
  const canUpgrade = isPersonal && status === 'active';
  const needsPlan = status === 'trial' || status === 'expired';

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden relative">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-60" />

      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            מנוי ותוכנית
          </CardTitle>
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusLabel()}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          פרטי המנוי והתוכנית הנוכחית שלך
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Current Plan Info */}
        {planSlug ? (
          <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${isFamily ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {isFamily ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-base">
                  תוכנית {getPlanName()}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <span>{getPlanPrice()}</span>
                  {getBillingLabel() && (
                    <Badge variant="secondary" className="text-xs">
                      {getBillingLabel()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {isFamily && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Crown className="h-3 w-3 ml-1" />
                Premium
              </Badge>
            )}
          </div>
        ) : (
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">לא נבחרה תוכנית</p>
            <p className="text-xs text-muted-foreground mt-1">
              {status === 'trial' ? 'אתה בתקופת ניסיון. בחר תוכנית לפני שתסתיים.' : 'בחר תוכנית כדי להמשיך להשתמש באפליקציה.'}
            </p>
          </div>
        )}

        {/* Trial Info */}
        {status === 'trial' && trialDaysLeft !== null && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            trialDaysLeft <= 5 
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300' 
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300'
          }`}>
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">
                {trialDaysLeft > 0
                  ? `נותרו ${trialDaysLeft} ימים בתקופת הניסיון`
                  : 'תקופת הניסיון הסתיימה'}
              </div>
              <div className="text-xs opacity-80">
                {trialDaysLeft > 5
                  ? 'תהנה מכל התכונות בחינם'
                  : trialDaysLeft > 0
                    ? 'מומלץ לבחור תוכנית בהקדם'
                    : 'בחר תוכנית כדי להמשיך'}
              </div>
            </div>
          </div>
        )}

        {/* Plan Features Quick Info */}
        {planSlug && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>עד {isFamily ? '2' : '1'} משתמשים</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>ילדים ללא הגבלה</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {canUpgrade && (
            <Button
              onClick={() => navigate('/choose-plan')}
              className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              <ArrowUpCircle className="h-4 w-4" />
              שדרג לתוכנית משפחתית
            </Button>
          )}
          {needsPlan && (
            <Button
              onClick={() => navigate('/choose-plan')}
              className="flex-1 gap-2"
            >
              <CreditCard className="h-4 w-4" />
              בחר תוכנית
            </Button>
          )}
          {status === 'active' && !canUpgrade && (
            <Button
              onClick={() => navigate('/choose-plan')}
              variant="outline"
              className="flex-1 gap-2"
            >
              <CreditCard className="h-4 w-4" />
              שנה תוכנית
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;
