import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

const TrialStatusBanner = () => {
  const { account } = useAuth();

  // Only show for trial accounts
  if (!account || account.subscription_status !== 'trial' || !account.trial_ends_at) {
    return null;
  }

  // Calculate days remaining
  const trialEndDate = new Date(account.trial_ends_at);
  const currentDate = new Date();
  const daysRemaining = Math.ceil((trialEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

  // Don't show if trial has already expired
  if (daysRemaining <= 0) {
    return null;
  }

  const isLastDays = daysRemaining <= 3;

  return (
    <Alert className={`mb-4 border-l-4 ${isLastDays ? 'border-l-destructive bg-destructive/10' : 'border-l-warning bg-warning/10'}`}>
      <div className="flex items-center gap-2">
        {isLastDays ? (
          <Clock className="h-4 w-4 text-destructive" />
        ) : (
          <Calendar className="h-4 w-4 text-warning" />
        )}
        <AlertDescription className={`text-sm font-medium ${isLastDays ? 'text-destructive' : 'text-warning'}`}>
          {daysRemaining === 1 ? (
            <span>תקופת הניסיון שלך מסתיימת מחר! 🚨</span>
          ) : daysRemaining <= 3 ? (
            <span>תקופת הניסיון שלך מסתיימת בעוד {daysRemaining} ימים בלבד! ⏰</span>
          ) : (
            <span>אתה בתקופת ניסיון - נותרו {daysRemaining} ימים 📅</span>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
};

export default TrialStatusBanner;