import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
}) => {
  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 right-0 h-full bg-gradient-to-l from-primary via-primary/80 to-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between items-center px-2">
        {stepTitles.map((title, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 relative",
                  isCompleted && "bg-primary text-primary-foreground scale-110",
                  isCurrent && "bg-primary/20 ring-4 ring-primary/30 animate-pulse",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 animate-in zoom-in duration-300" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs text-center transition-all duration-300 hidden sm:block",
                  (isCurrent || isCompleted) ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
