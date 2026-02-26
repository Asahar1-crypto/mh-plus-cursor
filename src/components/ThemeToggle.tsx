import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const cycle = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'מצב כהה' : theme === 'light' ? 'מצב בהיר' : 'אוטומטי (מערכת)';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      className={className}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="mr-2 text-xs">{label}</span>}
    </Button>
  );
};
