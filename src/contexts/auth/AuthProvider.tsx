
import React, { ReactNode, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useAuthState } from './hooks/useAuthState';
import { useAuthActions } from './hooks/useAuthActions';
import { useAuthSubscriptions } from './hooks/useAuthSubscriptions';
import { phoneAuthService } from './services/phoneAuthService';
import { supabase } from '@/integrations/supabase/client';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  const {
    user,
    setUser,
    profile,
    setProfile,
    account,
    setAccount,
    userAccounts,
    setUserAccounts,
    isLoading,
    setIsLoading,
    checkAndSetUserData,
    refreshProfile
  } = useAuthState();

  const authActions = useAuthActions(
    user,
    account,
    setUser,
    setAccount,
    setUserAccounts,
    setIsLoading,
    checkAndSetUserData
  );

  const {
    login,
    register,
    logout,
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    verifyEmail,
    resetPassword,
    switchAccount,
    updateAccountName
  } = authActions;

  // Set up subscriptions for auth state changes and invitation checking
  useAuthSubscriptions(user, checkAndSetUserData);

  // Perform initial auth check when component mounts
  useEffect(() => {
    const performInitialCheck = async () => {
      try {
        // Check if we just completed phone login
        const phoneLoginSuccess = sessionStorage.getItem('phoneLoginSuccess');
        
        if (phoneLoginSuccess) {
          sessionStorage.removeItem('phoneLoginSuccess');
          sessionStorage.removeItem('sessionUrl');
          sessionStorage.removeItem('phoneLogin_showOtp');
          sessionStorage.removeItem('phoneLogin_userInfo');
          sessionStorage.removeItem('phoneLogin_phoneNumber');
        }
        
        // First check if there's already a session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        await checkAndSetUserData();
      } catch (err) {
        console.error('Error during initial auth check:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    
    performInitialCheck();
  }, []);

  // Phone authentication functions
  const sendPhoneOtp = async (phoneNumber: string) => {
    setIsLoading(true);
    try {
      const result = await phoneAuthService.sendPhoneLoginOtp(phoneNumber);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhone = async (phoneNumber: string, otp: string) => {
    setIsLoading(true);
    try {
      const result = await phoneAuthService.phoneLogin(phoneNumber, otp);
      // After successful phone login, check and set user data
      await checkAndSetUserData();
      
      // Clear all phone login related sessionStorage after successful login
      sessionStorage.removeItem('phoneLogin_showOtp');
      sessionStorage.removeItem('phoneLogin_userInfo');
      sessionStorage.removeItem('phoneLogin_phoneNumber');
      sessionStorage.removeItem('phoneLoginInProgress');
      sessionStorage.removeItem('login_authMethod');
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const authContextValue = {
    user,
    profile,
    account,
    userAccounts,
    isAuthenticated: !!user,
    isLoading: isLoading || !isInitialized,
    login,
    register,
    logout,
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    verifyEmail,
    resetPassword,
    switchAccount,
    updateAccountName,
    refreshProfile,
    sendPhoneOtp,
    loginWithPhone
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
