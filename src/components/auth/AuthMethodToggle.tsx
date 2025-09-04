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
    <div className="relative w-full">
      {/* Modern card-style toggle */}
      <div className="bg-glass border border-white/10 rounded-2xl p-2 backdrop-blur-xl shadow-elegant">
        <div className="grid grid-cols-2 gap-1 relative">
          
          {/* Phone Option */}
          <button
            type="button"
            onClick={() => !disabled && onChange('phone')}
            disabled={disabled}
            className={`relative flex items-center justify-center gap-2 py-4 px-4 rounded-xl transition-all duration-300 ease-out group ${
              method === 'phone' 
                ? 'bg-gradient-primary text-white shadow-glow scale-[1.02] border border-white/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-[1.01]'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <div className={`flex items-center gap-3 ${method === 'phone' ? 'animate-fade-in' : ''}`}>
              <div className={`p-1.5 rounded-lg ${method === 'phone' ? 'bg-white/20' : 'bg-primary/10'} transition-all duration-300`}>
                <Smartphone className={`w-4 h-4 ${method === 'phone' ? 'text-white' : 'text-primary'}`} />
              </div>
              <span className="text-sm font-semibold">מספר טלפון</span>
            </div>
            
            {method === 'phone' && (
              <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-xl blur-md -z-10" />
            )}
          </button>
          
          {/* Email Option */}
          <button
            type="button"
            onClick={() => !disabled && onChange('email')}
            disabled={disabled}
            className={`relative flex items-center justify-center gap-2 py-4 px-4 rounded-xl transition-all duration-300 ease-out group ${
              method === 'email' 
                ? 'bg-gradient-primary text-white shadow-glow scale-[1.02] border border-white/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-[1.01]'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <div className={`flex items-center gap-3 ${method === 'email' ? 'animate-fade-in' : ''}`}>
              <div className={`p-1.5 rounded-lg ${method === 'email' ? 'bg-white/20' : 'bg-primary/10'} transition-all duration-300`}>
                <Mail className={`w-4 h-4 ${method === 'email' ? 'text-white' : 'text-primary'}`} />
              </div>
              <span className="text-sm font-semibold">אימייל וסיסמה</span>
            </div>
            
            {method === 'email' && (
              <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-xl blur-md -z-10" />
            )}
          </button>
        </div>
      </div>
      
      {/* Ambient glow effect */}
      <div className="absolute -inset-1 bg-gradient-primary opacity-10 rounded-3xl blur-xl -z-10" />
    </div>
  );
};

export default AuthMethodToggle;