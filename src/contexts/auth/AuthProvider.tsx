
import React, { ReactNode, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useAuthState } from './hooks/useAuthState';
import { useAuthActions } from './hooks/useAuthActions';
import { useAuthSubscriptions } from './hooks/useAuthSubscriptions';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  const {
    user,
    setUser,
    account,
    setAccount,
    isLoading,
    setIsLoading,
    checkAndSetUserData
  } = useAuthState();

  const {
    login,
    register,
    logout,
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    verifyEmail,
    resetPassword
  } = useAuthActions(
    user,
    account,
    setUser,
    setAccount,
    setIsLoading,
    checkAndSetUserData
  );

  // Set up subscriptions for auth state changes and invitation checking
  useAuthSubscriptions(user, checkAndSetUserData);

  // Perform initial auth check when component mounts
  useEffect(() => {
    const performInitialCheck = async () => {
      console.log('AuthProvider: Performing initial auth check');
      try {
        await checkAndSetUserData();
        console.log('AuthProvider: Initial auth check completed');
      } catch (err) {
        console.error('Error during initial auth check:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    
    performInitialCheck();
  }, []);

  const authContextValue = {
    user,
    account,
    isAuthenticated: !!user,
    isLoading: isLoading || !isInitialized,
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
