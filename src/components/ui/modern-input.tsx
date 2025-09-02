import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, User, Mail, Phone, Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: 'user' | 'email' | 'phone' | 'password';
  validation?: 'none' | 'valid' | 'invalid';
  validationMessage?: string;
  glassMorphism?: boolean;
}

const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({ 
    className, 
    type = 'text', 
    label, 
    icon, 
    validation = 'none',
    validationMessage,
    glassMorphism = true,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;

    const getIcon = () => {
      switch (icon) {
        case 'user': return <User className="w-5 h-5" />;
        case 'email': return <Mail className="w-5 h-5" />;
        case 'phone': return <Phone className="w-5 h-5" />;
        case 'password': return <Lock className="w-5 h-5" />;
        default: return null;
      }
    };

    const getValidationIcon = () => {
      switch (validation) {
        case 'valid': 
          return <Check className="w-5 h-5 text-green-500" />;
        case 'invalid': 
          return <X className="w-5 h-5 text-red-500" />;
        default: 
          return null;
      }
    };

    return (
      <div className="space-y-2">
        <div className="relative group">
          {/* Floating Label */}
          <label 
            className={cn(
              "absolute right-4 transition-all duration-300 pointer-events-none",
              isFocused || props.value 
                ? "top-2 text-xs text-primary font-medium" 
                : "top-4 text-sm text-muted-foreground"
            )}
          >
            {label}
          </label>

          {/* Input Container */}
          <div className={cn(
            "relative flex items-center transition-all duration-300",
            glassMorphism && "glass rounded-xl",
            !glassMorphism && "bg-card border border-border rounded-xl",
            isFocused && "ring-2 ring-primary/50 ring-offset-2",
            validation === 'valid' && "ring-2 ring-green-500/50",
            validation === 'invalid' && "ring-2 ring-red-500/50",
            "hover:shadow-glow group-hover:scale-[1.02]"
          )}>
            {/* Leading Icon */}
            {icon && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                {getIcon()}
              </div>
            )}

            {/* Input Field */}
            <input
              type={actualType}
              className={cn(
                "w-full bg-transparent border-none outline-none transition-all duration-300",
                "pt-6 pb-2 text-sm",
                icon ? "pr-12 pl-4" : "px-4",
                isPasswordType ? "pl-4 pr-20" : "",
                validation !== 'none' && !isPasswordType ? "pr-12" : "",
                className
              )}
              ref={ref}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />

            {/* Validation Icon */}
            {validation !== 'none' && !isPasswordType && (
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            )}

            {/* Password Toggle */}
            {isPasswordType && (
              <button
                type="button"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Animated Border Effect */}
          <div className={cn(
            "absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none",
            "bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20",
            isFocused ? "opacity-100 animate-pulse" : "opacity-0"
          )} />
        </div>

        {/* Validation Message */}
        {validationMessage && (
          <div className={cn(
            "text-xs px-2 transition-all duration-300",
            validation === 'valid' && "text-green-600",
            validation === 'invalid' && "text-red-600"
          )}>
            {validationMessage}
          </div>
        )}
      </div>
    );
  }
);

ModernInput.displayName = 'ModernInput';

export { ModernInput };