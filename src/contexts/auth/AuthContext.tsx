
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, Account, AuthContextType } from './types';
import { authService } from './authService';
import { supabase } from "@/integrations/supabase/client";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up auth state listener and check for saved session
  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or token refreshed, update session
          checkAndSetUserData();
        } else if (event === 'SIGNED_OUT') {
          // User signed out, clear session
          setUser(null);
          setAccount(null);
        }
      }
    );

    // Check for an existing session
    checkAndSetUserData();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAndSetUserData = async () => {
    setIsLoading(true);
    try {
      const { user, account } = await authService.checkAuth();
      setUser(user);
      setAccount(account);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user, account } = await authService.login(email, password);
      setUser(user);
      setAccount(account);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.register(name, email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvitation = async (email: string) => {
    if (!user || !account) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const updatedAccount = await authService.sendInvitation(email, user, account);
      setAccount(updatedAccount);
      return Promise.resolve();
    } finally {
      setIsLoading(false);
    }
  };

  const removeInvitation = async () => {
    if (!user || !account) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const updatedAccount = await authService.removeInvitation(account);
      setAccount(updatedAccount);
      return Promise.resolve();
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const updatedAccount = await authService.acceptInvitation(invitationId, user);
      setAccount(updatedAccount);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setIsLoading(true);
    try {
      return await authService.verifyEmail(token);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(email);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      account,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      sendInvitation,
      removeInvitation,
      acceptInvitation,
      verifyEmail,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
