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
      {/* Label - static above the field */}
      <label className="text-sm sm:text-base font-medium text-foreground block">
        {label}
      </label>

      <div className="relative group">
        {/* Input Container */}
        <div className="flex gap-2 sm:gap-3">
          {/* Country Selector */}
          <div className="w-28 sm:w-32 shrink-0">
            <CountrySelector
              value={selectedCountry}
              onChange={handleCountryChange}
              disabled={props.disabled}
            />
          </div>

          {/* Phone Input - takes remaining space */}
          <div className={cn(
            "relative flex items-center flex-1 transition-all duration-300",
            "bg-background/95 border-2 border-border shadow-sm rounded-xl",
            "hover:border-primary/50",
            isFocused && "border-primary ring-2 ring-primary/20",
            (validation === 'valid' || internalValidation === 'valid') && "border-green-500 ring-2 ring-green-500/20",
            (validation === 'invalid' || internalValidation === 'invalid') && "border-red-500 ring-2 ring-red-500/20"
          )}>
            {/* Phone Icon */}
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground z-20">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            {/* Input Field */}
            <input
              type="tel"
              dir="ltr"
              className={cn(
                "w-full bg-transparent border-none outline-none transition-all duration-300",
                "h-12 sm:h-14 text-base sm:text-lg font-medium text-foreground",
                "pl-10 sm:pl-12 pr-10 sm:pr-12",
                "placeholder:text-muted-foreground/60",
                className
              )}
              ref={ref}
              value={formattedValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="050-000-0000"
              {...props}
            />

            {/* Validation Icon */}
            {(validation !== 'none' || internalValidation !== 'none') && (
              <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Message */}
      {(validationMessage || validationMsg) && (
        <div className={cn(
          "text-xs sm:text-sm px-2 transition-all duration-300",
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
