
import { User, Account, UserAccounts } from '../types';
import { useAuthenticationActions } from './useAuthenticationActions';
import { useInvitationActions } from './useInvitationActions';
import { useAccountActions } from './useAccountActions';
import { usePasswordActions } from './usePasswordActions';

export const useAuthActions = (
  user: User | null,
  account: Account | null,
  setUser: (user: User | null) => void,
  setAccount: (account: Account | null) => void,
  setUserAccounts: (userAccounts: UserAccounts | null) => void,
  setIsLoading: (isLoading: boolean) => void,
  checkAndSetUserData: () => Promise<void>
) => {
  const { login, register, logout } = useAuthenticationActions(
    setUser,
    setAccount,
    setUserAccounts,
    setIsLoading,
    checkAndSetUserData
  );

  const { sendInvitation, removeInvitation, acceptInvitation } = useInvitationActions(
    user,
    account,
    checkAndSetUserData
  );

  const { switchAccount } = useAccountActions(
    user,
    account,
    setAccount,
    setUserAccounts,
    setIsLoading
  );

  const { verifyEmail, resetPassword } = usePasswordActions(
    setIsLoading,
    checkAndSetUserData
  );

  return {
    login,
    register,
    logout,
    sendInvitation,
    removeInvitation,
    acceptInvitation,
    verifyEmail,
    resetPassword,
    switchAccount
  };
};
