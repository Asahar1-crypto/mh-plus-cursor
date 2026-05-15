import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_LOGO_PATH } from '@/lib/brand';

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

  const innerIconClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
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
          <img
            src={BRAND_LOGO_PATH}
            alt="מחציות פלוס"
            className={cn('object-contain animate-pulse', innerIconClasses[size])}
          />
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
