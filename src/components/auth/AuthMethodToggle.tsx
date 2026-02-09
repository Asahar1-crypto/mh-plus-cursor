import React from 'react';
import { Mail, Smartphone } from 'lucide-react';

interface AuthMethodToggleProps {
  method: 'email' | 'phone';
  onChange: (method: 'email' | 'phone') => void;
  disabled?: boolean;
}

const AuthMethodToggle: React.FC<AuthMethodToggleProps> = ({ 
  method, 
  onChange, 
  disabled = false 
}) => {
  return (
    <div className="relative w-full p-1 bg-muted/60 rounded-xl border border-border/50" dir="ltr">
      {/* Sliding background indicator */}
      <div 
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-primary to-primary-glow rounded-lg shadow-md transition-all duration-300 ease-out"
        style={{ 
          left: method === 'email' ? 'calc(50% + 2px)' : '4px',
        }}
      />
      
      <div className="relative grid grid-cols-2 gap-1">
        {/* Phone Option - left side in LTR (right side visually in RTL context) */}
        <button
          type="button"
          onClick={() => !disabled && onChange('phone')}
          disabled={disabled}
          className={`relative z-10 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ${
            method === 'phone' 
              ? 'text-white font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <Smartphone className="w-4 h-4" />
          <span className="text-sm">מספר טלפון</span>
        </button>

        {/* Email Option - right side in LTR (left side visually in RTL context) */}
        <button
          type="button"
          onClick={() => !disabled && onChange('email')}
          disabled={disabled}
          className={`relative z-10 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ${
            method === 'email' 
              ? 'text-white font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <Mail className="w-4 h-4" />
          <span className="text-sm">אימייל וסיסמה</span>
        </button>
      </div>
    </div>
  );
};

export default AuthMethodToggle;