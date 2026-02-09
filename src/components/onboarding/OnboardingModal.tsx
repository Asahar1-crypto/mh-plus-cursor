import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnboardingProgress } from './OnboardingProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { ChildrenStep } from './steps/ChildrenStep';
import { BillingCycleStep } from './steps/BillingCycleStep';
import { RecurringExpensesStep } from './steps/RecurringExpensesStep';
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
  'הזמנת משתמש',
  'סיום',
];

export const OnboardingModal: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for profile to be fully loaded before checking
    if (profile !== null && profile !== undefined) {
      setIsReady(true);
      
      // Check if onboarding is needed
      if (!profile.onboarding_completed) {
        // Small delay to ensure everything is mounted
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [profile]);

  const handleNext = () => {
    if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Complete onboarding
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleClose = async () => {
    // Mark onboarding as completed even if closed
    await completeOnboarding();
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
        return <InviteUserStep {...stepProps} />;
      case 5:
        return <SuccessStep {...stepProps} />;
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
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent
        className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0"
      >
        {/* Close Button */}
        {currentStep > 0 && (
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
