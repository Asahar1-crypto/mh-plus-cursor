import React, { useState, forwardRef, useEffect } from 'react';
import { Phone, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizePhoneNumber, formatPhoneForDisplay } from '@/utils/phoneUtils';
import { CountryCode } from 'libphonenumber-js';
import { CountrySelector } from './country-selector';

interface InternationalPhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (value: string) => void;
  onCountryChange?: (country: CountryCode) => void;
  defaultCountry?: CountryCode;
  validation?: 'none' | 'valid' | 'invalid';
  validationMessage?: string;
}

const InternationalPhoneInput = forwardRef<HTMLInputElement, InternationalPhoneInputProps>(
  ({ 
    className, 
    label, 
    onChange,
    onCountryChange,
    defaultCountry = 'IL',
    validation = 'none',
    validationMessage,
    value = '',
    ...props 
  }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [formattedValue, setFormattedValue] = useState(value as string);
  const [internalValidation, setInternalValidation] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validationMsg, setValidationMsg] = useState('');

  useEffect(() => {
    setFormattedValue(value as string);
  }, [value]);

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    onCountryChange?.(country);
    
    // Re-validate current input with new country
    if (formattedValue) {
      handleInputChange({ target: { value: formattedValue } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    if (!input.trim()) {
      setFormattedValue('');
      setInternalValidation('none');
      setValidationMsg('');
      onChange('');
      return;
    }

    // Validate and normalize using the selected country
    const result = normalizePhoneNumber(input, selectedCountry);
    
    if (result.success && result.data) {
      // Format for display using local format for the selected country
      const displayFormatted = formatPhoneForDisplay(result.data.e164, 'local', selectedCountry);
      setFormattedValue(displayFormatted);
      setInternalValidation('valid');
      setValidationMsg('מספר טלפון תקין');
      
      // Send normalized E.164 format to parent
      onChange(result.data.e164);
    } else {
      // Keep user input for continued typing
      setFormattedValue(input);
      setInternalValidation('invalid');
      setValidationMsg(result.error || 'מספר טלפון לא תקין');
      
      // Send raw input to parent
      onChange(input);
    }
  };

  const getValidationIcon = () => {
    const currentValidation = validation !== 'none' ? validation : internalValidation;
    switch (currentValidation) {
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
              : "top-1/2 right-16 -translate-y-1/2 text-sm text-muted-foreground"
          )}
        >
          {label}
        </label>

        {/* Input Container */}
        <div className="flex gap-2">
          {/* Country Selector */}
          <CountrySelector
            value={selectedCountry}
            onChange={handleCountryChange}
            disabled={props.disabled}
          />

          {/* Phone Input */}
          <div className={cn(
            "relative flex items-center flex-1 transition-all duration-300",
            "glass rounded-xl hover:shadow-glow group-hover:scale-[1.02]",
            isFocused && "ring-2 ring-primary/50 ring-offset-2",
            (validation === 'valid' || internalValidation === 'valid') && "ring-2 ring-green-500/50",
            (validation === 'invalid' || internalValidation === 'invalid') && "ring-2 ring-red-500/50"
          )}>
            {/* Phone Icon */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground z-20">
              <Phone className="w-5 h-5" />
            </div>

            {/* Input Field */}
            <input
              type="tel"
              className={cn(
                "w-full bg-transparent border-none outline-none transition-all duration-300",
                "h-14 text-sm placeholder-transparent",
                "pl-12 pr-4",
                className
              )}
              ref={ref}
              value={formattedValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />

            {/* Validation Icon */}
            {(validation !== 'none' || internalValidation !== 'none') && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            )}
          </div>
        </div>

        {/* Animated Border Effect */}
        <div className={cn(
          "absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none",
          "bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20",
          isFocused ? "opacity-100 animate-pulse" : "opacity-0"
        )} />
      </div>

      {/* Validation Message */}
      {(validationMessage || validationMsg) && (
        <div className={cn(
          "text-xs px-2 transition-all duration-300",
          (validation === 'valid' || internalValidation === 'valid') && "text-green-600",
          (validation === 'invalid' || internalValidation === 'invalid') && "text-red-600"
        )}>
          {validationMessage || validationMsg}
        </div>
      )}
    </div>
  );
}
);

InternationalPhoneInput.displayName = 'InternationalPhoneInput';

export { InternationalPhoneInput };
