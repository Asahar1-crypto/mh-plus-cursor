import React, { useState, forwardRef } from 'react';
import { Phone, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartPhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (value: string) => void;
  validation?: 'none' | 'valid' | 'invalid';
  validationMessage?: string;
}

const SmartPhoneInput = forwardRef<HTMLInputElement, SmartPhoneInputProps>(
  ({ 
    className, 
    label, 
    onChange,
    validation = 'none',
    validationMessage,
    value = '',
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [formattedValue, setFormattedValue] = useState(value as string);

    const formatPhoneNumber = (input: string): string => {
      // Remove all non-digits
      const digitsOnly = input.replace(/\D/g, '');
      
      // Format as XXX-XXX-XXXX
      if (digitsOnly.length <= 3) {
        return digitsOnly;
      } else if (digitsOnly.length <= 6) {
        return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
      } else {
        return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneNumber(input);
      setFormattedValue(formatted);
      onChange(formatted);
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
              "absolute transition-all duration-300 pointer-events-none z-10",
              isFocused || formattedValue 
                ? "top-1 right-4 text-xs text-primary font-medium" 
                : "top-1/2 right-12 -translate-y-1/2 text-sm text-muted-foreground"
            )}
          >
            {label}
          </label>

          {/* Input Container */}
          <div className={cn(
            "relative flex items-center transition-all duration-300",
            "glass rounded-xl hover:shadow-glow group-hover:scale-[1.02]",
            isFocused && "ring-2 ring-primary/50 ring-offset-2",
            validation === 'valid' && "ring-2 ring-green-500/50",
            validation === 'invalid' && "ring-2 ring-red-500/50"
          )}>
            {/* Country Prefix */}
            <div className="flex items-center pr-3 border-l border-border/30 h-14">
              <span className="text-2xl ml-3">🇮🇱</span>
              <span className="text-sm text-muted-foreground ml-1">+972</span>
            </div>

            {/* Phone Icon */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground z-20">
              <Phone className="w-5 h-5" />
            </div>

            {/* Input Field */}
            <input
              type="tel"
              className={cn(
                "w-full bg-transparent border-none outline-none transition-all duration-300",
                "h-14 text-sm placeholder-transparent",
                "pr-12 pl-4",
                className
              )}
              ref={ref}
              value={formattedValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              maxLength={12} // XXX-XXX-XXXX format
              {...props}
            />

            {/* Validation Icon */}
            {validation !== 'none' && (
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
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

SmartPhoneInput.displayName = 'SmartPhoneInput';

export { SmartPhoneInput };