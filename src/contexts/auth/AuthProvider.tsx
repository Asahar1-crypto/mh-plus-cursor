
import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { User, Account } from './types';
import { authService } from './authService';
import { supabase } from "@/integrations/supabase/client";
import { invitationCheckService } from './services/user/invitationCheckService';

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
      async (event, session) => {
        // Handle auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or token refreshed, update session
          await checkAndSetUserData();
          
          // Check for pending invitations after sign in
          if (session?.user?.email) {
            setTimeout(async () => {
              await invitationCheckService.checkPendingInvitations(session.user.email || '');
            }, 1000);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out, clear session
          setUser(null);
          setAccount(null);
        }
      }
    );

    // Check for an existing session
    checkAndSetUserData();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Set up periodic invitation checking for logged-in users
    if (user?.email) {
      const checkInvitationsInterval = setInterval(async () => {
        await invitationCheckService.checkPendingInvitations(user.email);
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(checkInvitationsInterval);
    }
  }, [user]);

  const checkAndSetUserData = async () => {
    setIsLoading(true);
    try {
      const { user, account } = await authService.checkAuth();
      setUser(user);
      setAccount(account);
      
      // Check for new invitations when user data is loaded
      if (user?.email) {
        setTimeout(async () => {
          await invitationCheckService.checkPendingInvitations(user.email);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
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
    if (!user || !account) {
      console.error('Cannot send invitation: User not authenticated or no account available');
      throw new Error('User not authenticated');
    }
    
    console.log(`AuthProvider: Starting invitation process for email ${email}`);
    setIsLoading(true);
    
    try {
      const updatedAccount = await authService.sendInvitation(email, user, account);
      console.log('AuthProvider: Invitation process completed successfully, updating account state');
      setAccount(updatedAccount);
      return Promise.resolve();
    } catch (error) {
      console.error('AuthProvider: Failed to send invitation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeInvitation = async () => {
    if (!user || !account) {
      console.error('Cannot remove invitation: User not authenticated or no account available');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    try {
      console.log("AuthProvider: Starting to remove invitation for account:", account);
      const updatedAccount = await authService.removeInvitation(account);
      console.log("AuthProvider: Updated account after removing invitation:", updatedAccount);
      setAccount(updatedAccount);
      return Promise.resolve();
    } catch (error) {
      console.error("AuthProvider: Error removing invitation:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user) {
      console.error('Cannot accept invitation: User not authenticated');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    try {
      const updatedAccount = await authService.acceptInvitation(invitationId, user);
      setAccount(updatedAccount);
    } catch (error) {
      console.error('AuthProvider: Failed to accept invitation:', error);
      throw error;
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

  const authContextValue = {
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
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
