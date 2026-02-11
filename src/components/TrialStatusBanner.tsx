import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';

const TrialStatusBanner = () => {
  const { account } = useAuth();
  const navigate = useNavigate();

  if (!account) return null;

  // Show expired banner
  if (account.subscription_status === 'expired') {
    return (
      <Alert className="mb-3 sm:mb-4 border-l-4 border-l-destructive bg-destructive/10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm font-medium text-destructive">
              תקופת הניסיון שלך הסתיימה. בחר תוכנית כדי להמשיך להשתמש.
            </AlertDescription>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => navigate('/choose-plan')}
            className="text-xs h-7 sm:h-8"
          >
            בחר תוכנית
          </Button>
        </div>
      </Alert>
    );
  }

  // Only show trial banner for trial accounts
  if (account.subscription_status !== 'trial' || !account.trial_ends_at) {
    return null;
  }

  // Calculate days remaining
  const trialEndDate = new Date(account.trial_ends_at);
  const currentDate = new Date();
  const daysRemaining = Math.ceil((trialEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

  // Don't show if trial has already expired (will be caught by expired check above after cron runs)
  if (daysRemaining <= 0) {
    return (
      <Alert className="mb-3 sm:mb-4 border-l-4 border-l-destructive bg-destructive/10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm font-medium text-destructive">
              תקופת הניסיון שלך הסתיימה. בחר תוכנית כדי להמשיך להשתמש.
            </AlertDescription>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => navigate('/choose-plan')}
            className="text-xs h-7 sm:h-8"
          >
            בחר תוכנית
          </Button>
        </div>
      </Alert>
    );
  }

  const isLastDays = daysRemaining <= 5;

  return (
    <Alert className={`mb-3 sm:mb-4 border-l-4 ${isLastDays ? 'border-l-destructive bg-destructive/10' : 'border-l-warning bg-warning/10'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isLastDays ? (
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
          ) : (
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning flex-shrink-0" />
          )}
          <AlertDescription className={`text-xs sm:text-sm font-medium ${isLastDays ? 'text-destructive' : 'text-warning'}`}>
            {daysRemaining === 1 ? (
              <span>תקופת הניסיון שלך מסתיימת מחר!</span>
            ) : daysRemaining <= 5 ? (
              <span>תקופת הניסיון שלך מסתיימת בעוד {daysRemaining} ימים בלבד!</span>
            ) : (
              <span>אתה בתקופת ניסיון - נותרו {daysRemaining} ימים</span>
            )}
          </AlertDescription>
        </div>
        {isLastDays && (
          <Button
            size="sm"
            variant={daysRemaining <= 3 ? "destructive" : "outline"}
            onClick={() => navigate('/choose-plan')}
            className="text-xs h-7 sm:h-8"
          >
            בחר תוכנית
          </Button>
        )}
      </div>
    </Alert>
  );
};

export default TrialStatusBanner;
