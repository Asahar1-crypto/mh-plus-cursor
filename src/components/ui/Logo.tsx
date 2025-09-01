import React from 'react';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/Logo.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  showText = true, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <img 
          src={logoImage} 
          alt="Family Budget Logo" 
          className={cn(
            sizeClasses[size],
            "rounded-lg shadow-sm transition-transform hover:scale-105"
          )}
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className={cn(
            textSizeClasses[size],
            "font-bold text-foreground"
          )}>
            מחציות פלוס
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            ניהול תקציב משפחתי
          </p>
        </div>
      )}
    </div>
  );
};