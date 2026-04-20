import React from 'react';
import { cn } from '@/lib/utils';
// import logoImage from '@/assets/Logo.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const LOGO_SRC = '/logo-icon.png';
const LOGO_FALLBACK = '/logo-icon.svg';

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  showText = true, 
  size = 'md' 
}) => {
  const [imgSrc, setImgSrc] = React.useState(LOGO_SRC);

  const handleError = () => setImgSrc(LOGO_FALLBACK);
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
      <div className={cn(
        "relative flex items-center justify-center p-1.5 rounded-xl bg-card border border-border/50 shadow-sm transition-transform hover:scale-105",
        sizeClasses[size]
      )}>
        <img
          src={imgSrc}
          alt="מחציות פלוס - לוגו"
          className={cn(
            "w-full h-full object-contain",
            imgSrc === LOGO_FALLBACK && "mix-blend-multiply"
          )}
          onError={handleError}
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