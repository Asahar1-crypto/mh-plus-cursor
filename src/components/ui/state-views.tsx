import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from './button';
import { BrandedLoader } from './branded-loader';

// ─── Loading State ─────────────────────────────────────────────────
interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** true = fills parent height, false = inline */
  fullPage?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  text = 'טוען...',
  size = 'md',
  className,
  fullPage = false,
}) => (
  <div
    className={cn(
      'flex items-center justify-center',
      fullPage ? 'min-h-[60vh]' : 'py-12',
      className,
    )}
  >
    <BrandedLoader size={size} text={text} />
  </div>
);

// ─── Error State ───────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'משהו השתבש',
  message = 'לא הצלחנו לטעון את הנתונים. נסה שוב.',
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className,
    )}
  >
    <div className="p-4 bg-red-100/60 dark:bg-red-900/20 rounded-full mb-4">
      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
    </div>
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-xs mb-4">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 ml-2" />
        נסה שוב
      </Button>
    )}
  </div>
);

// ─── Empty State ───────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className,
    )}
  >
    <div className="p-4 bg-muted/40 rounded-full mb-4">
      {icon || <Inbox className="h-8 w-8 text-muted-foreground/60" />}
    </div>
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
    )}
    {action && (
      <Button variant="outline" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);
