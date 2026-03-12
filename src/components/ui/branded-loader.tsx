import React from 'react';
import { cn } from '@/lib/utils';

interface BrandedLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
  size = 'md',
  className,
  text
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const logoSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div
          className={cn(
            'rounded-full border-2 border-primary/20 border-t-primary animate-spin',
            sizeClasses[size]
          )}
        />
        {/* Inner branded logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse',
            size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'
          )}>
            <span className={cn('font-bold text-white', logoSizeClasses[size])}>
              מ+
            </span>
          </div>
        </div>
      </div>
      {text && (
        <p className={cn('text-muted-foreground font-medium', textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );
};
