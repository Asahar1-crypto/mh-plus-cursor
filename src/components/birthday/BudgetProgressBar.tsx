import React from 'react';
import { cn } from '@/lib/utils';

interface BudgetProgressBarProps {
  committed: number;
  total: number;
  showWarning?: boolean;
  className?: string;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  committed,
  total,
  showWarning = true,
  className,
}) => {
  const pct = total > 0 ? Math.min((committed / total) * 100, 100) : 0;

  const barColor =
    pct >= 90
      ? 'bg-red-500'
      : pct >= 75
      ? 'bg-orange-400'
      : pct >= 50
      ? 'bg-yellow-400'
      : 'bg-green-500';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>₪{committed.toLocaleString()}</span>
        <span>₪{total.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className={cn(pct >= 90 && showWarning ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
          {pct.toFixed(0)}% נוצל
        </span>
        {showWarning && pct >= 90 && (
          <span className="text-red-500 text-xs font-medium">⚠ קרוב לתקציב</span>
        )}
      </div>
    </div>
  );
};
