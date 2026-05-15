import React from 'react';
import { cn } from '@/lib/utils';

interface CustodyLegendProps {
  meLabel?: string;
  otherLabel?: string;
  showShared?: boolean;
  showNeither?: boolean;
  className?: string;
}

/**
 * Small horizontal legend showing the 4 possible day states.
 * Color tokens match DayCell / WeekGridInput / MonthGrid throughout the feature.
 */
export const CustodyLegend: React.FC<CustodyLegendProps> = ({
  meLabel = 'אני',
  otherLabel = 'ההורה השני',
  showShared = true,
  showNeither = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 text-xs text-muted-foreground',
        className,
      )}
      role="list"
    >
      <LegendSwatch
        label={meLabel}
        className="bg-primary/15 border-primary"
      />
      <LegendSwatch
        label={otherLabel}
        className="bg-accent/15 border-accent"
      />
      {showShared && (
        <LegendSwatch
          label="משותף"
          className="bg-gradient-to-br from-primary/10 to-accent/10 border-muted-foreground/30"
        />
      )}
      {showNeither && (
        <LegendSwatch
          label="לא סומן"
          className="bg-muted/20 border-dashed border-muted-foreground/40"
        />
      )}
    </div>
  );
};

const LegendSwatch: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <div className="flex items-center gap-1.5" role="listitem">
    <span
      aria-hidden
      className={cn('inline-block w-3.5 h-3.5 rounded-sm border', className)}
    />
    <span>{label}</span>
  </div>
);
