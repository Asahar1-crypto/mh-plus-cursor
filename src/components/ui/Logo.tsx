import React from 'react';
import { cn } from '@/lib/utils';
// import logoImage from '@/assets/Logo.png';

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
    sm: 'h-16',
    md: 'h-20',
    lg: 'h-24',
    xl: 'h-32'
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
          src="/lovable-uploads/dc4b6d32-5c74-44a1-8d9c-b07947f361d7.png" 
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