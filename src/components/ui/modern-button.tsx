import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  ripple?: boolean;
}

const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    ripple = true,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = cn(
      "relative overflow-hidden font-medium transition-all duration-300",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "group transform hover:scale-[1.02] active:scale-[0.98]",
      
      // Size variations
      size === 'sm' && "px-4 py-2 text-sm rounded-lg",
      size === 'md' && "px-6 py-3 text-base rounded-xl",
      size === 'lg' && "px-8 py-4 text-lg rounded-2xl",
      
      // Variant styles
      variant === 'primary' && [
        "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground",
        "hover:shadow-glow focus:ring-primary/50",
        "border border-transparent"
      ],
      variant === 'secondary' && [
        "bg-secondary text-secondary-foreground",
        "hover:bg-secondary/80 focus:ring-secondary/50",
        "border border-transparent"
      ],
      variant === 'ghost' && [
        "bg-transparent text-foreground border border-border",
        "hover:bg-accent hover:text-accent-foreground focus:ring-accent/50"
      ],
      variant === 'gradient' && [
        "bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500",
        "text-white hover:shadow-xl focus:ring-purple-500/50",
        "background-size: 200% 200% animate-gradient-x"
      ]
    );

    return (
      <button
        className={cn(baseClasses, className)}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Background Animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
        
        {/* Content */}
        <div className="relative flex items-center justify-center gap-2">
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {children}
        </div>

        {/* Ripple Effect */}
        {ripple && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 scale-0 group-active:scale-100 bg-white/20 rounded-full transition-transform duration-300 origin-center" />
          </div>
        )}
      </button>
    );
  }
);

ModernButton.displayName = 'ModernButton';

export { ModernButton };