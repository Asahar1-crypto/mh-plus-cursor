
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
      console.log('Already on this account, no switch needed');
      return;
    }

    const previousAccount = account;
    setIsLoading(true);
    
    try {
      console.log(`Switching from account ${account?.id} (${account?.name}) to account ${accountId} for user ${user.id}`);
      
      // Immediately clear current account to force UI update
      setAccount(null);
      
      const result = await authService.switchAccount(user.id, accountId);
      
      console.log('Account switch result:', result);
      
      // Update state with new account and userAccounts
      setAccount(result.account);
      setUserAccounts(result.userAccounts);
      
      console.log('Account switched successfully to:', result.account.name);
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
      console.log(`Updating account name from "${account.name}" to "${newName}"`);
      
      const updatedAccount = await authService.updateAccountName(account.id, newName);
      
      // Update the account in state
      setAccount(updatedAccount);
      
      console.log('Account name updated successfully');
    } catch (error: any) {
      console.error('Failed to update account name:', error);
      throw error; // Re-throw so the component can handle it
    }
  };

  console.log('useAccountActions: returning functions', { switchAccount: typeof switchAccount, updateAccountName: typeof updateAccountName });
  
  return {
    switchAccount,
    updateAccountName
  };
};
