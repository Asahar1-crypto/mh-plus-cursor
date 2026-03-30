import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { ChildrenStep } from './steps/ChildrenStep';
import { BillingCycleStep } from './steps/BillingCycleStep';
import { RecurringExpensesStep } from './steps/RecurringExpensesStep';
import { VirtualPartnerStep } from './steps/VirtualPartnerStep';
import { InviteUserStep } from './steps/InviteUserStep';
import { SuccessStep } from './steps/SuccessStep';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEP_TITLES = [
  'ברוכים הבאים',
  'ילדים',
  'מחזור חיוב',
  'הוצאות קבועות',
  'ניהול משותף',
  'הזמנת משתמש',
  'סיום',
];

// Step indices for tracking completion
const STEP_CHILDREN = 1;
const STEP_BILLING = 2;
const STEP_RECURRING = 3;
const STEP_INVITE = 5;

const SESSION_DISMISSED_KEY = 'onboarding_dismissed';

export const OnboardingModal: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  // When the user picks "manage alone" in VirtualPartnerStep, skip InviteUserStep
  const [skipInviteStep, setSkipInviteStep] = useState(false);
  // Track which steps were completed (user clicked "next") vs skipped
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  // ?test-onboarding=1 – הצגת אונבורדינג לבדיקה (גם אם הושלם)
  const forceTestOnboarding = searchParams.get('test-onboarding') === '1';

  useEffect(() => {
    // Wait for profile to be fully loaded before checking
    if (profile !== null && profile !== undefined) {
      setIsReady(true);

      // Check if onboarding is needed (or forced for testing)
      if (!profile.onboarding_completed || forceTestOnboarding) {
        // If user dismissed during this session, don't re-show
        if (sessionStorage.getItem(SESSION_DISMISSED_KEY) && !forceTestOnboarding) {
          return;
        }
        // Small delay to ensure everything is mounted
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, forceTestOnboarding]);

  const handleNext = () => {
    if (currentStep < STEP_TITLES.length - 1) {
      // Mark current step as completed (not skipped)
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep((prev) => prev + 1);
    } else {
      // Complete onboarding (user clicked "סיום" on SuccessStep)
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // When going back from SuccessStep and invite was skipped,
      // go back to VirtualPartnerStep (skip InviteUserStep)
      if (skipInviteStep && currentStep === 6) {
        setCurrentStep(4); // VirtualPartnerStep
        return;
      }
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    // Mark current step as skipped
    setSkippedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Called when user picks "manage alone" in VirtualPartnerStep
  const handleChooseSolo = () => {
    setSkipInviteStep(true);
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    // Mark InviteUserStep as skipped since we're jumping over it
    setSkippedSteps((prev) => new Set(prev).add(STEP_INVITE));
    // Jump from VirtualPartnerStep (4) directly to SuccessStep (6), skipping InviteUserStep (5)
    setCurrentStep(6);
  };

  const handleClose = () => {
    // Just dismiss the modal for this session — don't update DB
    sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
    setIsOpen(false);
  };

  const completeOnboarding = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile to update the state
      await refreshProfile();

      setIsOpen(false);
      toast.success('ההגדרות הראשוניות הושלמו בהצלחה!');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('שגיאה בסיום ההגדרות הראשוניות');
    }
  };

  const renderStep = () => {
    const stepProps = {
      onNext: handleNext,
      onBack: handleBack,
      onSkip: handleSkip,
      isFirst: currentStep === 0,
      isLast: currentStep === STEP_TITLES.length - 1,
    };

    switch (currentStep) {
      case 0:
        return <WelcomeStep {...stepProps} />;
      case 1:
        return <ChildrenStep {...stepProps} />;
      case 2:
        return <BillingCycleStep {...stepProps} />;
      case 3:
        return <RecurringExpensesStep {...stepProps} />;
      case 4:
        return (
          <VirtualPartnerStep
            {...stepProps}
            onChooseSolo={handleChooseSolo}
          />
        );
      case 5:
        return <InviteUserStep {...stepProps} />;
      case 6:
        return (
          <SuccessStep
            {...stepProps}
            completedSteps={completedSteps}
            skippedSteps={skippedSteps}
          />
        );
      default:
        return null;
    }
  };

  // Don't render until profile is ready
  if (!isReady || !profile) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent
        className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0"
      >
        {/* Close Button */}
        {(
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-3 sm:left-4 top-3 sm:top-4 z-50 rounded-full hover:bg-muted"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          {/* Progress Bar - Hide on welcome and success steps */}
          {currentStep > 0 && currentStep < STEP_TITLES.length - 1 && (
            <OnboardingProgress
              currentStep={currentStep}
              totalSteps={STEP_TITLES.length}
              stepTitles={STEP_TITLES}
            />
          )}

          {/* Step Content */}
          <div className="min-h-[300px] sm:min-h-[400px]">{renderStep()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
