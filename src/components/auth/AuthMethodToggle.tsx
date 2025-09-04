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
    <div className="relative w-full bg-muted/50 rounded-xl p-1 backdrop-blur-sm">
      <div className="relative flex">
        {/* Background Slider */}
        <div 
          className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-primary to-primary-glow rounded-lg shadow-lg transition-transform duration-300 ease-out ${
            method === 'phone' ? 'translate-x-0' : 'translate-x-full'
          }`}
        />
        
        {/* Phone Option - Left Side */}
        <button
          type="button"
          onClick={() => !disabled && onChange('phone')}
          disabled={disabled}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${
            method === 'phone' 
              ? 'text-white font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <Smartphone className={`w-4 h-4 ${method === 'phone' ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium">מספר טלפון</span>
        </button>
        
        {/* Email Option - Right Side */}
        <button
          type="button"
          onClick={() => !disabled && onChange('email')}
          disabled={disabled}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${
            method === 'email' 
              ? 'text-white font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <Mail className={`w-4 h-4 ${method === 'email' ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium">אימייל וסיסמה</span>
        </button>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-xl opacity-50 blur-xl" />
    </div>
  );
};

export default AuthMethodToggle;