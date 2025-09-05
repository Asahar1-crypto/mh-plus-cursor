import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Central OTP Input Component
 * Handles 6-digit OTP input with auto-focus and paste support
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className,
  placeholder = ''
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update digits when value changes externally
  useEffect(() => {
    const newDigits = value.padEnd(length, '').slice(0, length).split('');
    setDigits(newDigits);
  }, [value, length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    // Only allow digits
    const cleanDigit = digit.replace(/\D/g, '');
    
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    setDigits(newDigits);
    
    // Call external onChange
    onChange(newDigits.join(''));

    // Auto-advance to next input
    if (cleanDigit && index < length - 1) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = inputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData) {
      const newDigits = [...digits];
      const pasteLength = Math.min(pastedData.length, length - index);
      
      for (let i = 0; i < pasteLength; i++) {
        newDigits[index + i] = pastedData[i];
      }
      
      setDigits(newDigits);
      onChange(newDigits.join(''));
      
      // Focus the last filled input or the next empty one
      const nextFocusIndex = Math.min(index + pasteLength, length - 1);
      const nextInput = inputRefs.current[nextFocusIndex];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focusing
    const input = inputRefs.current[index];
    if (input) {
      input.select();
    }
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)} dir="ltr">
      {Array.from({ length }, (_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-12 h-12 text-center text-lg font-semibold",
            "border-2 rounded-lg",
            "focus:border-primary focus:ring-primary",
            digits[index] ? "border-primary bg-primary/5" : "border-border",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
};