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
    <div className="grid grid-cols-2 gap-3 w-full">
      {/* Email Option */}
      <button
        type="button"
        onClick={() => !disabled && onChange('email')}
        disabled={disabled}
        className={`relative group flex flex-col items-center justify-center py-4 px-6 rounded-2xl border-2 transition-all duration-300 ease-out ${
          method === 'email' 
            ? 'border-primary bg-gradient-to-br from-primary/5 to-primary-glow/5 shadow-lg shadow-primary/20' 
            : 'border-border bg-card hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary-glow/5'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover-scale'}`}
      >
        <div className={`p-3 rounded-full mb-3 transition-all duration-300 ${
          method === 'email' 
            ? 'bg-gradient-to-br from-primary to-primary-glow text-white shadow-lg shadow-primary/30' 
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        }`}>
          <Mail className={`w-5 h-5 ${method === 'email' ? 'animate-pulse' : ''}`} />
        </div>
        <span className={`text-sm font-semibold transition-colors duration-300 ${
          method === 'email' ? 'text-primary' : 'text-foreground group-hover:text-primary'
        }`}>
          אימייל וסיסמה
        </span>
        <span className={`text-xs mt-1 transition-colors duration-300 ${
          method === 'email' ? 'text-primary/70' : 'text-muted-foreground'
        }`}>
          התחברות מסורתית
        </span>
        
        {/* Selected indicator */}
        {method === 'email' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-primary to-primary-glow rounded-full shadow-lg animate-scale-in" />
        )}
      </button>
      
      {/* Phone Option */}
      <button
        type="button"
        onClick={() => !disabled && onChange('phone')}
        disabled={disabled}
        className={`relative group flex flex-col items-center justify-center py-4 px-6 rounded-2xl border-2 transition-all duration-300 ease-out ${
          method === 'phone' 
            ? 'border-primary bg-gradient-to-br from-primary/5 to-primary-glow/5 shadow-lg shadow-primary/20' 
            : 'border-border bg-card hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary-glow/5'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover-scale'}`}
      >
        <div className={`p-3 rounded-full mb-3 transition-all duration-300 ${
          method === 'phone' 
            ? 'bg-gradient-to-br from-primary to-primary-glow text-white shadow-lg shadow-primary/30' 
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        }`}>
          <Smartphone className={`w-5 h-5 ${method === 'phone' ? 'animate-pulse' : ''}`} />
        </div>
        <span className={`text-sm font-semibold transition-colors duration-300 ${
          method === 'phone' ? 'text-primary' : 'text-foreground group-hover:text-primary'
        }`}>
          מספר טלפון
        </span>
        <span className={`text-xs mt-1 transition-colors duration-300 ${
          method === 'phone' ? 'text-primary/70' : 'text-muted-foreground'
        }`}>
          התחברות מהירה
        </span>
        
        {/* Selected indicator */}
        {method === 'phone' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-primary to-primary-glow rounded-full shadow-lg animate-scale-in" />
        )}
      </button>
    </div>
  );
};

export default AuthMethodToggle;