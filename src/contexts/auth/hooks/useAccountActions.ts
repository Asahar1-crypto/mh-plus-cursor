
import { toast } from 'sonner';
import { User, Account, UserAccounts } from '../types';
import { authService } from '../authService';

export const useAccountActions = (
  user: User | null,
  account: Account | null,
  setAccount: (account: Account | null) => void,
  setUserAccounts: (userAccounts: UserAccounts | null) => void,
  setIsLoading: (isLoading: boolean) => void
) => {
  const switchAccount = async (accountId: string): Promise<void> => {
    if (!user) {
      toast.error('יש להתחבר כדי לשנות חשבון');
      return;
    }

    if (accountId === account?.id) {
      return;
    }

    const previousAccount = account;
    setIsLoading(true);
    
    try {
      // Immediately clear current account to force UI update
      setAccount(null);
      
      const result = await authService.switchAccount(user.id, accountId);
      
      // Update state with new account and userAccounts
      setAccount(result.account);
      setUserAccounts(result.userAccounts);
      
      toast.success(`עבר לחשבון: ${result.account.name}`);
      
    } catch (error: any) {
      console.error('Failed to switch account:', error);
      toast.error(`שגיאה במעבר בין חשבונות: ${error.message}`);
      
      // Restore previous account if switch failed
      if (previousAccount) {
        setAccount(previousAccount);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccountName = async (newName: string): Promise<void> => {
    if (!user || !account) {
      toast.error('יש להתחבר ולבחור חשבון כדי לעדכן שם');
      return;
    }

    if (account.userRole !== 'admin') {
      toast.error('רק אדמין יכול לעדכן את שם החשבון');
      return;
    }

    try {
      const updatedAccount = await authService.updateAccountName(account.id, newName);
      
      // Update the account in state
      setAccount(updatedAccount);
      
    } catch (error: any) {
      console.error('Failed to update account name:', error);
      throw error; // Re-throw so the component can handle it
    }
  };

  return {
    switchAccount,
    updateAccountName
  };
};
