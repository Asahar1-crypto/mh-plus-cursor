export interface OnboardingState {
  currentStep: number;
  completedSteps: Set<number>;
  isOpen: boolean;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export type BillingCycleType = 'monthly' | 'custom';

export interface BillingCycleData {
  type: BillingCycleType;
  startDay: number;
  endDay: number | null;
}
