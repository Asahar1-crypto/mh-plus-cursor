
import React, { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { useAuthState } from './hooks/useAuthState';
import { useAuthActions } from './hooks/useAuthActions';
import { useAuthSubscriptions } from './hooks/useAuthSubscriptions';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
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
