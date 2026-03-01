import React from 'react';
import { ThemeProvider } from 'next-themes';
import { useAuth } from '@/contexts/auth';

/**
 * Wraps next-themes ThemeProvider and forces light mode when user is not authenticated.
 * Dark mode is only available after logging in.
 */
export const AuthAwareThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={!isAuthenticated ? 'light' : undefined}
    >
      {children}
    </ThemeProvider>
  );
};
